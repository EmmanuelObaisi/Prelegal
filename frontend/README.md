# Prelegal frontend

A Next.js app for drafting legal agreements. Users sign up or sign in, chat with an AI assistant that picks one of 11 Common Paper documents and fills in its fields, watch the agreement update live, and download it as a PDF. Every draft is autosaved and listed under **My documents**.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000 (UI only: the API needs FastAPI to serve the build)
npm test        # unit tests (Vitest)
npm run build   # static production build
```

## How it works

`app/page.tsx` reads `documents.json` and `templates/*.md` from the repository root at build time, so always build from a full checkout. Everything after that runs in the browser against same-origin `/api/*` routes; the session is an HttpOnly cookie.

| File | Role |
| --- | --- |
| `components/App.tsx` | Restores the session, then shows the sign-in screen, My documents, or the builder. |
| `components/AuthScreen.tsx`, `lib/auth.ts` | Sign in and sign up. |
| `components/DocumentsList.tsx`, `lib/savedDocuments.ts` | The user's saved drafts; opening one resumes its chat. |
| `components/DocumentBuilder.tsx`, `components/DocumentChat.tsx`, `lib/chat.ts` | The chat, live preview and PDF download. Each turn is autosaved by the backend under `savedId`. |
| `lib/documents.ts`, `lib/nda.ts`, `lib/markdown.ts` | Build and parse each agreement's markdown into one tree. |
| `components/AgreementDocument.tsx`, `components/AgreementPdf.tsx` | Render that tree on screen and as a PDF, both with the draft notice from `DraftNotice.tsx`. |
