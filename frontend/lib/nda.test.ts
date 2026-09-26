import { readFileSync } from "node:fs";
import path from "node:path";
import type { Nodes } from "mdast";
import { describe, expect, it } from "vitest";
import { defaultNdaData, escapeMarkdown, fillCoverPage, formatDate, pdfFilename, type NdaData } from "./nda";
import { parseNdaMarkdown, textContent, type Mark } from "./nda-document";

const template = readFileSync(
  path.join(__dirname, "..", "..", "templates", "Mutual-NDA-coverpage.md"),
  "utf8",
);
const terms = readFileSync(path.join(__dirname, "..", "..", "templates", "Mutual-NDA.md"), "utf8");

const filledData: NdaData = {
  ...defaultNdaData,
  purpose: "Exploring a joint venture.",
  effectiveDate: "2026-10-02",
  mndaTermYears: "2",
  confidentialityYears: "3",
  governingLaw: "Delaware",
  jurisdiction: "courts located in New Castle, DE",
  parties: [
    { name: "Ada Lovelace", title: "CEO", company: "Acme, Inc.", noticeAddress: "ada@acme.test" },
    { name: "Alan Turing", title: "CTO", company: "Globex", noticeAddress: "1 Main St\nSpringfield" },
  ],
};

function marks(markdown: string, kind?: Mark["kind"]): string[] {
  const found: string[] = [];
  const visit = (node: Nodes) => {
    if (node.type === "mark" && (!kind || node.kind === kind)) found.push(textContent(node));
    if ("children" in node) node.children.forEach(visit);
  };
  visit(parseNdaMarkdown(markdown));
  return found;
}

function checkedItems(markdown: string): string[] {
  const found: string[] = [];
  const visit = (node: Nodes) => {
    if (node.type === "listItem" && node.checked) found.push(textContent(node).trim());
    if ("children" in node) node.children.forEach(visit);
  };
  visit(parseNdaMarkdown(markdown));
  return found;
}

describe("fillCoverPage", () => {
  it("fills every answer into the cover page", () => {
    expect(marks(fillCoverPage(template, filledData), "field")).toEqual([
      "Exploring a joint venture.",
      "October 2, 2026",
      "2 years",
      "3 years",
      "Delaware",
      "courts located in New Castle, DE",
      "None.",
      "Ada Lovelace",
      "Alan Turing",
      "CEO",
      "CTO",
      "Acme, Inc.",
      "Globex",
      "ada@acme.test",
      "1 Main St, Springfield",
    ]);
  });

  it("leaves no template placeholders behind", () => {
    const filled = fillCoverPage(template, filledData);
    expect(filled).not.toMatch(/\[(Today|Fill in|1 year)/);
    expect(filled).not.toContain("List any modifications");
  });

  it("ticks the fixed-term options by default", () => {
    expect(checkedItems(fillCoverPage(template, filledData))).toEqual([
      "Expires 2 years from Effective Date.",
      "3 years from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.",
    ]);
  });

  it("ticks the open-ended options when chosen", () => {
    const filled = fillCoverPage(template, {
      ...filledData,
      mndaTerm: "untilTerminated",
      confidentialityTerm: "perpetual",
    });
    expect(checkedItems(filled)).toEqual([
      "Continues until terminated in accordance with the terms of the MNDA.",
      "In perpetuity.",
    ]);
    expect(filled).not.toContain("2 years");
  });

  it("uses singular 'year' for one year", () => {
    expect(marks(fillCoverPage(template, { ...filledData, mndaTermYears: "1" }), "field")).toContain("1 year");
  });

  it("marks unanswered questions as blanks with hints", () => {
    const blanks = marks(fillCoverPage(template, { ...defaultNdaData, purpose: "", mndaTermYears: "" }), "blank");
    expect(blanks).toEqual(expect.arrayContaining(["How Confidential Information may be used", "Effective Date", "number of years", "State"]));
  });

  it("lists user modifications, preserving line breaks", () => {
    const filled = fillCoverPage(template, { ...filledData, modifications: "Section 5 is deleted.\nSection 9 applies." });
    expect(marks(filled, "field")).toContain("Section 5 is deleted.\nSection 9 applies.");
  });

  it("treats user input as text, not markdown or HTML", () => {
    const hostile = '**bold** | <script>alert(1)</script> [link](http://x) </span>';
    const filled = fillCoverPage(template, {
      ...filledData,
      purpose: hostile,
      parties: [{ ...filledData.parties[0], company: hostile }, filledData.parties[1]],
    });
    const fields = marks(filled, "field");
    expect(fields.filter((text) => text === hostile)).toHaveLength(2);
    const typesInsideFields = new Set<string>();
    const visit = (node: Nodes, inField: boolean) => {
      if (inField) typesInsideFields.add(node.type);
      if ("children" in node) {
        const isField = node.type === "mark" && node.kind === "field";
        node.children.forEach((child) => visit(child, inField || isField));
      }
    };
    visit(parseNdaMarkdown(filled), false);
    expect([...typesInsideFields]).toEqual(["text"]);
  });

  it("never matches a placeholder inside an earlier answer", () => {
    const filled = fillCoverPage(template, { ...filledData, purpose: "List any modifications to the MNDA" });
    const fields = marks(filled, "field");
    expect(fields[0]).toBe("List any modifications to the MNDA");
    expect(fields).toContain("None.");
    expect(filled.match(/List any modifications/g)).toHaveLength(1);
  });

  it("fails loudly if the template changes shape", () => {
    expect(() => fillCoverPage("# Something else", filledData)).toThrow(/template is missing/);
  });
});

describe("parseNdaMarkdown", () => {
  it("turns cover-page references in the standard terms into term marks", () => {
    expect(new Set(marks(terms, "term"))).toEqual(
      new Set(["Purpose", "Effective Date", "MNDA Term", "Term of Confidentiality", "Governing Law", "Jurisdiction"]),
    );
  });

  it("keeps unrecognised HTML as literal text", () => {
    const tree = parseNdaMarkdown('Hi <img src=x onerror="alert(1)"> there');
    expect(JSON.stringify(tree)).not.toContain('"type":"html"');
    expect(textContent(tree)).toBe('Hi <img src=x onerror="alert(1)"> there');
  });
});

describe("helpers", () => {
  it("escapes all markdown punctuation", () => {
    expect(escapeMarkdown("a*b_c|d<e")).toBe("a\\*b\\_c\\|d\\<e");
  });

  it("formats ISO dates without timezone drift", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
    expect(formatDate("")).toBe("");
  });

  it("names the PDF after the parties", () => {
    expect(pdfFilename(filledData)).toBe("Mutual-NDA-Acme-Inc-Globex.pdf");
    expect(pdfFilename(defaultNdaData)).toBe("Mutual-NDA.pdf");
    const [p1, p2] = filledData.parties;
    expect(pdfFilename({ ...filledData, parties: [{ ...p1, company: "Zürich Café AG" }, p2] })).toBe(
      "Mutual-NDA-Zürich-Café-AG-Globex.pdf",
    );
  });
});
