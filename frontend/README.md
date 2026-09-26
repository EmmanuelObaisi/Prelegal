# Prelegal frontend

A Next.js app for drafting a Mutual Non-Disclosure Agreement. The user fills in a form, sees the Common Paper Mutual NDA update live with their answers, and downloads it as a PDF.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests (Vitest)
npm run build   # static production build
```

## How it works

The agreement text is not copied into this app. `app/page.tsx` reads `templates/Mutual-NDA-coverpage.md` and `templates/Mutual-NDA.md` from the repository root at build time, so the page is prerendered as static HTML.

Because of this, always build from a full checkout of the repository with `templates/` next to `frontend/`. A build context containing only `frontend/` (for example a Docker `COPY frontend/ .`) fails with a message saying so.

| File | Role |
| --- | --- |
| `lib/nda.ts` | The form's data model, and `fillCoverPage`, which swaps the cover page's `[bracketed]` placeholders for the user's answers. User input is markdown-escaped, so it is always shown as text. |
| `lib/nda-document.ts` | `parseNdaMarkdown` parses markdown into an [mdast](https://github.com/syntax-tree/mdast) tree. The few inline tags the templates use (`<span class="coverpage_link">`, `<label>`) and the fill markers become `mark` nodes; any other HTML is kept as literal text. |
| `components/NdaDocument.tsx` | Renders that tree as the on-screen preview. |
| `components/NdaPdf.tsx` | Renders the same tree as a vector PDF with `@react-pdf/renderer`, loaded only when the user clicks **Download PDF**. |
| `components/NdaForm.tsx`, `components/NdaBuilder.tsx` | The form, and the page that ties the form, preview and download together. |

Both renderers share one parsed tree, so the preview and the PDF always contain the same text.
