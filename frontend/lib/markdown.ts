import type { Nodes, Parent, PhrasingContent, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmTaskListItemFromMarkdown } from "mdast-util-gfm-task-list-item";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";

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
export function escapeCell(text: string): string {
  return escapeMarkdown(text.trim().split(/\s*\n\s*/).join(", "));
}

/** A `field` marker around a filled value, or a `blank` marker carrying a hint when it is empty. */
export function field(value: string, hint: string, escape = escapeInline): string {
  return value.trim()
    ? `<span class="field">${escape(value)}</span>`
    : `<span class="blank">${escapeMarkdown(hint)}</span>`;
}

/**
 * What a recognised inline tag means:
 * - `field`: a value the user filled in
 * - `blank`: an answer the user has not given yet (children hold a hint)
 * - `term`: a defined term the Standard Terms reference, or a section title
 * - `hint`: the template's explanatory label under a heading
 */
export type MarkKind = "field" | "blank" | "term" | "hint";

export interface Mark extends Parent {
  type: "mark";
  kind: MarkKind;
  children: PhrasingContent[];
}

declare module "mdast" {
  interface PhrasingContentMap {
    mark: Mark;
  }
  interface RootContentMap {
    mark: Mark;
  }
}

const SPAN_KINDS: Record<string, MarkKind> = {
  field: "field",
  blank: "blank",
  coverpage_link: "term",
  keyterms_link: "term",
  orderform_link: "term",
  businessterms_link: "term",
  sow_link: "term",
  header_2: "term",
  header_3: "term",
};
const CLASS_SPAN = /^<span class="([\w-]+)"(?: id="[^"]*")?>$/;
const ANCHOR_SPAN = /^<span id="[^"]*">$/;
const CLOSE_TAGS = new Set(["</span>", "</label>"]);
const NO_INDENTED_CODE = { disable: { null: ["codeIndented"] } };

/** An anchor span is a transparent wrapper: its contents are kept, the tag is dropped. */
const ANCHOR = "anchor";

/** What an opening tag means, or undefined if it is not one we understand. */
function openTag(html: string): MarkKind | typeof ANCHOR | undefined {
  if (html === "<label>") return "hint";
  if (ANCHOR_SPAN.test(html)) return ANCHOR;
  const className = CLASS_SPAN.exec(html)?.[1];
  return className ? SPAN_KINDS[className] : undefined;
}

/**
 * Parses template markdown into an mdast tree shared by the screen and PDF renderers.
 *
 * Only the tags `openTag` recognises are understood; they become `mark` nodes
 * (anchors just unwrap). Any other HTML is kept as literal text, so nothing in
 * a template or in user input can reach the page as raw markup.
 *
 * Of GFM, only tables and task lists are enabled: the templates need nothing
 * else, and autolink literals would turn a typed email or URL into a link.
 *
 * Indented code is disabled: the templates contain no code, and some deeply
 * indented clauses (e.g. in the DPA) would otherwise be read as a code block.
 */
export function parseMarkdown(markdown: string): Root {
  const tree = fromMarkdown(markdown, {
    extensions: [gfmTable(), gfmTaskListItem(), NO_INDENTED_CODE],
    mdastExtensions: [gfmTableFromMarkdown(), gfmTaskListItemFromMarkdown()],
  });
  groupMarks(tree);
  return tree;
}

function groupMarks(node: Nodes): void {
  if (!("children" in node)) return;
  node.children.forEach(groupMarks);

  const root: Nodes[] = [];
  const stack: { kind: MarkKind | typeof ANCHOR; children: Nodes[] }[] = [];
  const current = () => stack.at(-1)?.children ?? root;

  for (const child of node.children) {
    const kind = child.type === "html" ? openTag(child.value) : undefined;
    if (child.type !== "html") {
      current().push(child);
    } else if (kind) {
      stack.push({ kind, children: [] });
    } else if (CLOSE_TAGS.has(child.value) && stack.length > 0) {
      const { kind, children } = stack.pop()!;
      if (kind === ANCHOR) current().push(...children);
      else current().push({ type: "mark", kind, children: children as PhrasingContent[] });
    } else {
      current().push({ type: "text", value: child.value });
    }
  }
  // An unclosed tag contributes its contents without the wrapper.
  while (stack.length > 0) {
    const { children } = stack.pop()!;
    current().push(...children);
  }

  (node as Parent).children = root as Parent["children"];
}

/** Concatenated text of a node, with line breaks as `\n`. */
export function textContent(node: Nodes): string {
  if (node.type === "break") return "\n";
  if ("value" in node) return node.value;
  if ("children" in node) return node.children.map(textContent).join("");
  return "";
}
