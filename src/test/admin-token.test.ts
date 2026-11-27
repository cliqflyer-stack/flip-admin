import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyFlyerExtraction,
  fetchLatestExtraction,
  startFlyerExtraction,
  createProduct,
  cropBannerArea,
  deleteFlyer,
  loginUser,
  TOKEN_KEY,
  UNAUTHORIZED_EVENT,
  uploadImage,
} from "@/lib/api-client";

function stubFetch(status = 200) {
  const mock = vi.fn(async (_url: string, _init?: RequestInit) =>
    Response.json({ success: true }, { status }),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

const authHeader = (init?: RequestInit) => new Headers(init?.headers).get("Authorization");

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("admin API calls", () => {
  it("sends the session token on write, upload, crop and extraction calls", async () => {
    localStorage.setItem(TOKEN_KEY, "test-token");
    const mock = stubFetch();

    await createProduct({ name: "Apples" });
    await deleteFlyer("flyer_1");
    await uploadImage(new File(["x"], "a.png", { type: "image/png" }));
    await cropBannerArea({ imageUrl: "/uploads/a.png", x: 0, y: 0, width: 1, height: 1 });
    await startFlyerExtraction("flyer_1");
    await fetchLatestExtraction("flyer_1");
    await applyFlyerExtraction("ex_1", [], false);

    expect(mock).toHaveBeenCalledTimes(7);
    for (const [, init] of mock.mock.calls) expect(authHeader(init)).toBe("Bearer test-token");
  });

  it("keeps the content type alongside the token", async () => {
    localStorage.setItem(TOKEN_KEY, "test-token");
    const mock = stubFetch();

    await createProduct({ name: "Apples" });

    expect(new Headers(mock.mock.calls[0]?.[1]?.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("announces a rejected session on 401", async () => {
    stubFetch(401);
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    await expect(deleteFlyer("flyer_1")).rejects.toThrow();

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it("does not treat a wrong password as an expired session", async () => {
    stubFetch(401);
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    await expect(loginUser("a@example.test", "wrong")).rejects.toThrow();

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });
});
