// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthScreen from "./AuthScreen";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ada = { id: 1, email: "ada@example.com" };

function stubFetch(response: Partial<Response>) {
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function submit(button: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse");
  await user.click(screen.getByRole("button", { name: button }));
}

describe("AuthScreen", () => {
  it("signs in with the entered credentials", async () => {
    const fetch = stubFetch({ ok: true, status: 200, json: async () => ada });
    const onSignedIn = vi.fn();
    render(<AuthScreen onSignedIn={onSignedIn} />);

    expect(screen.getByRole("heading", { name: "Sign in to Prelegal" })).toBeTruthy();
    await submit("Sign in");

    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(ada));
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/auth/signin");
    expect(JSON.parse(init.body)).toEqual({ email: "ada@example.com", password: "correct horse" });
  });

  it("switches to sign up and creates an account", async () => {
    const fetch = stubFetch({ ok: true, status: 201, json: async () => ada });
    const onSignedIn = vi.fn();
    render(<AuthScreen onSignedIn={onSignedIn} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Create an account" }));
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeTruthy();
    await submit("Create account");

    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(ada));
    expect(fetch.mock.calls[0][0]).toBe("/api/auth/signup");
  });

  it("shows the backend's message when sign in fails", async () => {
    stubFetch({ ok: false, status: 401, json: async () => ({ detail: "Incorrect email or password." }) });
    const onSignedIn = vi.fn();
    render(<AuthScreen onSignedIn={onSignedIn} />);

    await submit("Sign in");

    expect((await screen.findByRole("alert")).textContent).toBe("Incorrect email or password.");
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it("shows a plain message when the server fails without JSON", async () => {
    stubFetch({ ok: false, status: 500, json: async () => JSON.parse("Internal Server Error") });
    render(<AuthScreen onSignedIn={vi.fn()} />);

    await submit("Sign in");

    expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Please try again.");
  });
});
