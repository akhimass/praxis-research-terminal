#!/usr/bin/env bash
# PRAXIS smoke audit: backend HTTP + local frontend build.
# Usage: bash scripts/audit.sh [RAILWAY_BASE_URL] [VERCEL_BASE_URL]
# Example:
#   bash scripts/audit.sh https://praxis-research-terminal-production.up.railway.app https://praxisalautomation.vercel.app

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RAILWAY="${1:-}"
VERCEL="${2:-}"

echo "═══════════════════════════════════════"
echo "PRAXIS FULL AUDIT"
echo "═══════════════════════════════════════"

if [[ -z "$RAILWAY" ]]; then
  echo "⚠ No Railway URL passed — skipping remote HTTP checks."
  echo "  Run: bash scripts/audit.sh https://your-backend.up.railway.app https://your-app.vercel.app"
else
  echo -n "Backend health: "
  HEALTH=$(curl -sS -m 20 "$RAILWAY/health" 2>/dev/null || echo '{"error":"curl failed"}')
  echo "$HEALTH" | grep -q '"status":"ok"' && echo "✅ $HEALTH" || echo "❌ $HEALTH"

  echo -n "Usage tracking: "
  # Do not use curl -f: Railway may return 502 JSON; we want the body for debugging.
  USAGE=$(curl -sS -m 25 "$RAILWAY/usage" 2>/dev/null || echo '{}')
  echo "$USAGE" | grep -q "session_cost" && echo "✅ $USAGE" || echo "❌ Not found / failed / timeout — body: ${USAGE:0:200}"

  echo -n "Tamarind Bio: "
  # AlphaFold / RCSB can exceed 120s when cold; cap at 3m so the script can finish.
  TAM=$(curl -sS -m 180 "$RAILWAY/tamarind/test" 2>/dev/null || echo '{}')
  echo "$TAM" | grep -q "has_pdb" && echo "✅ $TAM" || echo "❌ $TAM"

  echo -n "Tamarind status: "
  TS=$(curl -sS -m 15 "$RAILWAY/tamarind/status" 2>/dev/null || echo '{}')
  echo "$TS" | grep -q "jobs_used" && echo "✅ $TS" || echo "❌ $TS"

  echo -n "Feedback store: "
  REV=$(curl -sS -m 20 "$RAILWAY/review/stats" 2>/dev/null || echo '{}')
  echo "$REV" | grep -q "total_reviews" && echo "✅ $REV" || echo "❌ $REV"

  echo -n "MIC corrections: "
  CORR=$(curl -sS -m 20 "$RAILWAY/review/corrections/mic_assay" 2>/dev/null || echo '{}')
  echo "$CORR" | grep -q "corrections" && echo "✅ Corrections payload present" || echo "❌ No corrections"

  echo -n "SSE pipeline: "
  SSE=$(curl -sN -X POST "$RAILWAY/pipeline/stream" \
    -H "Content-Type: application/json" \
    -d '{"hypothesis": "audit test"}' \
    --max-time 12 2>/dev/null | head -n 8 || true)
  echo "$SSE" | grep -q '"type"' && echo "✅ Streaming" || echo "❌ Not streaming (timeout or error)"

  echo -n "Novelty gate: "
  NOV=$(curl -sN -X POST "$RAILWAY/pipeline/stream" \
    -H "Content-Type: application/json" \
    -d '{"hypothesis": "FITC-dextran intestinal permeability mouse"}' \
    --max-time 14 2>/dev/null | grep "novelty" | head -n 1 || true)
  echo "$NOV" | grep -q "signal" && echo "✅ $NOV" || echo "❌ Novelty not observed in window"

  if [[ -n "$VERCEL" ]]; then
    echo -n "Vercel HEAD: "
    code=$(curl -sI -o /dev/null -w "%{http_code}" "$VERCEL" || echo "000")
    [[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]] && echo "✅ HTTP $code" || echo "⚠ HTTP $code"
  fi

  echo ""
  echo "─── FINAL RESOURCE STATE (remote) ───────────────"
  curl -sS -m 25 "$RAILWAY/usage" 2>/dev/null | python3 -c "
import json,sys
raw=sys.stdin.read().strip() or '{}'
try:
  d=json.loads(raw)
except json.JSONDecodeError:
  d={}
print(f'  Anthropic spend (est): \${d.get(\"session_cost_usd\",0):.4f}')
print(f'  Budget remaining: \${d.get(\"budget_remaining_usd\",0):.2f}')
print(f'  API calls made: {d.get(\"session_calls\",0)}')
" 2>/dev/null || echo "  (usage parse failed)"
fi

echo ""
echo -n "Frontend build: "
(cd "$ROOT/frontend" && npm run build --silent) && echo "✅ Built (dist/)" || echo "❌ Build failed"

echo ""
echo "═══════════════════════════════════════"
echo "AUDIT COMPLETE"
echo "═══════════════════════════════════════"
