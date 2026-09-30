# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation (PL-6): a fake sign-in screen in front of a document creator, where an AI chat picks one of 11 supported documents and fills in its fields, served by FastAPI in Docker.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is statically exported (`output: "export"`) and served by FastAPI.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

### Completed
- **PL-2**: Common Paper templates in `templates/` and `catalog.json`.
- **PL-3**: Mutual NDA creator (manual form, live preview, PDF download via `@react-pdf/renderer`).
- **PL-4**: V1 foundation.
  - Docker multi-stage build: Node stage builds the static frontend, Python stage runs FastAPI via uv.
  - Backend: `GET /api/health` only; `backend/database.py` deletes and recreates `backend/prelegal.db` (stdlib `sqlite3`, `users` table: id, email, created_at) on every startup.
  - Frontend: `SignInGate` shows a fake sign-in screen (any email/password, client state only, reload signs out) in front of the Mutual NDA creator.
  - Start/stop scripts for Mac, Linux, Windows (`docker compose up --build -d` / `down`).
- **PL-5**: AI chat replaces the manual NDA form (still Mutual NDA only).
  - Backend: `backend/chat.py` holds the Pydantic models (camelCase, mirroring `NdaData` in `frontend/lib/nda.ts`), system prompt and LiteLLM structured-output call. Stateless: each request carries the full history and current fields.
  - Frontend: `NdaChat` (static greeting, no LLM call until the user sends) calls `/api/chat` via `lib/chat.ts` and replaces the `NdaData` state with the returned fields.
  - Model output is normalized to plain ASCII spaces/hyphens (gpt-oss emits U+202F / U+2011, which break dates).
- **PL-6**: All catalog documents (11: Mutual NDA plus 10 standard-terms-only templates).
  - `documents.json` (repo root) is the single source of document ids, names, template files, PDF slugs, party roles and Key Terms fields; read by `backend/documents.py` and `frontend/app/page.tsx`. Descriptions come from `catalog.json`.
  - One chat request/response shape for every document: `draft = {documentId, nda, parties, fields[{key, value}]}`. `documentId` is a `Literal` of the ids or null; one system prompt lists every document and field, and handles unsupported requests by suggesting the closest document.
  - The Mutual NDA keeps its Common Paper cover page (`fillCoverPage`); other documents get a generated Key Terms page (`frontend/lib/documents.ts`). Parties are shared by all documents, so they carry over on a switch.
  - `lib/markdown.ts` writes the `field`/`blank` markers and `parseMarkdown` reads them; it also treats every `*_link` and `header_2`/`header_3` span as a term, unwraps `<span id>` anchors, and disables indented code (DPA clauses were being read as code blocks).
  - Generic components: `DocumentBuilder`, `DocumentChat`, `AgreementDocument` (screen) and `AgreementPdf` (PDF, named `<slug>-<companies>.pdf`). `lib/nda.ts` now holds only the NDA cover page.

### Not yet implemented
**PL-7** (next, the last planned ticket): support multiple users and final polish.
- Real sign up and sign in screens (replacing the fake `SignInGate`) so users can register and come back.
- Store each user's generated documents and let them view prior ones. Data stays temporary: the database still resets on every server start.
- Professional SaaS polish across all screens.
- A disclaimer that documents are drafts subject to legal review.

### Known limitations
- The model sometimes leaves a value the user mentioned unfilled, and clears the previous document's fields when the user switches documents (prompt quality, not schema).

### Current API Endpoints
- `GET /api/health` - Health check
- `POST /api/chat` - `{messages, draft}` -> `{reply, draft}`; 502 if the LLM call fails

### Notes
- The frontend reads `documents.json` and `templates/*.md` from the repo root at build time (and in tests), so the Docker frontend stage copies both.
- Next.js is v16 with breaking changes: read `frontend/AGENTS.md` and `node_modules/next/dist/docs/` before frontend work.
- Adding an NDA field means updating `frontend/lib/nda.ts` (type, default, `fillCoverPage`) and `backend/chat.py` (`NdaData` and prompt); `NdaTerms` in `lib/chat.ts` follows automatically.
- Adding a Key Terms field only needs `documents.json`. Adding a document needs `documents.json`, its template in `templates/` and a `catalog.json` entry (the backend takes its description from there).
- The backend reads `documents.json` and `catalog.json` from the repo root, so the Docker runtime stage copies both.
- The chat uses same-origin `/api/chat`, so it only works when FastAPI serves the built frontend (Docker, or `npm run build` then uvicorn), not under `next dev`.

### Tests
- Backend: `cd backend && uv run pytest`
- Frontend: `cd frontend && npm test` (Vitest; component tests use jsdom + Testing Library)
