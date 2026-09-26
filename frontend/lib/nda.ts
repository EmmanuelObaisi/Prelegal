/**
 * Fills the Common Paper Mutual NDA Cover Page template with the user's answers.
 *
 * The template's `[bracketed]` placeholders are swapped for inline marker tags:
 * `<span class="nda-field">` around a filled value, or `<span class="nda-blank">`
 * around a hint when the user left the answer empty. `parseNdaMarkdown` turns
 * those markers into nodes the screen and PDF renderers style as filled-in blanks.
 */

export interface Party {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
}

export interface NdaData {
  purpose: string;
  /** ISO date (YYYY-MM-DD); empty until chosen. */
  effectiveDate: string;
  mndaTerm: "expires" | "untilTerminated";
  mndaTermYears: string;
  confidentialityTerm: "years" | "perpetual";
  confidentialityYears: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  parties: [Party, Party];
}

const emptyParty: Party = { name: "", title: "", company: "", noticeAddress: "" };

export const DEFAULT_PURPOSE =
  "Evaluating whether to enter into a business relationship with the other party.";

export const defaultNdaData: NdaData = {
  purpose: DEFAULT_PURPOSE,
  effectiveDate: "",
  mndaTerm: "expires",
  mndaTermYears: "1",
  confidentialityTerm: "years",
  confidentialityYears: "1",
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  parties: [emptyParty, emptyParty],
};

/** Backslash-escapes every ASCII punctuation character so user text is never read as markdown or HTML. */
export function escapeMarkdown(text: string): string {
  return text.replace(/[!-/:-@[-`{-~]/g, "\\$&");
}

/** Escapes text for an inline position; line breaks become markdown hard breaks. */
function escapeInline(text: string): string {
  return text
    .trim()
    .split(/\s*\n\s*/)
    .map(escapeMarkdown)
    .join("\\\n");
}

/** Escapes text for a table cell, where line breaks are not allowed. */
function escapeCell(text: string): string {
  return escapeMarkdown(text.trim().split(/\s*\n\s*/).join(", "));
}

function field(value: string, hint: string, escape = escapeInline): string {
  return value.trim()
    ? `<span class="nda-field">${escape(value)}</span>`
    : `<span class="nda-blank">${escapeMarkdown(hint)}</span>`;
}

export function formatYears(years: string): string {
  const n = Number(years);
  return `${years.trim()} ${n === 1 ? "year" : "years"}`;
}

function yearsField(years: string): string {
  return Number(years) > 0 ? field(formatYears(years), "") : field("", "number of years");
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!isoDate || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Replaces each exact template snippet, in document order, in a single pass.
 * Each search starts after the previous replacement, so a snippet can never be
 * matched inside text the user typed. Fails loudly if the template has drifted.
 */
function replaceInOrder(template: string, replacements: [find: string, replacement: string][]): string {
  let output = "";
  let rest = template;
  for (const [find, replacement] of replacements) {
    const index = rest.indexOf(find);
    if (index === -1) throw new Error(`Mutual NDA cover page template is missing: ${find}`);
    output += rest.slice(0, index) + replacement;
    rest = rest.slice(index + find.length);
  }
  return output + rest;
}

const checkbox = (checked: boolean) => (checked ? "[x]" : "[ ]");

export function fillCoverPage(template: string, data: NdaData): string {
  const [p1, p2] = data.parties;
  const expires = data.mndaTerm === "expires";
  const forYears = data.confidentialityTerm === "years";
  const unchosenYears = "\\_\\_\\_\\_ years";
  const row = (label: string, key: keyof Party) =>
    `| ${label} | ${[p1, p2].map((party) => field(party[key], "", escapeCell)).join(" | ")} |`;
  const notice = "Notice Address <label>Use either email or postal address</label>";

  return replaceInOrder(template, [
    [`[${DEFAULT_PURPOSE}]`, field(data.purpose, "How Confidential Information may be used")],
    ["[Today’s date]", field(formatDate(data.effectiveDate), "Effective Date")],
    [
      "- [x]     Expires [1 year(s)] from Effective Date.",
      `- ${checkbox(expires)}     Expires ${expires ? yearsField(data.mndaTermYears) : unchosenYears} from Effective Date.`,
    ],
    [
      "- [ ]     Continues until terminated",
      `- ${checkbox(!expires)}     Continues until terminated`,
    ],
    [
      "- [x]     [1 year(s)] from Effective Date, but",
      `- ${checkbox(forYears)}     ${forYears ? yearsField(data.confidentialityYears) : unchosenYears} from Effective Date, but`,
    ],
    ["- [ ]     In perpetuity.", `- ${checkbox(!forYears)}     In perpetuity.`],
    ["[Fill in state]", field(data.governingLaw, "State")],
    [
      "[Fill in city or county and state, i.e. “courts located in New Castle, DE”]",
      field(data.jurisdiction, "City or county and state"),
    ],
    ["List any modifications to the MNDA", field(data.modifications.trim() || "None.", "")],
    ["| Print Name | |", row("Print Name", "name")],
    ["| Title | | |", row("Title", "title")],
    ["| Company | | |", row("Company", "company")],
    [`| ${notice} | | |`, row(notice, "noticeAddress")],
  ]);
}

/** A download filename such as `Mutual-NDA-Acme-Globex.pdf`. */
export function pdfFilename(data: NdaData): string {
  const names = data.parties
    .map((party) => party.company.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean);
  return ["Mutual-NDA", ...names].join("-") + ".pdf";
}
