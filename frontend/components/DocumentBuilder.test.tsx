// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDraft, type Draft } from "@/lib/chat";
import type { DocumentDef } from "@/lib/documents";
import DocumentBuilder from "./DocumentBuilder";

const ROOT = path.join(__dirname, "..", "..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const documents = (JSON.parse(read("documents.json")) as DocumentDef[]).map((doc) => ({
  ...doc,
  standardTerms: read(`templates/${doc.file}`),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const acme = { name: "Ada Lovelace", title: "CEO", company: "Acme Cloud", noticeAddress: "ada@acme.test" };

async function chooseDocument(draft: Draft) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reply: "Sure.", draft }) }));
  render(<DocumentBuilder documents={documents} ndaCoverPage={read("templates/Mutual-NDA-coverpage.md")} />);
  await userEvent.setup().type(screen.getByLabelText("Message"), "Hello{Enter}");
  await screen.findByText("Sure.");
}

describe("DocumentBuilder", () => {
  it("shows no agreement or download until a document is chosen", () => {
    render(<DocumentBuilder documents={documents} ndaCoverPage="" />);
    expect(screen.getByText(/Your agreement will appear here/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Download PDF" })).toBeNull();
  });

  it("shows the chosen document's key terms and standard terms", async () => {
    await chooseDocument({
      ...emptyDraft,
      documentId: "sla",
      parties: [acme, emptyDraft.parties[1]],
      fields: [{ key: "targetUptime", value: "99.95%" }],
    });

    expect(screen.getAllByText("Service Level Agreement").length).toBeGreaterThan(0);
    expect(screen.getByText("99.95%")).toBeTruthy();
    expect(screen.getByText("Acme Cloud")).toBeTruthy();
    expect(screen.getByLabelText("Standard terms").textContent).toContain("Target Uptime");
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy();
  });

  it("fills the Mutual NDA cover page, including the shared parties", async () => {
    await chooseDocument({
      ...emptyDraft,
      documentId: "mutual-nda",
      nda: { ...emptyDraft.nda, governingLaw: "California" },
      parties: [acme, emptyDraft.parties[1]],
    });

    const coverPage = screen.getByLabelText("Cover page");
    expect(coverPage.textContent).toContain("California");
    expect(coverPage.textContent).toContain("Acme Cloud");
  });
});
