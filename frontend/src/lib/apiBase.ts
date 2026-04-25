/** Base URL for the FastAPI backend; set `VITE_API_URL` in `.env` / Vercel. */
export function getApiBase(): string {
  const u = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (u) return u;
  if (import.meta.env.DEV) return "http://localhost:8000";
  return "";
}
