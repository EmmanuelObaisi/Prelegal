import { Document, Link, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { List, ListItem, Nodes, Root, Table } from "mdast";
import type { ReactNode } from "react";
import type { Mark } from "@/lib/nda-document";

/**
 * Renders the same parsed NDA trees as `NdaDocument`, as a vector PDF.
 * Loaded on demand (it pulls in @react-pdf/renderer) when the user downloads.
 */

const INK = "#2446a8";
const MUTED = "#5b6472";
const RULE = "#c3cad4";
const TYPE = "#1a1d23";

const s = StyleSheet.create({
  page: { paddingVertical: 56, paddingHorizontal: 64, fontFamily: "Times-Roman", fontSize: 10.5, lineHeight: 1.4, color: TYPE },
  h1: { fontFamily: "Times-Bold", fontSize: 18, textAlign: "center", marginBottom: 18 },
  h2: { fontFamily: "Times-Bold", fontSize: 11.5, marginTop: 14, marginBottom: 6 },
  h3: { fontFamily: "Helvetica-Bold", fontSize: 9, color: MUTED, marginTop: 12, marginBottom: 2 },
  paragraph: { marginVertical: 4 },
  listItem: { flexDirection: "row", marginVertical: 4 },
  spreadItem: { marginVertical: 6 },
  number: { width: 20, fontFamily: "Times-Bold" },
  checkbox: { width: 8, height: 8, borderWidth: 0.75, borderColor: RULE, marginTop: 3.5, marginRight: 10, alignItems: "center", justifyContent: "center" },
  checkboxOn: { borderColor: INK },
  checkboxFill: { width: 4, height: 4, backgroundColor: INK },
  itemBody: { flex: 1 },
  unchecked: { color: MUTED },
  table: { marginVertical: 14 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: RULE, minHeight: 30 },
  headRow: { borderBottomColor: TYPE },
  cell: { flex: 1, paddingVertical: 6, paddingHorizontal: 4 },
  rowHeader: { flex: 1.2, fontFamily: "Helvetica", fontSize: 9 },
  headCell: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  center: { textAlign: "center" },
  strong: { fontFamily: "Times-Bold" },
  emphasis: { fontFamily: "Times-Italic" },
  link: { color: TYPE },
  field: { color: INK },
  hint: { fontFamily: "Helvetica", fontSize: 8, color: MUTED },
});

const BLANK = "________________";

/**
 * Forbids hyphenated line breaks on a block of text. Contracts read better
 * without broken words, and react-pdf would otherwise also insert a hyphen
 * where a bold run meets punctuation, as in **Confidential Information**”).
 */
const NO_HYPHENS = { hyphenationPenalty: 10_000 };

export function NdaPdf({ coverPage, standardTerms }: { coverPage: Root; standardTerms: Root }) {
  return (
    <Document title="Mutual Non-Disclosure Agreement" creator="Prelegal">
      <Page size="LETTER" style={s.page}>
        {blocks(coverPage.children)}
      </Page>
      <Page size="LETTER" style={s.page}>
        {blocks(standardTerms.children)}
      </Page>
    </Document>
  );
}

/** Block content; inside a list item, paragraphs drop their margins so they align with the marker. */
function blocks(nodes: Nodes[], inListItem = false): ReactNode[] {
  return nodes.map((node, key) => {
    switch (node.type) {
      case "heading":
        return (
          <Text key={key} style={[s.h1, s.h2, s.h3][node.depth - 1] ?? s.h3} minPresenceAhead={40} {...NO_HYPHENS}>
            {inline(node.children)}
          </Text>
        );
      case "paragraph":
        return (
          <Text key={key} style={inListItem ? undefined : s.paragraph} {...NO_HYPHENS}>
            {inline(node.children)}
          </Text>
        );
      case "list":
        return <View key={key}>{node.children.map((item, i) => listItem(node, item, i))}</View>;
      case "table":
        return table(node, key);
      default:
        return null;
    }
  });
}

function listItem(list: List, item: ListItem, key: number): ReactNode {
  const checkable = item.checked === true || item.checked === false;
  let marker: ReactNode = null;
  if (checkable) {
    marker = (
      <View style={item.checked ? [s.checkbox, s.checkboxOn] : s.checkbox}>
        {item.checked && <View style={s.checkboxFill} />}
      </View>
    );
  } else if (list.ordered) {
    marker = <Text style={s.number}>{(list.start ?? 1) + key}.</Text>;
  }
  return (
    <View key={key} style={list.spread ? [s.listItem, s.spreadItem] : s.listItem} wrap={!checkable}>
      {marker}
      <View style={[s.itemBody, ...(item.checked === false ? [s.unchecked] : [])]}>{blocks(item.children, true)}</View>
    </View>
  );
}

function table(node: Table, key: number): ReactNode {
  return (
    <View key={key} style={s.table} wrap={false}>
      {node.children.map((row, r) => (
        <View key={r} style={r === 0 ? [s.row, s.headRow] : s.row}>
          {node.children[0].children.map((_, i) => {
            const cell = row.children[i];
            const style = [
              s.cell,
              ...(i === 0 ? [s.rowHeader] : []),
              ...(r === 0 ? [s.headCell] : []),
              ...(node.align?.[i] === "center" ? [s.center] : []),
            ];
            return (
              <View key={i} style={style}>
                <Text {...NO_HYPHENS}>{cell && inline(cell.children)}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function inline(nodes: Nodes[]): ReactNode[] {
  return nodes.map((node, key) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "break":
        return "\n";
      case "strong":
        return <Text key={key} style={s.strong}>{inline(node.children)}</Text>;
      case "emphasis":
        return <Text key={key} style={s.emphasis}>{inline(node.children)}</Text>;
      case "link":
        return <Link key={key} src={node.url} style={s.link}>{inline(node.children)}</Link>;
      case "mark":
        return mark(node, key);
      default:
        return null;
    }
  });
}

function mark(node: Mark, key: number): ReactNode {
  switch (node.kind) {
    case "field":
      return <Text key={key} style={s.field}>{inline(node.children)}</Text>;
    case "blank":
      return BLANK;
    case "term":
      return <Text key={key} style={s.strong}>{inline(node.children)}</Text>;
    case "hint":
      // A hint after other text (e.g. in a table header) goes on its own line.
      return <Text key={key} style={s.hint}>{key > 0 && "\n"}{inline(node.children)}</Text>;
  }
}

/** Renders the NDA to a PDF and saves it through the browser. */
export async function downloadNdaPdf(coverPage: Root, standardTerms: Root, filename: string): Promise<void> {
  const blob = await pdf(<NdaPdf coverPage={coverPage} standardTerms={standardTerms} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
