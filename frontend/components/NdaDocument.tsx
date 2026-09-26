import type { List, ListItem, Nodes, Root, Table } from "mdast";
import type { ReactNode } from "react";
import type { Mark } from "@/lib/nda-document";

/** Renders a parsed NDA tree as a sheet of paper. */
export default function NdaDocument({ tree, label }: { tree: Root; label: string }) {
  return (
    <article
      aria-label={label}
      className="bg-paper mx-auto w-full max-w-[46rem] px-6 py-10 font-serif text-[1.0625rem] leading-[1.65] shadow-[0_1px_2px_rgb(26_29_35/0.08),0_12px_32px_-12px_rgb(26_29_35/0.25)] sm:px-14 sm:py-16"
    >
      {renderChildren(tree.children)}
    </article>
  );
}

function renderChildren(nodes: Nodes[], tight = false): ReactNode[] {
  return nodes.map((node, i) => renderNode(node, i, tight));
}

function renderNode(node: Nodes, key: number, tight: boolean): ReactNode {
  switch (node.type) {
    case "heading": {
      const styles = {
        1: "mb-8 text-center text-[1.75rem] leading-tight font-semibold",
        2: "mt-8 mb-3 text-base font-semibold tracking-wide",
        3: "mt-7 mb-1 font-sans text-sm font-semibold text-muted",
      } as const;
      const Tag = `h${node.depth}` as "h1" | "h2" | "h3";
      return (
        <Tag key={key} className={styles[node.depth as 1 | 2 | 3] ?? styles[3]}>
          {renderChildren(node.children)}
        </Tag>
      );
    }
    case "paragraph": {
      // A paragraph holding only a hint sits snug under its heading.
      const onlyHint = node.children.length === 1 && node.children[0].type === "mark" && node.children[0].kind === "hint";
      return tight ? (
        <span key={key}>{renderChildren(node.children)}</span>
      ) : (
        <p key={key} className={onlyHint ? "mb-2" : "my-3 text-pretty"}>
          {renderChildren(node.children)}
        </p>
      );
    }
    case "list":
      return renderList(node, key);
    case "table":
      return renderTable(node, key);
    case "mark":
      return renderMark(node, key);
    case "strong":
      return <strong key={key}>{renderChildren(node.children)}</strong>;
    case "emphasis":
      return <em key={key}>{renderChildren(node.children)}</em>;
    case "link":
      return (
        <a key={key} href={node.url} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-2">
          {renderChildren(node.children)}
        </a>
      );
    case "break":
      return <br key={key} />;
    case "text":
      return node.value;
    default:
      return null;
  }
}

function renderList(list: List, key: number): ReactNode {
  const items = list.children.map((item, i) => renderListItem(item, i, !list.spread));
  if (list.ordered) {
    return (
      <ol key={key} start={list.start ?? 1} className="my-4 list-decimal space-y-3 pl-6 marker:font-semibold">
        {items}
      </ol>
    );
  }
  return (
    <ul key={key} className="my-2 space-y-1.5">
      {items}
    </ul>
  );
}

function renderListItem(item: ListItem, key: number, tight: boolean): ReactNode {
  if (item.checked === null || item.checked === undefined) {
    return (
      <li key={key} className="pl-1">
        {renderChildren(item.children, tight)}
      </li>
    );
  }
  return (
    <li key={key} className={`flex gap-3 ${item.checked ? "" : "text-muted"}`}>
      <span
        role="img"
        aria-label={item.checked ? "Selected" : "Not selected"}
        className={`mt-[0.3em] grid size-[1em] shrink-0 place-items-center border ${
          item.checked ? "border-ink text-ink" : "border-rule"
        }`}
      >
        {item.checked && <span className="size-[0.5em] bg-ink" />}
      </span>
      <span>{renderChildren(item.children, true)}</span>
    </li>
  );
}

function renderTable(table: Table, key: number): ReactNode {
  const [head, ...body] = table.children;
  const align = (i: number) => (table.align?.[i] === "center" ? "text-center" : "text-left");
  return (
    <div key={key} className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-[0.95rem]">
        <thead>
          <tr className="border-b border-type">
            {head.children.map((cell, i) => (
              <th key={i} scope="col" className={`px-2 py-2 font-sans text-sm font-semibold ${align(i)}`}>
                {renderChildren(cell.children)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-b border-rule">
              {head.children.map((_, i) => {
                const cell = row.children[i];
                return i === 0 ? (
                  <th key={i} scope="row" className="w-[34%] px-2 py-3 text-left align-top font-sans text-sm font-medium">
                    {cell && renderChildren(cell.children)}
                  </th>
                ) : (
                  <td key={i} className={`h-12 px-2 py-3 align-top ${align(i)}`}>
                    {cell && renderChildren(cell.children)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMark(mark: Mark, key: number): ReactNode {
  const children = renderChildren(mark.children);
  switch (mark.kind) {
    case "field":
      return (
        <span key={key} className="text-ink">
          {children}
        </span>
      );
    case "blank":
      return (
        <span
          key={key}
          className="inline-block min-w-[6em] border-b border-dashed border-ink/60 font-sans text-[0.8em] text-muted italic"
        >
          {children}
        </span>
      );
    case "term":
      return (
        <span key={key} className="font-semibold">
          {children}
        </span>
      );
    case "hint":
      return (
        <span key={key} className="block font-sans text-[0.8rem] font-normal text-muted">
          {children}
        </span>
      );
  }
}
