// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDraft } from "@/lib/chat";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ada = { id: 1, email: "ada@example.com" };
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const signedOut = { ok: false, status: 401, json: async () => ({ detail: "Please sign in." }) };

/** Answers each API path with a fixed response. */
function stubApi(routes: Record<string, Partial<Response>>) {
  const fetch = vi.fn(async (path: string) => routes[path]);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("App", () => {
  it("shows the sign-in screen when there is no session", async () => {
    stubApi({ "/api/auth/me": signedOut });
    render(<App documents={[]} ndaCoverPage="" />);
    expect(await screen.findByRole("heading", { name: "Sign in to Prelegal" })).toBeTruthy();
  });

  it("restores the session into My documents, then starts a new document", async () => {
    stubApi({ "/api/auth/me": ok(ada), "/api/documents": ok([]) });
    render(<App documents={[]} ndaCoverPage="" />);

    expect(await screen.findByRole("heading", { name: "My documents" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();

    const nav = within(screen.getByRole("navigation", { name: "Main" }));
    await userEvent.setup().click(nav.getByRole("button", { name: "New document" }));
    expect(screen.getByRole("heading", { name: "New document" })).toBeTruthy();
    expect(screen.getByLabelText("Message")).toBeTruthy();
  });

  it("reopens a saved draft under My documents", async () => {
    const summary = { id: 2, documentId: "sla", documentName: "Service Level Agreement", companies: [], updatedAt: "2026-09-30 12:00:00" };
    const saved = { id: 2, draft: { ...emptyDraft, documentId: "sla" }, messages: [{ role: "user", content: "An SLA please" }] };
    stubApi({ "/api/auth/me": ok(ada), "/api/documents": ok([summary]), "/api/documents/2": ok(saved) });
    render(<App documents={[]} ndaCoverPage="" />);

    await userEvent.setup().click(await screen.findByRole("button", { name: /Service Level Agreement/ }));

    expect(await screen.findByText("An SLA please")).toBeTruthy();
    const nav = within(screen.getByRole("navigation", { name: "Main" }));
    expect(nav.getByRole("button", { name: "My documents" }).getAttribute("aria-current")).toBe("page");
  });

  it("signs out back to the sign-in screen", async () => {
    const fetch = stubApi({
      "/api/auth/me": ok(ada),
      "/api/documents": ok([]),
      "/api/auth/signout": { ok: true, status: 204 },
    });
    render(<App documents={[]} ndaCoverPage="" />);

    await userEvent.setup().click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { name: "Sign in to Prelegal" })).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/api/auth/signout", expect.objectContaining({ method: "POST" }));
  });
});
