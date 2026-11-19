import { describe, expect, it } from "vitest";
import { TEMPLATES_LIBRARY } from "@/lib/templates-data";
import { AuthProvider, useAuth } from "@/lib/auth-context";

describe("Admin Authentication & Templates", () => {
  it("exports authentication context providers", () => {
    expect(AuthProvider).toBeDefined();
    expect(useAuth).toBeDefined();
  });

  it("contains pre-configured retail flyer templates", () => {
    expect(TEMPLATES_LIBRARY.length).toBeGreaterThanOrEqual(5);

    TEMPLATES_LIBRARY.forEach((tpl) => {
      expect(tpl.id).toBeDefined();
      expect(tpl.title).toBeDefined();
      expect(tpl.aspectRatio).toBeGreaterThan(0);
      expect(tpl.presetHotspots.length).toBeGreaterThan(0);

      // Verify all preset hotspot coordinates are normalized between 0 and 1
      tpl.presetHotspots.forEach((h) => {
        expect(h.x).toBeGreaterThanOrEqual(0);
        expect(h.x).toBeLessThanOrEqual(1);
        expect(h.y).toBeGreaterThanOrEqual(0);
        expect(h.y).toBeLessThanOrEqual(1);
        expect(h.width).toBeGreaterThan(0);
        expect(h.width).toBeLessThanOrEqual(1);
        expect(h.height).toBeGreaterThan(0);
        expect(h.height).toBeLessThanOrEqual(1);
      });
    });
  });
});
