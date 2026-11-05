import { describe, expect, it } from "vitest";
import { DEMO_CREDENTIALS } from "@/lib/auth-context";
import { TEMPLATES_LIBRARY } from "@/lib/templates-data";

describe("Admin Authentication & Templates", () => {
  it("provides valid demo credentials", () => {
    expect(DEMO_CREDENTIALS.email).toBe("admin@flip.local");
    expect(DEMO_CREDENTIALS.password).toBe("FlipAdmin2026!");
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
