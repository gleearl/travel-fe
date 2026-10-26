import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "./Account";

const api = vi.hoisted(() => ({ list: vi.fn(), add: vi.fn(), remove: vi.fn() }));

vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthn: () => true }));

vi.mock("../lib/api/passkeys", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api/passkeys")>()),
  listPasskeys: () => api.list(),
  addPasskey: (name: string) => api.add(name),
  removePasskey: (id: number) => api.remove(id),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "Glee Earl", email: "glee@example.com" }, signOut: vi.fn() }),
}));

const IPHONE = { id: 1, name: "iPhone", createdAt: "2026-10-01T09:00:00Z", lastUsedAt: "2026-10-20T09:00:00Z" };

function open() {
  render(
    <MemoryRouter>
      <Account />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.list.mockReset().mockResolvedValue([IPHONE]);
  api.add.mockReset();
  api.remove.mockReset().mockResolvedValue(undefined);
});

describe("the account page", () => {
  it("lists passkeys with when they were added and last used", async () => {
    open();

    expect(await screen.findByText("iPhone")).toBeInTheDocument();
    expect(screen.getByText(/Added Oct 1, 2026/)).toHaveTextContent("Last used Oct 20, 2026");
  });

  it("says what a passkey is for when there are none", async () => {
    api.list.mockResolvedValue([]);
    open();

    expect(await screen.findByText(/No passkeys yet/)).toBeInTheDocument();
  });

  it("adds one under the name typed", async () => {
    const user = userEvent.setup();
    api.add.mockResolvedValue({ id: 2, name: "Work laptop", createdAt: "2026-10-26T09:00:00Z", lastUsedAt: null });
    open();
    await screen.findByText("iPhone");

    const field = screen.getByLabelText("Name this passkey");
    await user.clear(field);
    await user.type(field, "Work laptop");
    await user.click(screen.getByRole("button", { name: "Add a passkey" }));

    expect(api.add).toHaveBeenCalledWith("Work laptop");
    expect(await screen.findByText("Work laptop")).toBeInTheDocument();
    expect(screen.getByText(/Never used/)).toBeInTheDocument();
  });

  it("says so when this device already has one", async () => {
    const user = userEvent.setup();
    api.add.mockRejectedValue({ code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" });
    open();
    await screen.findByText("iPhone");

    await user.click(screen.getByRole("button", { name: "Add a passkey" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This device already has a passkey for your account.");
  });

  it("asks before removing one, then removes it", async () => {
    const user = userEvent.setup();
    open();
    const row = (await screen.findByText("iPhone")).closest("li")!;

    await user.click(within(row).getByRole("button", { name: "Remove iPhone" }));
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(within(row).getByRole("button", { name: "Remove" }));

    expect(api.remove).toHaveBeenCalledWith(1);
    expect(screen.queryByText("iPhone")).not.toBeInTheDocument();
  });
});
