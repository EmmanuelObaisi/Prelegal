// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import SignInGate from "./SignInGate";

afterEach(cleanup);

function renderGate() {
  render(
    <SignInGate>
      <p>Inside the platform</p>
    </SignInGate>,
  );
}

describe("SignInGate", () => {
  it("shows the sign-in screen and hides the platform at first", () => {
    renderGate();
    expect(screen.getByRole("heading", { name: "Sign in to Prelegal" })).toBeTruthy();
    expect(screen.queryByText("Inside the platform")).toBeNull();
  });

  it("lets the user in on submit without checking credentials", async () => {
    renderGate();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "anything");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Inside the platform")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Sign in to Prelegal" })).toBeNull();
  });

  it("requires an email and password before submitting", async () => {
    renderGate();
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.queryByText("Inside the platform")).toBeNull();
  });
});
