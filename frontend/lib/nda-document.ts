import type { Nodes, Parent, PhrasingContent, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmTaskListItemFromMarkdown } from "mdast-util-gfm-task-list-item";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";

/**
 * What a recognised inline tag means:
 * - `field`: a value the user filled in
 * - `blank`: an answer the user has not given yet (children hold a hint)
 * - `term`: a reference to a Cover Page term from the Standard Terms
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

const OPEN_TAGS: Record<string, MarkKind> = {
  '<span class="nda-field">': "field",
  '<span class="nda-blank">': "blank",
  '<span class="coverpage_link">': "term",
  "<label>": "hint",
};
const CLOSE_TAGS = new Set(["</span>", "</label>"]);

/**
 * Parses NDA markdown into an mdast tree shared by the screen and PDF renderers.
 *
 * Only the tags in `OPEN_TAGS` are understood; they become `mark` nodes. Any
 * other HTML is kept as literal text, so nothing in a template or in user
 * input can reach the page as raw markup.
 *
 * Of GFM, only tables and task lists are enabled: the templates need nothing
 * else, and autolink literals would turn a typed email or URL into a link.
 */
export function parseNdaMarkdown(markdown: string): Root {
  const tree = fromMarkdown(markdown, {
    extensions: [gfmTable(), gfmTaskListItem()],
    mdastExtensions: [gfmTableFromMarkdown(), gfmTaskListItemFromMarkdown()],
  });
  groupMarks(tree);
  return tree;
}

function groupMarks(node: Nodes): void {
  if (!("children" in node)) return;
  node.children.forEach(groupMarks);

  const root: Nodes[] = [];
  const stack: { kind: MarkKind; children: Nodes[] }[] = [];
  const current = () => stack.at(-1)?.children ?? root;

  for (const child of node.children) {
    if (child.type !== "html") {
      current().push(child);
    } else if (child.value in OPEN_TAGS) {
      stack.push({ kind: OPEN_TAGS[child.value], children: [] });
    } else if (CLOSE_TAGS.has(child.value) && stack.length > 0) {
      const { kind, children } = stack.pop()!;
      current().push({ type: "mark", kind, children: children as PhrasingContent[] });
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
