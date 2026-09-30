// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDraft, greeting, GREETING, type Draft } from "@/lib/chat";
import DocumentChat from "./DocumentChat";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const updated: Draft = { ...emptyDraft, documentId: "csa", fields: [{ key: "governingLaw", value: "Delaware" }] };

function stubFetch(response: Partial<Response>) {
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderChat() {
  const onChange = vi.fn();
  render(<DocumentChat draft={emptyDraft} onChange={onChange} />);
  return onChange;
}

describe("DocumentChat", () => {
  it("greets the user without calling the assistant", () => {
    const fetch = stubFetch({ ok: true });
    renderChat();
    expect(screen.getByText(GREETING)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the conversation and fields, then shows the reply and updates the fields", async () => {
    const fetch = stubFetch({ ok: true, json: async () => ({ reply: "Delaware it is.", draft: updated, savedId: 7 }) });
    const onChange = renderChat();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Message"), "Use Delaware law");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Delaware it is.")).toBeTruthy();
    expect(screen.getByText("Use Delaware law")).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(updated);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(JSON.parse(init.body)).toEqual({
      messages: [
        { role: "assistant", content: GREETING },
        { role: "user", content: "Use Delaware law" },
      ],
      draft: emptyDraft,
      savedId: null,
    });
  });

  it("sends on Enter", async () => {
    const fetch = stubFetch({ ok: true, json: async () => ({ reply: "Noted.", draft: updated, savedId: 7 }) });
    renderChat();

    await userEvent.setup().type(screen.getByLabelText("Message"), "Hello{Enter}");

    expect(await screen.findByText("Noted.")).toBeTruthy();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("keeps the draft and fields when the assistant fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ ok: false, status: 502, json: async () => ({ detail: "The assistant is unavailable." }) });
    const onChange = renderChat();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Message"), "Use Delaware law");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("The assistant couldn’t reply. Try sending again.")).toBeTruthy();
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("Use Delaware law");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sends back the saved id it was given on later turns", async () => {
    const fetch = stubFetch({ ok: true, json: async () => ({ reply: "Noted.", draft: updated, savedId: 7 }) });
    renderChat();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Message"), "First{Enter}");
    await screen.findByText("Noted.");
    await user.type(screen.getByLabelText("Message"), "Second{Enter}");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    expect(JSON.parse(fetch.mock.calls[1][1].body).savedId).toBe(7);
  });

  it("carries on a saved conversation", async () => {
    const fetch = stubFetch({ ok: true, json: async () => ({ reply: "Updated.", draft: updated, savedId: 3 }) });
    const messages = [...greeting(), { role: "user" as const, content: "A cloud service agreement" }];
    render(<DocumentChat draft={updated} onChange={vi.fn()} saved={{ id: 3, draft: updated, messages }} />);

    expect(screen.getByText("A cloud service agreement")).toBeTruthy();
    await userEvent.setup().type(screen.getByLabelText("Message"), "Use Delaware{Enter}");
    await screen.findByText("Updated.");

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.savedId).toBe(3);
    expect(body.messages).toHaveLength(3);
  });

  it("reports an ended session instead of an assistant failure", async () => {
    stubFetch({ ok: false, status: 401, json: async () => ({ detail: "Please sign in." }) });
    const onSignedOut = vi.fn();
    render(<DocumentChat draft={emptyDraft} onChange={vi.fn()} onSignedOut={onSignedOut} />);

    await userEvent.setup().type(screen.getByLabelText("Message"), "Hello{Enter}");

    await vi.waitFor(() => expect(onSignedOut).toHaveBeenCalledOnce());
  });
});
