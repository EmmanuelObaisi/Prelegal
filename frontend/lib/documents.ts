/**
 * The documents Prelegal can draft, as defined in documents.json at the repo
 * root, and the generated Key Terms page used by every document except the
 * Mutual NDA, which has its own Common Paper cover page.
 */
import { escapeCell, escapeMarkdown, field } from "@/lib/markdown";

export const NDA_ID = "mutual-nda";

export interface FieldDef {
  key: string;
  label: string;
  hint: string;
}

export interface DocumentDef {
  id: string;
  name: string;
  file: string;
  /** Prefix of the PDF filename, e.g. `SLA`. */
  slug: string;
  parties: [string, string];
  fields: FieldDef[];
}

export interface Party {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
}

export interface FieldValue {
  key: string;
  value: string;
}

/**
 * A Key Terms page: a table of the document's fields, then signature blocks for
 * both parties. Empty answers print as blanks with a hint, as on the NDA cover page.
 */
export function buildKeyTermsPage(doc: DocumentDef, values: FieldValue[], parties: Party[]): string {
  const valueOf = (key: string) => values.find((v) => v.key === key)?.value ?? "";
  const terms = doc.fields.map(
    ({ key, label, hint }) => `| ${escapeMarkdown(label)} | ${field(valueOf(key), hint, escapeCell)} |`,
  );
  const partyRow = (label: string, key: keyof Party) =>
    `| ${label} | ${parties.map((party) => field(party[key], "", escapeCell)).join(" | ")} |`;

  return [
    `# ${escapeMarkdown(doc.name)}`,
    "## Key Terms",
    `This ${escapeMarkdown(doc.name)} consists of these Key Terms and the Common Paper ${escapeMarkdown(doc.name)} Standard Terms that follow. Capitalized terms used in the Standard Terms have the meanings given here.`,
    ["| Term | Value |", "|:--- | :--- |", ...terms].join("\n"),
    "By signing below, each party agrees to enter into this agreement.",
    [
      `|| ${doc.parties.map((role) => escapeMarkdown(role).toUpperCase()).join(" | ")} |`,
      "|:--- | :----: | :----: |",
      "| Signature | | |",
      partyRow("Print Name", "name"),
      partyRow("Title", "title"),
      partyRow("Company", "company"),
      partyRow("Notice Address <label>Use either email or postal address</label>", "noticeAddress"),
      "| Date | | |",
    ].join("\n"),
  ].join("\n\n");
}

/** A download filename such as `Mutual-NDA-Acme-Globex.pdf`. */
export function pdfFilename(prefix: string, parties: Party[]): string {
  const names = parties
    .map((party) => party.company.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, ""))
    .filter(Boolean);
  return [prefix, ...names].join("-") + ".pdf";
}
