import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/useAuth";
import { ApiError } from "../lib/api/http";
import { AcceptInvitation } from "./AcceptInvitation";

const readInvitation = vi.fn();
const acceptInvitation = vi.fn();
const me = vi.fn();

vi.mock("../lib/api/invitations", () => ({
  readInvitation: (token: string) => readInvitation(token),
  acceptInvitation: (token: string) => acceptInvitation(token),
}));

vi.mock("../lib/api/auth", () => ({
  me: () => me(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

const INVITATION = {
  tripName: "Japan 2026",
  invitedBy: "Glee Earl",
  role: "editor" as const,
  email: "ana@example.test",
  hasAccount: true,
};

beforeEach(() => {
  localStorage.clear();
  readInvitation.mockReset().mockResolvedValue(INVITATION);
  acceptInvitation.mockReset().mockResolvedValue(42);
  me.mockReset().mockResolvedValue(null);
});

/** Renders the screen; pass a user to arrive already signed in. */
function open(user: { id: number; name: string; email: string } | null = null) {
  if (user) {
    localStorage.setItem("fieldguide.token", "a-token");
    me.mockResolvedValue(user);
  }

  render(
    <MemoryRouter initialEntries={["/invitations/abc123"]}>
      <AuthProvider>
        <Routes>
          <Route path="/invitations/:token" element={<AcceptInvitation />} />
          <Route path="/trips/:id" element={<p>the trip screen</p>} />
          <Route path="/sign-in" element={<p>the sign in screen</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const ANA = { id: 4, name: "Ana Lopez", email: "ana@example.test" };

describe("landing on an invitation link", () => {
  it("names the trip and who sent it before asking for anything", async () => {
    /* Whoever clicked this may have no account at all. Asking them to sign in
       to see what they have been invited to would be asking them to trust a
       link they cannot read. */
    open();

    expect(await screen.findByText("Japan 2026")).toBeInTheDocument();
    expect(screen.getByText(/Glee Earl/)).toBeInTheDocument();
    expect(readInvitation).toHaveBeenCalledWith("abc123");
  });

  it("says what the invitation would let you do", async () => {
    open();

    expect(await screen.findByText(/add places/i)).toBeInTheDocument();
  });

  it("offers to sign in when that address already has an account", async () => {
    open();

    expect(await screen.findByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
  });

  it("offers to make an account when that address has none", async () => {
    readInvitation.mockResolvedValue({ ...INVITATION, hasAccount: false });
    open();

    expect(await screen.findByRole("link", { name: /create an account/i })).toBeInTheDocument();
  });

  it("accepts, and lands you on the trip", async () => {
    const user = userEvent.setup();
    open(ANA);

    await user.click(await screen.findByRole("button", { name: /accept/i }));

    expect(acceptInvitation).toHaveBeenCalledWith("abc123");
    expect(await screen.findByText("the trip screen")).toBeInTheDocument();
  });

  it("says which account an invitation was meant for", async () => {
    /* Signed in as somebody else — usually a forwarded email, or two accounts
       on one laptop. The API refuses it, and guessing why would be unkind. */
    open({ id: 5, name: "Bo Chen", email: "bo@example.test" });

    expect(await screen.findByText(/ana@example.test/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
  });

  it("explains an expired link rather than showing an error", async () => {
    readInvitation.mockRejectedValue(new ApiError(410, "That invitation has expired. Ask for a new one.", {}));
    open();

    expect(await screen.findByRole("heading", { name: /expired/i })).toBeInTheDocument();
    expect(screen.getByText(/ask whoever sent it/i)).toBeInTheDocument();
  });

  it("explains a link that has already been used or taken back", async () => {
    readInvitation.mockRejectedValue(new ApiError(404, "Not found.", {}));
    open();

    expect(await screen.findByRole("heading", { name: /no longer works/i })).toBeInTheDocument();
    expect(screen.getByText(/used already, or taken back/i)).toBeInTheDocument();
  });

  it("surfaces a refusal from the server rather than sitting silent", async () => {
    const user = userEvent.setup();
    acceptInvitation.mockRejectedValue(new ApiError(403, "This invitation was sent to someone else.", {}));
    open(ANA);

    await user.click(await screen.findByRole("button", { name: /accept/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This invitation was sent to someone else.");
  });
});
