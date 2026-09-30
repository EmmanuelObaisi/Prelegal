// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDraft } from "@/lib/chat";
import DocumentsList from "./DocumentsList";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const summary = {
  id: 5,
  documentId: "csa",
  documentName: "Cloud Service Agreement",
  companies: ["Acme", "Globex"],
  updatedAt: "2026-09-30 12:00:00",
};
const saved = { id: 5, draft: { ...emptyDraft, documentId: "csa" }, messages: [] };

function renderList(...responses: Partial<Response>[]) {
  const fetch = vi.fn();
  responses.forEach((response) => fetch.mockResolvedValueOnce(response));
  vi.stubGlobal("fetch", fetch);
  const props = { onOpen: vi.fn(), onNewDocument: vi.fn(), onSignedOut: vi.fn() };
  render(<DocumentsList {...props} />);
  return { fetch, ...props };
}

describe("DocumentsList", () => {
  it("offers a new document when there are none", async () => {
    const { onNewDocument } = renderList({ ok: true, status: 200, json: async () => [] });

    expect(await screen.findByText("No documents yet")).toBeTruthy();
    await userEvent.setup().click(screen.getAllByRole("button", { name: "New document" })[1]);
    expect(onNewDocument).toHaveBeenCalledOnce();
  });

  it("lists saved drafts and opens the one clicked", async () => {
    const { fetch, onOpen } = renderList(
      { ok: true, status: 200, json: async () => [summary] },
      { ok: true, status: 200, json: async () => saved },
    );

    expect(await screen.findByText("Acme and Globex")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: /Cloud Service Agreement/ }));

    await vi.waitFor(() => expect(onOpen).toHaveBeenCalledWith(saved));
    expect(fetch.mock.calls[1][0]).toBe("/api/documents/5");
  });

  it("reports an ended session", async () => {
    const { onSignedOut } = renderList({ ok: false, status: 401, json: async () => ({ detail: "Please sign in." }) });
    await vi.waitFor(() => expect(onSignedOut).toHaveBeenCalledOnce());
  });
});
