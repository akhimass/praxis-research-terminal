# PRAXIS — AI Research Execution System

Turn a scientific hypothesis into a complete, executable experiment plan in under 90 seconds.

## Live demo

- Frontend: https://praxis-research-terminal.vercel.app
- API: https://praxis-backend.up.railway.app

## Stack

- Frontend: React + Vite + TypeScript (Vercel)
- Backend: FastAPI + Python (Railway)
- AI: Claude (Anthropic) + Tavily + Tamarind Bio

## Run locally

**Backend** (`main.py` lives in `backend/`; imports use the `backend` package, so `PYTHONPATH` must be the **repository root** — the directory that contains both `backend/` and `frontend/`):

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your API keys to .env
export PYTHONPATH=..
uvicorn main:app --reload --port 8000
```

**Frontend**:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Deploy

**Backend (Railway)** — set the service **root directory** to `backend/`. Builds use **`backend/Dockerfile`**: code is copied to `/workspace/backend/` with `PYTHONPATH=/workspace` so `from backend…` imports match the monorepo. `railway.json` sets the Dockerfile builder and `/health` checks. Configure env vars from `backend/.env.example` (or set secrets in the Railway dashboard).

**Frontend (Vercel)** — root directory `frontend/`, build `npm run build`, output `dist/`, set `VITE_API_URL` to your Railway API URL in project environment variables.

## Frontend source

The UI was cloned from [praxis-research-terminal](https://github.com/akhimass/praxis-research-terminal) into `frontend/` (nested `.git` removed for a single monorepo checkout).
