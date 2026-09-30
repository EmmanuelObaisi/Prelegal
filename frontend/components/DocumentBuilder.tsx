"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import DocumentChat from "@/components/DocumentChat";
import AgreementDocument from "@/components/AgreementDocument";
import { emptyDraft, type Draft } from "@/lib/chat";
import { buildKeyTermsPage, NDA_ID, pdfFilename, type DocumentDef } from "@/lib/documents";
import { parseMarkdown } from "@/lib/markdown";
import { fillCoverPage } from "@/lib/nda";

/** A document definition with its Standard Terms markdown, read at build time. */
export interface DocumentWithTerms extends DocumentDef {
  standardTerms: string;
}

interface DocumentBuilderProps {
  documents: DocumentWithTerms[];
  ndaCoverPage: string;
}

type DownloadState = "idle" | "working" | "failed";

export default function DocumentBuilder({ documents, ndaCoverPage }: DocumentBuilderProps) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [download, setDownload] = useState<DownloadState>("idle");
  const today = useToday();

  const doc = documents.find((d) => d.id === draft.documentId);
  const coverPage = doc && parseMarkdown(coverPageMarkdown(doc, draft, ndaCoverPage, today));
  const terms = useMemo(() => doc && parseMarkdown(doc.standardTerms), [doc]);

  async function handleDownload() {
    if (!doc || !coverPage || !terms) return;
    setDownload("working");
    try {
      const { downloadAgreementPdf } = await import("@/components/AgreementPdf");
      await downloadAgreementPdf({ title: doc.name, coverPage, standardTerms: terms }, pdfFilename(doc.slug, draft.parties));
      setDownload("idle");
    } catch (error) {
      console.error(error);
      setDownload("failed");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule bg-paper px-4 py-3 sm:px-6">
        <p className="font-serif text-xl font-semibold tracking-tight">Prelegal</p>
        <p className="text-[0.9375rem] text-muted">{doc?.name ?? "Legal agreement drafting"}</p>
        {doc && (
          <div className="ml-auto flex items-center gap-3">
            <p role="status" className="text-sm text-muted">
              {download === "failed" && "The PDF couldn’t be created. Try again."}
            </p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={download === "working"}
              className="rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-[#1b3683] disabled:cursor-wait disabled:opacity-70"
            >
              {download === "working" ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        )}
      </header>

      <main className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(22rem,26rem)_1fr]">
        <section aria-label="Chat with the assistant" className="flex flex-col border-rule bg-paper px-4 py-6 sm:px-6 lg:min-h-0 lg:border-r">
          <p className="mb-4 text-[0.9375rem] leading-relaxed text-muted">
            Chat with the assistant and your answers appear in <span className="text-ink">blue</span> in the agreement.
            Anything left empty prints as a blank to fill in by hand.
          </p>
          <div className="flex-1 lg:min-h-0">
            <DocumentChat draft={draft} onChange={setDraft} />
          </div>
        </section>

        <section aria-label="Agreement preview" className="space-y-6 px-3 py-8 sm:px-8 lg:overflow-y-auto lg:py-12">
          {doc && coverPage && terms ? (
            <>
              <AgreementDocument tree={coverPage} label={doc.id === NDA_ID ? "Cover page" : "Key terms"} />
              <AgreementDocument tree={terms} label="Standard terms" />
              <p className="mx-auto max-w-[46rem] text-center text-xs text-type/80">
                Based on the Common Paper {doc.name}, used under CC BY 4.0.
              </p>
            </>
          ) : (
            <p className="mx-auto max-w-[32rem] pt-16 text-center text-[0.9375rem] leading-relaxed text-muted">
              Tell the assistant what you need. Your agreement will appear here as soon as you’ve chosen one.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

/** The Mutual NDA fills its Common Paper cover page; every other document gets a generated Key Terms page. */
function coverPageMarkdown(doc: DocumentDef, draft: Draft, ndaCoverPage: string, today: string): string {
  if (doc.id !== NDA_ID) return buildKeyTermsPage(doc, draft.fields, draft.parties);
  const nda = { ...draft.nda, effectiveDate: draft.nda.effectiveDate || today, parties: draft.parties };
  return fillCoverPage(ndaCoverPage, nda);
}

const subscribeToNothing = () => () => {};

/**
 * Today's date as YYYY-MM-DD in the viewer's timezone. Empty during static
 * rendering, so the prerendered page never bakes in the build date.
 */
function useToday(): string {
  return useSyncExternalStore(
    subscribeToNothing,
    () => {
      const now = new Date();
      return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    },
    () => "",
  );
}
