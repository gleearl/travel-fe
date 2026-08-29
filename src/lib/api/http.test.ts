import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, clearToken, getToken, request, SESSION_ENDED, setToken } from "./http";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearToken();
  fetchMock = vi.fn().mockResolvedValue(json({ data: {} }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

describe("the token", () => {
  it("is attached to every call once it is set", async () => {
    setToken("abc123");
    await request("/api/trips");

    const [, init] = fetchMock.mock.calls.at(-1)!;
    expect(init.headers.Authorization).toBe("Bearer abc123");
  });

  it("is simply absent before sign-in, rather than sent empty", async () => {
    await request("/api/login", { method: "POST", body: {}, allowUnauthorized: true });

    const [, init] = fetchMock.mock.calls.at(-1)!;
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("survives a reload, because it is kept in storage", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
    expect(localStorage.getItem("fieldguide.token")).toBe("abc123");
  });
});

describe("failures", () => {
  it("carries Laravel's field errors so a form can show them", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ message: "The given data was invalid.", errors: { email: ["That email is taken."] } }, 422),
    );

    const error = await request("/api/register", { method: "POST", body: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldError("email")).toBe("That email is taken.");
  });

  it("drops a token the server has stopped accepting, and says so once", async () => {
    setToken("stale");
    const ended = vi.fn();
    window.addEventListener(SESSION_ENDED, ended);
    fetchMock.mockResolvedValueOnce(json({ message: "Unauthenticated." }, 401));

    await request("/api/trips").catch(() => {});

    expect(getToken()).toBeNull();
    expect(ended).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_ENDED, ended);
  });

  it("leaves the token alone when a 401 is the expected answer", async () => {
    /* Asking who is signed in when nobody is must not look like a session
       that just expired, or opening the app signed-out would announce it. */
    setToken("fresh");
    const ended = vi.fn();
    window.addEventListener(SESSION_ENDED, ended);
    fetchMock.mockResolvedValueOnce(json({ message: "Unauthenticated." }, 401));

    await request("/api/me", { allowUnauthorized: true }).catch(() => {});

    expect(getToken()).toBe("fresh");
    expect(ended).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_ENDED, ended);
  });

  it("treats a 204 as success with nothing in it", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(request("/api/places/1", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
