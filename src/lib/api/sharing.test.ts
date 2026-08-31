import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearToken } from "./http";
import { acceptInvitation, declineInvitation, fetchMyInvitations, invite, revokeInvitation } from "./invitations";
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
            { id: 7, role: "viewer", user: { id: 3, name: "Bo Chen" }, invited_by: { id: 1, name: "Glee Earl" } },
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
    expect(people.invitations).toMatchObject([
      { id: 7, role: "viewer", user: { id: 3, name: "Bo Chen" } },
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
  const RAW = {
    id: 7,
    role: "editor",
    user: { id: 3, name: "Bo Chen" },
    invited_by: { id: 1, name: "Glee Earl" },
    trip: {
      id: 3,
      name: "Japan 2026",
      destination: "Tokyo, Japan",
      start_date: "2026-03-04",
      end_date: "2026-03-18",
    },
  };

  it("sends one to an address, and reads back who it reached", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: RAW }));

    const invitation = await invite(3, "bo@example.test", "editor");

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/api/trips/3/invitations");
    expect(JSON.parse(init.body)).toEqual({ email: "bo@example.test", role: "editor" });
    expect(invitation.user).toEqual({ id: 3, name: "Bo Chen" });
  });

  it("reads what is waiting on you, with the trip and who asked", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [RAW] }));

    const [waiting] = await fetchMyInvitations();

    expect(fetchMock.mock.calls.at(-1)![0]).toContain("/api/invitations");
    expect(waiting.invitedBy).toEqual({ id: 1, name: "Glee Earl" });
    expect(waiting.trip).toEqual({
      id: 3,
      name: "Japan 2026",
      destination: "Tokyo, Japan",
      startDate: "2026-03-04",
      endDate: "2026-03-18",
    });
  });

  it("copes with a trip that has no dates or destination", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: [{ ...RAW, trip: { id: 3, name: "Someday" } }] }),
    );

    const [waiting] = await fetchMyInvitations();

    expect(waiting.trip.destination).toBe("");
    expect(waiting.trip.startDate).toBeNull();
  });

  it("hands back the trip it just let you onto, so the list can be refetched", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { trip_id: 42 } }));

    expect(await acceptInvitation(7)).toBe(42);

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/api/invitations/7/accept");
    expect(init.method).toBe("POST");
  });

  it("declines and revokes down the same route, which is the same row going", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await declineInvitation(7);
    expect(fetchMock.mock.calls.at(-1)![0]).toContain("/api/invitations/7");
    expect(fetchMock.mock.calls.at(-1)![1].method).toBe("DELETE");

    await revokeInvitation(7);
    expect(fetchMock.mock.calls.at(-1)![0]).toContain("/api/invitations/7");
    expect(fetchMock.mock.calls.at(-1)![1].method).toBe("DELETE");
  });
});
