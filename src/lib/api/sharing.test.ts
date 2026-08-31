import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearToken } from "./http";
import { acceptInvitation, invite, readInvitation, revokeInvitation } from "./invitations";
import { fetchMembers, leaveTrip, removeMember, setMemberRole } from "./members";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearToken();
  fetchMock = vi.fn().mockResolvedValue(json({ data: {} }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("the people on a trip", () => {
  it("reads the owner, the members, and anyone still invited", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: {
          owner: { id: 1, name: "Glee Earl", role: "owner", email: "glee@example.test" },
          members: [{ id: 2, name: "Ana Lopez", role: "editor", email: "ana@example.test" }],
          invitations: [
            { id: 7, email: "bo@example.test", role: "viewer", expires_at: "2026-09-14T00:00:00+00:00" },
          ],
        },
      }),
    );

    const people = await fetchMembers(3);

    expect(fetchMock.mock.calls.at(-1)![0]).toContain("/api/trips/3/members");
    expect(people.owner).toMatchObject({ id: 1, name: "Glee Earl", role: "owner" });
    expect(people.members).toEqual([
      { id: 2, name: "Ana Lopez", role: "editor", email: "ana@example.test" },
    ]);
    expect(people.invitations).toEqual([
      { id: 7, email: "bo@example.test", role: "viewer", expiresAt: "2026-09-14T00:00:00+00:00" },
    ]);
  });

  it("copes with a member list carrying no emails, which is what a non-owner gets", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { owner: { id: 1, name: "Glee", role: "owner" }, members: [], invitations: [] } }),
    );

    const people = await fetchMembers(3);

    expect(people.owner.email).toBeUndefined();
    expect(people.invitations).toEqual([]);
  });

  it("changes a role, removes somebody, and leaves", async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 2, name: "Ana", role: "viewer" } }));

    await setMemberRole(3, 2, "viewer");
    let [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/api/trips/3/members/2");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ role: "viewer" });

    await removeMember(3, 2);
    [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/api/trips/3/members/2");
    expect(init.method).toBe("DELETE");

    await leaveTrip(3);
    [url, init] = fetchMock.mock.calls.at(-1)!;
    /* Its own path, not .../members/me — see the API's routes file for why. */
    expect(url).toContain("/api/trips/3/membership");
    expect(init.method).toBe("DELETE");
  });
});

describe("invitations", () => {
  it("sends one", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { id: 7, email: "bo@example.test", role: "editor", expires_at: "2026-09-14T00:00:00+00:00" } }),
    );

    const invitation = await invite(3, "bo@example.test", "editor");

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/api/trips/3/invitations");
    expect(JSON.parse(init.body)).toEqual({ email: "bo@example.test", role: "editor" });
    expect(invitation.expiresAt).toBe("2026-09-14T00:00:00+00:00");
  });

  it("reads what a link points at, before anybody has signed in", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        data: {
          trip_name: "Japan 2026",
          invited_by: "Glee Earl",
          role: "editor",
          email: "bo@example.test",
          has_account: true,
        },
      }),
    );

    expect(await readInvitation("abc123")).toEqual({
      tripName: "Japan 2026",
      invitedBy: "Glee Earl",
      role: "editor",
      email: "bo@example.test",
      hasAccount: true,
    });
  });

  it("escapes the token rather than pasting it into a URL", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { trip_name: "T", invited_by: "G", role: "viewer", email: "a@b.c", has_account: false } }));

    await readInvitation("ab/cd?e");

    expect(fetchMock.mock.calls.at(-1)![0]).toContain("ab%2Fcd%3Fe");
  });

  it("hands back the trip it just let you onto, so the app can go there", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { trip_id: 42 } }));

    expect(await acceptInvitation("abc123")).toBe(42);
    expect(fetchMock.mock.calls.at(-1)![1].method).toBe("POST");
  });

  it("revokes one", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await revokeInvitation(7);

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/api/invitations/7");
    expect(init.method).toBe("DELETE");
  });
});
