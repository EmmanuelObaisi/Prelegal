"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import NdaDocument from "@/components/NdaDocument";
import NdaForm from "@/components/NdaForm";
import { defaultNdaData, fillCoverPage, pdfFilename, type NdaData } from "@/lib/nda";
import { parseNdaMarkdown } from "@/lib/nda-document";

interface NdaBuilderProps {
  coverPageTemplate: string;
  standardTerms: string;
}

type DownloadState = "idle" | "working" | "failed";

export default function NdaBuilder({ coverPageTemplate, standardTerms }: NdaBuilderProps) {
  const [data, setData] = useState<NdaData>(defaultNdaData);
  const [download, setDownload] = useState<DownloadState>("idle");
  const today = useToday();

  const filled: NdaData = { ...data, effectiveDate: data.effectiveDate || today };
  const coverPage = parseNdaMarkdown(fillCoverPage(coverPageTemplate, filled));
  const terms = useMemo(() => parseNdaMarkdown(standardTerms), [standardTerms]);

  async function handleDownload() {
    setDownload("working");
    try {
      const { downloadNdaPdf } = await import("@/components/NdaPdf");
      await downloadNdaPdf(coverPage, terms, pdfFilename(filled));
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
        <p className="text-[0.9375rem] text-muted">Mutual Non-Disclosure Agreement</p>
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
      </header>

      <main className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(22rem,26rem)_1fr]">
        <section aria-label="Your details" className="border-rule bg-paper px-4 py-8 sm:px-6 lg:overflow-y-auto lg:border-r">
          <p className="mb-8 text-[0.9375rem] leading-relaxed text-muted">
            Answer a few questions and your answers appear in <span className="text-ink">blue</span> in the agreement.
            Anything left empty prints as a blank to fill in by hand.
          </p>
          <NdaForm data={data} defaultDate={today} onChange={setData} />
        </section>

        <section aria-label="Agreement preview" className="space-y-6 px-3 py-8 sm:px-8 lg:overflow-y-auto lg:py-12">
          <NdaDocument tree={coverPage} label="Cover page" />
          <NdaDocument tree={terms} label="Standard terms" />
          <p className="mx-auto max-w-[46rem] text-center text-xs text-type/80">
            Based on the Common Paper Mutual NDA, version 1.0, used under CC BY 4.0.
          </p>
        </section>
      </main>
    </div>
  );
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
