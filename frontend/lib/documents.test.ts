import { readFileSync } from "node:fs";
import path from "node:path";
import type { Nodes } from "mdast";
import { describe, expect, it } from "vitest";
import { buildKeyTermsPage, type DocumentDef, type Party } from "./documents";
import { parseMarkdown, textContent, type Mark } from "./markdown";

const documents: DocumentDef[] = JSON.parse(
  readFileSync(path.join(__dirname, "..", "..", "documents.json"), "utf8"),
);
const sla = documents.find((doc) => doc.id === "sla")!;

const parties: Party[] = [
  { name: "Ada Lovelace", title: "CEO", company: "Acme Cloud", noticeAddress: "ada@acme.test" },
  { name: "", title: "", company: "Globex", noticeAddress: "" },
];

function marks(markdown: string, kind: Mark["kind"]): string[] {
  const found: string[] = [];
  const visit = (node: Nodes) => {
    if (node.type === "mark" && node.kind === kind) found.push(textContent(node));
    if ("children" in node) node.children.forEach(visit);
  };
  visit(parseMarkdown(markdown));
  return found;
}

describe("buildKeyTermsPage", () => {
  const page = buildKeyTermsPage(sla, [{ key: "targetUptime", value: "99.9%" }], parties);

  it("fills answered fields and parties", () => {
    expect(marks(page, "field")).toEqual(["99.9%", "Ada Lovelace", "CEO", "Acme Cloud", "Globex", "ada@acme.test"]);
  });

  it("prints unanswered fields as blanks with their hints", () => {
    const blanks = marks(page, "blank");
    expect(blanks).toContain("Credit when uptime is missed");
    expect(blanks).not.toContain("e.g. 99.9%");
  });

  it("heads the signature table with the party roles", () => {
    expect(page).toContain("|| PROVIDER | CUSTOMER |");
  });

  it("treats user input as text, not markdown or HTML", () => {
    const hostile = buildKeyTermsPage(sla, [{ key: "targetUptime", value: "| **x** <b>y</b>" }], parties);
    expect(marks(hostile, "field")[0]).toBe("| **x** <b>y</b>");
  });

  it("renders a page for every document", () => {
    for (const doc of documents) {
      const tree = parseMarkdown(buildKeyTermsPage(doc, [], parties));
      expect(textContent(tree)).not.toMatch(/<\/?(span|label)\b/);
    }
  });
});
