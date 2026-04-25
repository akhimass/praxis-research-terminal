from __future__ import annotations

from backend.models.research_program import ResearchProgram, TamarindOutput


async def tamarind_agent(program: ResearchProgram) -> ResearchProgram:
    if program.target in {"", "unknown_target"}:
        program.tamarind_results = TamarindOutput(
            requested=False,
            pdb_url=None,
            confidence_score=None,
            status="structure_unavailable",
            note="Protein unknown; structure unavailable.",
        )
        return program

    # Placeholder for Tamarind API request/poll lifecycle.
    program.tamarind_results = TamarindOutput(
        requested=True,
        pdb_url=f"https://tamarind.example.org/pdb/{program.target}.pdb",
        confidence_score=0.81,
        status="complete",
        note="Mocked AlphaFold docking result. Replace with live Tamarind API integration.",
    )
    return program
