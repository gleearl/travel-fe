import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api/http";
import { SignIn } from "./SignIn";

const support = vi.hoisted(() => ({ webauthn: true, autofill: false }));
const auth = vi.hoisted(() => ({ signIn: vi.fn(), signInWithPasskey: vi.fn() }));

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: () => support.webauthn,
  browserSupportsWebAuthnAutofill: () => Promise.resolve(support.autofill),
}));

vi.mock("../lib/api/passkeys", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api/passkeys")>()),
  cancelPasskeyPrompt: vi.fn(),
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: null, signIn: auth.signIn, signInWithPasskey: auth.signInWithPasskey }),
}));

function open() {
  render(
    <MemoryRouter initialEntries={["/sign-in"]}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  support.webauthn = true;
  support.autofill = false;
  auth.signIn.mockReset();
  auth.signInWithPasskey.mockReset().mockResolvedValue(undefined);
});

describe("signing in with a passkey", () => {
  it("offers a passkey button where the browser can use one", () => {
    open();
    expect(screen.getByRole("button", { name: "Sign in with a passkey" })).toBeInTheDocument();
  });

  it("leaves it out where the browser can't", () => {
    support.webauthn = false;
    open();
    expect(screen.queryByRole("button", { name: "Sign in with a passkey" })).not.toBeInTheDocument();
  });

  it("asks the device when it is pressed", async () => {
    const user = userEvent.setup();
    open();

    await user.click(screen.getByRole("button", { name: "Sign in with a passkey" }));

    expect(auth.signInWithPasskey).toHaveBeenCalledWith();
  });

  it("says nothing when the person closes the prompt", async () => {
    const user = userEvent.setup();
    auth.signInWithPasskey.mockRejectedValue(Object.assign(new Error("closed"), { name: "NotAllowedError" }));
    open();

    await user.click(screen.getByRole("button", { name: "Sign in with a passkey" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with a passkey" })).toBeEnabled();
  });

  it("points back to the password when the passkey is refused", async () => {
    const user = userEvent.setup();
    auth.signInWithPasskey.mockRejectedValue(new ApiError(422, "x", { passkey: ["refused"] }));
    open();

    await user.click(screen.getByRole("button", { name: "Sign in with a passkey" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That passkey isn't recognised. Try your password instead.",
    );
  });

  it("lets the browser list passkeys in the email field", async () => {
    support.autofill = true;
    open();

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username webauthn");
    await vi.waitFor(() => expect(auth.signInWithPasskey).toHaveBeenCalledWith({ autofill: true }));
  });
});
