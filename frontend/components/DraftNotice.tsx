/** The wording shared by the on-screen notice and the PDF footer. */
export const DRAFT_NOTICE =
  "This is an AI-generated draft, not legal advice. It is subject to review by a qualified lawyer before anyone signs it.";

/** Reminds the user, above every agreement preview, that the document is only a draft. */
export default function DraftNotice() {
  return (
    <p
      role="note"
      className="mx-auto max-w-[46rem] rounded-md border border-accent/40 border-l-4 border-l-accent bg-accent/10 px-4 py-3 text-sm leading-relaxed text-navy"
    >
      <span className="font-semibold">Draft for legal review. </span>
      {DRAFT_NOTICE}
    </p>
  );
}
