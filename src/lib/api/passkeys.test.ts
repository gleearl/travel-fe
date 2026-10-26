import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearToken, getToken } from "./http";
import { addPasskey, alreadyRegistered, listPasskeys, signInWithPasskey, wasCancelled } from "./passkeys";

const device = vi.hoisted(() => ({
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
  cancelCeremony: vi.fn(),
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: device.startAuthentication,
  startRegistration: device.startRegistration,
  WebAuthnAbortService: { cancelCeremony: device.cancelCeremony },
}));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearToken();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  device.startAuthentication.mockReset().mockResolvedValue({ id: "cred-1", response: {} });
  device.startRegistration.mockReset().mockResolvedValue({ id: "cred-2", response: {} });
});

afterEach(() => vi.unstubAllGlobals());

const body = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);

describe("signing in with a passkey", () => {
  it("asks for a challenge, has the device sign it, and keeps the token it gets back", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ceremony: "c1", options: { challenge: "abc" } }))
      .mockResolvedValueOnce(json({ token: "t-1", user: { id: 3, name: "Glee", email: "g@x" } }));

    const user = await signInWithPasskey();

    expect(fetchMock.mock.calls[0][0]).toContain("/api/passkeys/sign-in/options");
    expect(device.startAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: "abc" }, useBrowserAutofill: false });
    expect(fetchMock.mock.calls[1][0]).toContain("/api/passkeys/sign-in");
    expect(body(1)).toEqual({ ceremony: "c1", credential: { id: "cred-1", response: {} } });
    expect(user.name).toBe("Glee");
    expect(getToken()).toBe("t-1");
  });

  it("waits on the email field's suggestions when asked to", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ceremony: "c1", options: {} }))
      .mockResolvedValueOnce(json({ token: "t", user: { id: 1, name: "", email: "" } }));

    await signInWithPasskey({ autofill: true });

    expect(device.startAuthentication).toHaveBeenCalledWith(expect.objectContaining({ useBrowserAutofill: true }));
  });

  it("sends nothing on when the person closes the prompt", async () => {
    fetchMock.mockResolvedValueOnce(json({ ceremony: "c1", options: {} }));
    device.startAuthentication.mockRejectedValue(Object.assign(new Error("closed"), { name: "NotAllowedError" }));

    await expect(signInWithPasskey()).rejects.toSatisfy(wasCancelled);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getToken()).toBeNull();
  });
});

describe("the account's passkeys", () => {
  it("adds one under the name given", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/api/passkeys/options")
          ? json({ ceremony: "c2", options: { challenge: "xyz" } })
          : json({ data: { id: 9, name: "Mac", created_at: "2026-10-26T10:00:00Z", last_used_at: null } }, 201),
      ),
    );

    const passkey = await addPasskey("Mac");

    expect(device.startRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: "xyz" } });
    expect(body(1)).toEqual({ ceremony: "c2", credential: { id: "cred-2", response: {} }, name: "Mac" });
    expect(passkey).toEqual({ id: 9, name: "Mac", createdAt: "2026-10-26T10:00:00Z", lastUsedAt: null });
  });

  it("lists them", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [{ id: 1, name: "iPhone", created_at: null, last_used_at: null }] }));

    expect(await listPasskeys()).toEqual([{ id: 1, name: "iPhone", createdAt: null, lastUsedAt: null }]);
  });

  it("recognises a device that already has one", () => {
    expect(alreadyRegistered({ code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" })).toBe(true);
    expect(alreadyRegistered(new Error("other"))).toBe(false);
  });
});
