/** The Prelegal wordmark: a folded-corner page in accent yellow and the name in the serif. */
export default function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${inverted ? "text-paper" : "text-navy"}`}>
      <svg aria-hidden viewBox="0 0 20 24" className="h-6 w-5">
        <path d="M2 0h11l7 7v15a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Z" className="fill-accent" />
        <path d="M13 0v5a2 2 0 0 0 2 2h5Z" className="fill-navy/30" />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight">Prelegal</span>
    </span>
  );
}
