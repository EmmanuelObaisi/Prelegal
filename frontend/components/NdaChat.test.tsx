// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GREETING } from "@/lib/chat";
import { defaultNdaData, type NdaData } from "@/lib/nda";
import NdaChat from "./NdaChat";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const updated: NdaData = { ...defaultNdaData, governingLaw: "Delaware" };

function stubFetch(response: Partial<Response>) {
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderChat() {
  const onChange = vi.fn();
  render(<NdaChat data={defaultNdaData} onChange={onChange} />);
  return onChange;
}

describe("NdaChat", () => {
  it("greets the user without calling the assistant", () => {
    const fetch = stubFetch({ ok: true });
    renderChat();
    expect(screen.getByText(GREETING)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the conversation and fields, then shows the reply and updates the fields", async () => {
    const fetch = stubFetch({ ok: true, json: async () => ({ reply: "Delaware it is.", data: updated }) });
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
      data: defaultNdaData,
    });
  });

  it("sends on Enter", async () => {
    const fetch = stubFetch({ ok: true, json: async () => ({ reply: "Noted.", data: updated }) });
    renderChat();

    await userEvent.setup().type(screen.getByLabelText("Message"), "Hello{Enter}");

    expect(await screen.findByText("Noted.")).toBeTruthy();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("keeps the draft and fields when the assistant fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ ok: false, status: 502 });
    const onChange = renderChat();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Message"), "Use Delaware law");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("The assistant couldn’t reply. Try sending again.")).toBeTruthy();
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("Use Delaware law");
    expect(onChange).not.toHaveBeenCalled();
  });
});
