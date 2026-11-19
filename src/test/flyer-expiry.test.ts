import { describe, expect, it } from "vitest";
import {
  isFlyerExpired,
  isFlyerScheduled,
  isFlyerActive,
  getFlyerExpiryInfo,
  formatIsoDateOnly,
  toEndOfDayIso,
  toStartOfDayIso,
  getRelativeDateString,
  getEndOfCurrentMonthString,
  type ApiFlyer,
} from "@/lib/api-client";

describe("Flyer Expiration & Validity Lifecycle", () => {
  const baseFlyer: ApiFlyer = {
    id: "flyer_test_101",
    merchantId: "merch_metro",
    title: "Metro Super Savings",
    flyerImageUrl: "/uploads/flyers/sample_flyer.jpg",
    aspectRatio: 1.414,
    status: "published",
    pageCount: 1,
  };

  it("identifies non-expiring flyers as active", () => {
    const perpetualFlyer: ApiFlyer = {
      ...baseFlyer,
      validTo: null,
      validFrom: null,
    };

    expect(isFlyerExpired(perpetualFlyer)).toBe(false);
    expect(isFlyerActive(perpetualFlyer)).toBe(true);

    const info = getFlyerExpiryInfo(perpetualFlyer);
    expect(info.status).toBe("no-expiry");
    expect(info.isVisibleToShoppers).toBe(true);
    expect(info.isExpired).toBe(false);
  });

  it("identifies past validTo dates as expired and hides them from shoppers", () => {
    // 2 days ago
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const expiredFlyer: ApiFlyer = {
      ...baseFlyer,
      validTo: pastDate,
    };

    expect(isFlyerExpired(expiredFlyer)).toBe(true);
    expect(isFlyerActive(expiredFlyer)).toBe(false);

    const info = getFlyerExpiryInfo(expiredFlyer);
    expect(info.status).toBe("expired");
    expect(info.isExpired).toBe(true);
    expect(info.isVisibleToShoppers).toBe(false);
    expect(info.badgeVariant).toBe("destructive");
  });

  it("identifies future validTo dates as active and visible to shoppers", () => {
    // 5 days in future
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const activeFlyer: ApiFlyer = {
      ...baseFlyer,
      validTo: futureDate,
    };

    expect(isFlyerExpired(activeFlyer)).toBe(false);
    expect(isFlyerActive(activeFlyer)).toBe(true);

    const info = getFlyerExpiryInfo(activeFlyer);
    expect(info.status).toBe("active");
    expect(info.isExpired).toBe(false);
    expect(info.isVisibleToShoppers).toBe(true);
    expect(info.daysRemaining).toBeGreaterThanOrEqual(4);
    expect(info.badgeVariant).toBe("default");
  });

  it("identifies future validFrom dates as scheduled", () => {
    // Starts in 3 days
    const futureFrom = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const futureTo = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const scheduledFlyer: ApiFlyer = {
      ...baseFlyer,
      validFrom: futureFrom,
      validTo: futureTo,
    };

    expect(isFlyerScheduled(scheduledFlyer)).toBe(true);
    expect(isFlyerExpired(scheduledFlyer)).toBe(false);
    expect(isFlyerActive(scheduledFlyer)).toBe(false); // Not active yet

    const info = getFlyerExpiryInfo(scheduledFlyer);
    expect(info.status).toBe("scheduled");
    expect(info.isVisibleToShoppers).toBe(false);
  });

  it("converts date input strings into end-of-day ISO (23:59:59.999)", () => {
    const dateStr = "2026-11-25";
    const eodIso = toEndOfDayIso(dateStr);
    const d = new Date(eodIso);

    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10); // 0-indexed November
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
  });

  it("converts date input strings into start-of-day ISO (00:00:00.000)", () => {
    const dateStr = "2026-11-25";
    const sodIso = toStartOfDayIso(dateStr);
    const d = new Date(sodIso);

    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it("calculates relative future dates correctly", () => {
    const in7Days = getRelativeDateString(7);
    expect(in7Days).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const targetDate = new Date(in7Days + "T12:00:00");
    const today = new Date();
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it("calculates end of current month date correctly", () => {
    const eom = getEndOfCurrentMonthString();
    expect(eom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [year, month, day] = eom.split("-").map(Number);
    expect(day).toBeGreaterThanOrEqual(28);
    expect(day).toBeLessThanOrEqual(31);
  });

  it("filters customer feed to hide expired flyers while admin view retains them", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const flyerList: ApiFlyer[] = [
      { ...baseFlyer, id: "f1", validTo: futureDate },
      { ...baseFlyer, id: "f2", validTo: pastDate },
      { ...baseFlyer, id: "f3", validTo: null },
    ];

    // Customer app view (excludes expired)
    const shopperView = flyerList.filter((f) => !isFlyerExpired(f) && f.status === "published");
    expect(shopperView.map((f) => f.id)).toEqual(["f1", "f3"]);

    // Admin view (includes all with expired indicators)
    const adminView = flyerList;
    expect(adminView.length).toBe(3);
    expect(isFlyerExpired(adminView.find((f) => f.id === "f2")!)).toBe(true);
  });
});
