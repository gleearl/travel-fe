import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareSheet } from "./ShareSheet";

const api = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), off: vi.fn() }));

vi.mock("../lib/api/sharing", () => ({
  getShareLink: (id: number) => api.get(id),
  setShareLink: (id: number, role: string) => api.set(id, role),
  turnOffShareLink: (id: number) => api.off(id),
  shareUrl: (token: string) => `https://travel.gleearl.com/s/${token}`,
}));

beforeEach(() => {
  api.get.mockReset().mockResolvedValue(null);
  api.set.mockReset().mockImplementation((_id, role) => Promise.resolve({ token: "tok123", role }));
  api.off.mockReset().mockResolvedValue(undefined);
});

describe("sharing a trip by link", () => {
  it("makes a link with the role picked", async () => {
    const user = userEvent.setup();
    render(<ShareSheet tripId={7} onClose={() => {}} />);

    await user.click(await screen.findByRole("radio", { name: /Can edit/ }));
    await user.click(screen.getByRole("button", { name: "Create link" }));

    expect(api.set).toHaveBeenCalledWith(7, "editor");
    expect(screen.getByLabelText("Link")).toHaveValue("https://travel.gleearl.com/s/tok123");
  });

  it("changes what an existing link allows without a new link", async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ token: "tok123", role: "viewer" });
    render(<ShareSheet tripId={7} onClose={() => {}} />);

    await user.click(await screen.findByRole("radio", { name: /Can edit/ }));

    expect(api.set).toHaveBeenCalledWith(7, "editor");
    expect(screen.getByLabelText("Link")).toHaveValue("https://travel.gleearl.com/s/tok123");
  });

  it("copies the link", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    api.get.mockResolvedValue({ token: "tok123", role: "viewer" });
    render(<ShareSheet tripId={7} onClose={() => {}} />);

    await user.click(await screen.findByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith("https://travel.gleearl.com/s/tok123");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("asks before turning the link off", async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ token: "tok123", role: "viewer" });
    render(<ShareSheet tripId={7} onClose={() => {}} />);

    await user.click(await screen.findByRole("button", { name: "Turn off link" }));
    expect(api.off).not.toHaveBeenCalled();
    expect(screen.getByText(/stops working for everyone/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Turn off link" }));

    expect(api.off).toHaveBeenCalledWith(7);
    expect(await screen.findByRole("button", { name: "Create link" })).toBeInTheDocument();
  });
});
