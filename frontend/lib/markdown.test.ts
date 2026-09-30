import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Nodes } from "mdast";
import { describe, expect, it } from "vitest";
import { parseMarkdown, textContent, type Mark } from "./markdown";

const TEMPLATES_DIR = path.join(__dirname, "..", "..", "templates");
const templates = readdirSync(TEMPLATES_DIR).filter((file) => file.endsWith(".md"));

function terms(markdown: string): string[] {
  const found: string[] = [];
  const visit = (node: Nodes) => {
    if (node.type === "mark" && (node as Mark).kind === "term") found.push(textContent(node));
    if ("children" in node) node.children.forEach(visit);
  };
  visit(parseMarkdown(markdown));
  return found;
}

describe("parseMarkdown on the Common Paper templates", () => {
  it.each(templates)("leaves no raw markup in %s", (file) => {
    const tree = parseMarkdown(readFileSync(path.join(TEMPLATES_DIR, file), "utf8"));
    expect(textContent(tree)).not.toMatch(/<\/?(span|label)\b/);
    expect(JSON.stringify(tree)).not.toContain('"type":"code"');
  });

  it("marks every kind of variable reference and section title as a term", () => {
    const markdown = [
      '<span class="keyterms_link">Governing Law</span>',
      '<span class="orderform_link" id="1">Order Date</span>',
      '<span class="businessterms_link">Territory</span>',
      '<span class="sow_link">Fees</span>',
      '<span class="header_2" id="2">Service</span>',
      '<span class="header_3">Support.</span>',
    ].join(" ");
    expect(terms(markdown)).toEqual(["Governing Law", "Order Date", "Territory", "Fees", "Service", "Support."]);
  });

  it("drops anchor spans but keeps what they wrap", () => {
    const tree = parseMarkdown('<span id="3.1"></span>Each party <span id="11.2">**"Affiliate"**</span> means');
    expect(textContent(tree)).toBe('Each party "Affiliate" means');
    expect(JSON.stringify(tree)).toContain('"type":"strong"');
    expect(JSON.stringify(tree)).not.toContain('"type":"mark"');
  });
});
