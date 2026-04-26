"""
Tamarind Bio AlphaFold integration + RCSB fallback.

API (see https://app.tamarind.bio/api-docs/overview):
  Base: https://app.tamarind.bio/api/
  Auth: header ``x-api-key`` (not Bearer).

Flow: POST /submit-job → poll GET /jobs → POST /result for PDB text.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

from backend.agents._env import env_str
from backend.models.research_program import ResearchProgram, TamarindOutput
from backend.models.sse_contracts import _parse_mutations

logger = logging.getLogger(__name__)

TAMARIND_BASE = "https://app.tamarind.bio/api/"
CACHE_PATH = Path(__file__).resolve().parents[1] / "data" / "tamarind_cache.json"

GYRA_ECOLI = (
    "MSDLAREITPVNIEEELKSSYLDYAMSVIVGRALPDVRDGLKPVHRRVLYAMNVLGNDWN"
    "KAYGKQEEARMEAQNLGAQILAQFLKGKKVEIASHLQKEAEQKLISEEDLNQQREELAQL"
    "KSDLKELREKEQELRKTLEEIESKLKNIKEVQAELRQMKEQLKEQILELKAKMEELEAQK"
)

CLAUDIN1_MOUSE = (
    "MANAGLQLLGFILAFLGWIGAIVSTALPQWRIYSYAGDNIVTAQAMYEGLWMSCVSSTAL"
    "LGFLGCCGSTQSTGQIIYFNLLLNIGKQLILDQNLKSIKELQSRAQPMAEGMKGTFQELL"
    "GDMKQPHEISQIQKALNSMTAQAQMAAQQMYALQMRAEIQASQVQQASYRGLQGMKDMM"
)

CRP_HUMAN = (
    "MERLEALVALFAHHSALLALIILHSVHAQEQKLISEEDLGQFCNLQTLQGQDHFCLGSVQ"
    "KPAKGTGMTCYYDSRPTKGLPAPQTLASPGKVFLFEFLGPRPRGFFNSREELAFPGQYTH"
)

DEMO_SEQUENCES: dict[str, str] = {
    "GyrA": GYRA_ECOLI,
    "GYRA": GYRA_ECOLI,
    "gyra": GYRA_ECOLI,
    "gyrA": GYRA_ECOLI,
    "GyrA_EC": GYRA_ECOLI,
    "Claudin-1": CLAUDIN1_MOUSE,
    "claudin-1": CLAUDIN1_MOUSE,
    "claudin1": CLAUDIN1_MOUSE,
    "CLDN1": CLAUDIN1_MOUSE,
    "CRP": CRP_HUMAN,
    "crp": CRP_HUMAN,
}

RCSB_MAP: dict[str, str] = {
    "gyra": "1KZN",
    "gyrA": "1KZN",
    "claudin-1": "5B2G",
    "claudin1": "5B2G",
    "cldn1": "5B2G",
    "crp": "1B09",
    "gfp": "1EMA",
    "p53": "2OCJ",
    "egfr": "1IVO",
    "her2": "1N8Z",
    "braf": "1UWH",
}


def _api_key() -> str:
    return env_str("TAMARIND_API_KEY", "")


def _headers() -> dict[str, str]:
    key = _api_key()
    return {"x-api-key": key} if key else {}


def _load_cache() -> dict[str, Any]:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(cache: dict[str, Any]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def _cache_key(job_type: str, sequence: str) -> str:
    h = hashlib.md5(f"{job_type}:{sequence[:80]}".encode(), usedforsecurity=False).hexdigest()
    return h


def _inflight_key(cache_key: str) -> str:
    return f"__inflight__:{cache_key}"


def _find_job_record(payload: Any, job_name: str) -> dict[str, Any] | None:
    """Locate a job object inside various /jobs response shapes."""
    if isinstance(payload, dict):
        if payload.get("jobName") == job_name or payload.get("name") == job_name:
            return payload
        for key in ("jobs", "data", "items", "results", "jobList"):
            v = payload.get(key)
            hit = _find_job_record(v, job_name)
            if hit is not None:
                return hit
    elif isinstance(payload, list):
        for j in payload:
            if isinstance(j, dict) and (j.get("jobName") == job_name or j.get("name") == job_name):
                return j
    return None


def _job_status_and_outputs(record: dict[str, Any]) -> tuple[str, list[str]]:
    status = (
        record.get("status")
        or record.get("state")
        or record.get("jobStatus")
        or record.get("runStatus")
        or ""
    )
    status_s = str(status).lower()

    outputs: list[str] = []
    raw_out = record.get("outputs") or record.get("outputFiles") or record.get("files") or []
    if isinstance(raw_out, list):
        for o in raw_out:
            if isinstance(o, str):
                outputs.append(o)
            elif isinstance(o, dict):
                p = o.get("path") or o.get("file") or o.get("name")
                if p:
                    outputs.append(str(p))
    return status_s, outputs


def _plddt_from_pdb(pdb_text: str, sample: int = 200) -> float | None:
    """Mean B-factor (pLDDT proxy) from ATOM lines, AlphaFold-style."""
    b_vals: list[float] = []
    for line in pdb_text.splitlines():
        if not line.startswith(("ATOM  ", "ATOM\t")):
            continue
        if len(line) < 66:
            continue
        try:
            b_vals.append(float(line[60:66].strip()))
        except ValueError:
            continue
        if len(b_vals) >= sample:
            break
    if not b_vals:
        return None
    mean_b = sum(b_vals) / len(b_vals)
    # pLDDT is often 0–100; B-factors in AF PDBs are pLDDT. Clamp for display.
    return round(min(100.0, max(0.0, mean_b)), 1)


def _residue_count_from_pdb(pdb_text: str) -> int:
    residues: set[str] = set()
    for line in pdb_text.splitlines():
        if line.startswith(("ATOM  ", "ATOM\t")) and len(line) > 26:
            residues.add(line[22:26].strip())
    return len(residues)


def _normalize_protein_key(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip())


def _sequence_for_target(protein_name: str) -> str | None:
    key = protein_name.strip()
    if key in DEMO_SEQUENCES:
        return DEMO_SEQUENCES[key]
    low = key.lower()
    if low in DEMO_SEQUENCES:
        return DEMO_SEQUENCES[low]
    for k, seq in DEMO_SEQUENCES.items():
        if k.lower() == low:
            return seq
    return None


async def submit_alphafold_job(sequence: str, job_name: str) -> bool:
    """POST /submit-job. Returns True if Tamarind accepted the job."""
    key = _api_key()
    if not key:
        return False

    body: dict[str, Any] = {
        "jobName": job_name,
        "type": "alphafold",
        "settings": {
            "sequence": sequence,
            "numModels": "1",
            "numRecycles": 1,
            "numRelax": 0,
            "useMSA": True,
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{TAMARIND_BASE}submit-job",
            headers=_headers(),
            json=body,
        )
    if resp.status_code == 200:
        logger.info("Tamarind job submitted: %s — %s", job_name, resp.text[:200])
        return True
    logger.warning("Tamarind submit failed: %s %s", resp.status_code, resp.text[:500])
    return False


async def poll_job_status(
    job_name: str,
    *,
    max_wait_seconds: int = 1800,
    poll_interval: int = 10,
) -> tuple[str, str | None]:
    """
    Poll GET /jobs until the job completes or fails.
    Returns ``(state, output_path)`` where state is one of:
    - running: poll window elapsed and job still not terminal
    - complete: terminal complete state; output_path may be None
    - failed: terminal failed state
    - no_key: missing API key
    """
    key = _api_key()
    if not key:
        return ("no_key", None)

    elapsed = 0.0
    curr_poll = max(3, poll_interval)
    async with httpx.AsyncClient(timeout=60.0) as client:
        while elapsed < max_wait_seconds:
            resp = await client.get(f"{TAMARIND_BASE}jobs", headers=_headers())
            if resp.status_code != 200:
                logger.warning("Tamarind /jobs HTTP %s: %s", resp.status_code, resp.text[:300])
                await asyncio.sleep(curr_poll)
                elapsed += curr_poll
                curr_poll = min(30, int(curr_poll * 1.3))
                continue

            try:
                payload = resp.json()
            except Exception:
                payload = None

            record = _find_job_record(payload, job_name)
            if record is None:
                logger.debug("Tamarind poll: job %r not yet listed (%ss)", job_name, int(elapsed))
                await asyncio.sleep(curr_poll)
                elapsed += curr_poll
                curr_poll = min(30, int(curr_poll * 1.3))
                continue

            status_s, outputs = _job_status_and_outputs(record)
            logger.info("Tamarind %s: status=%s (%ss)", job_name, status_s, int(elapsed))

            if status_s in ("complete", "completed", "success", "done"):
                for o in outputs:
                    if o.lower().endswith(".pdb"):
                        return ("complete", o)
                if outputs:
                    return ("complete", outputs[0])
                return ("complete", None)

            if status_s in ("failed", "error", "cancelled", "canceled"):
                logger.warning("Tamarind job failed: %s", record)
                return ("failed", None)

            await asyncio.sleep(curr_poll)
            elapsed += curr_poll
            curr_poll = min(30, int(curr_poll * 1.2))

    logger.warning("Tamarind job %s timed out after %ss", job_name, max_wait_seconds)
    return ("running", None)


async def download_result_file(job_name: str, file_path: str) -> str | None:
    """POST /result — returns file body as text (PDB)."""
    key = _api_key()
    if not key:
        return None

    variants = [
        {"jobName": job_name, "path": file_path},
        {"jobName": job_name, "file": file_path},
        {"jobName": job_name, "filePath": file_path},
    ]

    async with httpx.AsyncClient(timeout=120.0) as client:
        for body in variants:
            resp = await client.post(f"{TAMARIND_BASE}result", headers=_headers(), json=body)
            if resp.status_code == 200 and resp.text and "ATOM" in resp.text.upper():
                return resp.text
            # Some deployments use plural
            resp2 = await client.post(f"{TAMARIND_BASE}results", headers=_headers(), json=body)
            if resp2.status_code == 200 and resp2.text and "ATOM" in resp2.text.upper():
                return resp2.text

    logger.warning("Tamarind result download failed for %s path=%s", job_name, file_path)
    return None


async def get_rcsb_structure(protein_name: str) -> dict[str, Any] | None:
    """Fetch PDB text from RCSB (free). Uses static map then optional search API."""
    name_key = protein_name.lower().replace(" ", "-").replace("_", "-")
    pdb_id = RCSB_MAP.get(name_key) or RCSB_MAP.get(protein_name.lower())

    async with httpx.AsyncClient(timeout=30.0) as client:
        if not pdb_id:
            try:
                search_body: dict[str, Any] = {
                    "query": {
                        "type": "terminal",
                        "service": "text",
                        "parameters": {
                            "attribute": "struct.title",
                            "operator": "contains_phrase",
                            "value": protein_name,
                        },
                    },
                    "return_type": "entry",
                    "request_options": {"paginator": {"cursor": None, "limit": 1}},
                }
                sresp = await client.post(
                    "https://search.rcsb.org/rcsbsearch/v2/query",
                    json=search_body,
                    headers={"Content-Type": "application/json"},
                )
                if sresp.status_code == 200:
                    sj = sresp.json()
                    rs = sj.get("result_set") or []
                    if rs and isinstance(rs[0], dict):
                        pdb_id = rs[0].get("identifier")
            except Exception as exc:
                logger.debug("RCSB search failed: %s", exc)

        if not pdb_id:
            return None

        pdb_resp = await client.get(f"https://files.rcsb.org/download/{pdb_id}.pdb")
        if pdb_resp.status_code != 200:
            return None
        pdb_text = pdb_resp.text
        return {
            "pdb_string": pdb_text,
            "pdb_id": pdb_id,
            "residue_count": _residue_count_from_pdb(pdb_text),
            "source": "rcsb",
            "pdb_url": f"https://files.rcsb.org/download/{pdb_id}.pdb",
        }


async def run_tamarind_alphafold(
    protein_name: str,
    organism: str = "",
    mutation_label: str = "",
    mutation_sites: list[str] | None = None,
) -> dict[str, Any]:
    """
    Resolve structure: cache → Tamarind AlphaFold (sequence) → RCSB.

    Returns a dict including ``pdb_string``, ``source`` in {alphafold, rcsb, unavailable},
    ``confidence_score`` (0–100 style mean pLDDT for AF PDBs), ``residue_count``, etc.
    """
    mutation_sites = mutation_sites or []
    protein_name = _normalize_protein_key(protein_name)
    if not protein_name:
        return _failure_payload("", organism, mutation_label, mutation_sites, "Empty protein name")

    cache = _load_cache()
    ck = _cache_key("alphafold", protein_name)
    if ck in cache and isinstance(cache[ck], dict):
        cached = dict(cache[ck])
        cached["from_cache"] = True
        logger.info("Tamarind cache hit for %s", protein_name)
        return cached

    jobs_used = int(cache.get("__jobs_used__", 0) or 0)
    max_jobs = int(env_str("TAMARIND_MAX_JOBS_PER_CACHE", "10") or "10")

    poll_max = int(env_str("TAMARIND_POLL_MAX_SECONDS", "1800") or "1800")

    sequence = _sequence_for_target(protein_name)
    key = _api_key()
    inflight_k = _inflight_key(ck)
    inflight = cache.get(inflight_k) if isinstance(cache.get(inflight_k), dict) else None

    if key and sequence:
        job_name = ""
        if inflight and isinstance(inflight.get("job_name"), str):
            job_name = str(inflight["job_name"])
            logger.info("Resuming in-flight Tamarind job: %s", job_name)
        elif jobs_used < max_jobs:
            job_name = (
                f"praxis_{re.sub(r'[^a-zA-Z0-9_-]+', '_', protein_name).strip('_').lower()}"
                f"_{int(datetime.now().timestamp())}"
            )
            if await submit_alphafold_job(sequence, job_name):
                cache[inflight_k] = {"job_name": job_name, "submitted_at": int(datetime.now().timestamp())}
                _save_cache(cache)
            else:
                job_name = ""

        if job_name:
            state, out_path = await poll_job_status(job_name, max_wait_seconds=poll_max, poll_interval=10)
            if state == "complete" and out_path:
                pdb_string = await download_result_file(job_name, out_path)
                if pdb_string:
                    plddt = _plddt_from_pdb(pdb_string)
                    conf_01 = (plddt / 100.0) if plddt is not None else None
                    res_count = _residue_count_from_pdb(pdb_string)
                    result: dict[str, Any] = {
                        "protein_name": protein_name,
                        "organism": organism,
                        "mutation_label": mutation_label,
                        "pdb_string": pdb_string,
                        "pdb_url": None,
                        "confidence_score": conf_01,
                        "plddt_mean": plddt,
                        "residue_count": res_count,
                        "mutation_sites": mutation_sites,
                        "source": "alphafold",
                        "job_name": job_name,
                    }
                    cache[ck] = {k: v for k, v in result.items() if k != "from_cache"}
                    cache["__jobs_used__"] = jobs_used + 1
                    cache.pop(inflight_k, None)
                    _save_cache(cache)
                    logger.info("Tamarind AlphaFold complete: %s (%s residues)", protein_name, res_count)
                    return result
            if state == "failed" or state == "complete":
                cache.pop(inflight_k, None)
                _save_cache(cache)
            if state == "running":
                return {
                    "protein_name": protein_name,
                    "organism": organism,
                    "mutation_label": mutation_label,
                    "pdb_string": None,
                    "pdb_url": None,
                    "confidence_score": None,
                    "residue_count": None,
                    "mutation_sites": mutation_sites,
                    "source": "alphafold_pending",
                    "job_name": job_name,
                    "error": f"AlphaFold still running; poll again (waited {poll_max}s).",
                }

    logger.info("Falling back to RCSB for %s", protein_name)
    rcsb = await get_rcsb_structure(protein_name)
    if rcsb:
        result = {
            "protein_name": protein_name,
            "organism": organism,
            "mutation_label": mutation_label,
            "pdb_string": rcsb["pdb_string"],
            "pdb_url": rcsb["pdb_url"],
            "confidence_score": None,
            "residue_count": rcsb["residue_count"],
            "mutation_sites": mutation_sites,
            "source": "rcsb",
            "pdb_id": rcsb.get("pdb_id"),
        }
        cache[ck] = {k: v for k, v in result.items() if k != "from_cache"}
        _save_cache(cache)
        return result

    return _failure_payload(protein_name, organism, mutation_label, mutation_sites, "Structure not found")


def _failure_payload(
    protein_name: str,
    organism: str,
    mutation_label: str,
    mutation_sites: list[str],
    err: str,
) -> dict[str, Any]:
    return {
        "protein_name": protein_name,
        "organism": organism,
        "mutation_label": mutation_label,
        "pdb_string": None,
        "pdb_url": None,
        "confidence_score": None,
        "residue_count": None,
        "mutation_sites": mutation_sites,
        "source": "unavailable",
        "error": err,
    }


def tamarind_result_to_model(_program: ResearchProgram, result: dict[str, Any]) -> TamarindOutput:
    src = result.get("source") or "unavailable"
    pdb = result.get("pdb_string")
    # Stored 0–1 for AlphaFold (mean pLDDT / 100); None for RCSB.
    conf01 = result.get("confidence_score")
    if isinstance(conf01, (int, float)) and conf01 > 1.0 + 1e-6:
        conf01 = float(conf01) / 100.0

    if src == "alphafold_pending":
        return TamarindOutput(
            requested=True,
            pdb_url=None,
            pdb_content=None,
            confidence_score=None,
            status="running",
            note=result.get("error") or f"AlphaFold pending (job={result.get('job_name', 'unknown')}).",
        )

    if src == "unavailable" or not pdb:
        return TamarindOutput(
            requested=True,
            pdb_url=result.get("pdb_url"),
            pdb_content=None,
            confidence_score=None,
            status="structure_unavailable",
            note=result.get("error") or "Structure unavailable.",
        )

    note_parts = [f"source={src}"]
    if result.get("job_name"):
        note_parts.append(f"job={result['job_name']}")
    if result.get("pdb_id"):
        note_parts.append(f"pdb_id={result['pdb_id']}")
    if result.get("plddt_mean") is not None:
        note_parts.append(f"pLDDT≈{result['plddt_mean']}")
    if result.get("from_cache"):
        note_parts.append("cached")

    return TamarindOutput(
        requested=True,
        pdb_url=result.get("pdb_url"),
        pdb_content=pdb,
        confidence_score=float(conf01) if isinstance(conf01, (int, float)) else None,
        status="complete",
        note="; ".join(note_parts),
    )


async def tamarind_agent(program: ResearchProgram) -> ResearchProgram:
    """Populate ``program.tamarind_results`` from Tamarind AlphaFold or RCSB."""
    target = (program.target or "").strip()
    if not target or target == "unknown_target":
        program.tamarind_results = TamarindOutput(
            requested=False,
            pdb_url=None,
            pdb_content=None,
            confidence_score=None,
            status="structure_unavailable",
            note="Protein unknown; structure unavailable.",
        )
        return program

    muts = _parse_mutations(program.hypothesis or "")
    mut_label = f"{muts[0]} mutant" if muts else ""

    result = await run_tamarind_alphafold(
        protein_name=target,
        organism=program.organism or "",
        mutation_label=mut_label,
        mutation_sites=muts,
    )
    program.tamarind_results = tamarind_result_to_model(program, result)
    program.refresh_computed_fields()
    return program
