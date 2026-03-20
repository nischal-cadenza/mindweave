# Repository Guidelines

## Project Structure & Module Organization
`backend/app` contains the FastAPI service. Keep HTTP routes in `backend/app/api/v1`, shared config and WebSocket plumbing in `backend/app/core`, domain logic and external integrations in `backend/app/services`, schemas in `backend/app/models`, and prompt text in `backend/app/prompts`. Put backend tests in `backend/tests/`. `frontend/src` holds the React client: `components` for UI, `hooks` for stateful logic, `api` for HTTP helpers, and `types` for shared TypeScript models. Use `docs/ARCHITECTURE.md` and `SPEC.md` before changing request flow or graph behavior.

## Build, Test, and Development Commands
`docker compose up --build` starts the full stack: frontend, backend, and Neo4j.

`cd backend && uv sync` installs Python dependencies.

`cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` runs the API locally.

`cd backend && uv run pytest` runs backend tests.

`cd backend && uv run ruff check .` lints Python code.

`cd frontend && npm install` installs frontend dependencies.

`cd frontend && npm run dev` starts Vite on `http://localhost:5173`.

`cd frontend && npm run build` type-checks and builds production assets.

`cd frontend && npm run lint` runs ESLint on `src/`.

## Coding Style & Naming Conventions
Python uses 4-space indentation, snake_case names, and typed `async` handlers where appropriate. Keep API contracts in `models` and push vendor-specific logic into `services`. Frontend code uses TypeScript, 2-space indentation, double quotes, semicolons, PascalCase component files such as `GraphCanvas.tsx`, and `use*` hook names such as `useWebSocket.ts`. Prefer small components and Tailwind utilities over one-off CSS.

## Testing Guidelines
Backend testing is set up with `pytest` and `pytest-asyncio`, but the committed suite is still minimal. Add tests under `backend/tests/test_<feature>.py` for any backend behavior change. No frontend test runner is configured yet, so UI changes should include manual smoke-test notes for chat, graph updates, reset, and export flows.

## Commit & Pull Request Guidelines
Recent history mostly uses Conventional Commit prefixes like `feat:` and `chore:`. Follow `type: imperative summary`, for example `feat: add websocket reconnect handling`. Keep PRs focused, link the relevant issue or spec, list commands you ran, call out config changes, and attach screenshots or GIFs for frontend changes.

## Configuration & Secrets
Copy `.env.example` to `.env` and set `OPENROUTER_API_KEY` before local development. Do not commit `.env`, local virtualenvs, or generated Neo4j data.
