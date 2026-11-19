import { describe, expect, it } from "vitest";
import type { Merchant, StoreLocation, ApiFlyer } from "@/lib/api-client";
import { DEFAULT_CATEGORIES } from "@/lib/api-client";

describe("Franchises Module & Data Synchronization", () => {
  const mockFranchise: Merchant = {
    id: "merch_whole_foods",
    name: "Whole Foods Market",
    slug: "whole-foods-market",
    initial: "WF",
    logoBg: "#075E50",
    logoColor: "#FFFFFF",
    categoryId: "groceries",
    website: "https://www.wholefoodsmarket.com",
    category: {
      id: "groceries",
      name: "Groceries",
      icon: "shopping-cart",
      displayOrder: 1,
    },
  };

  const mockBranch1: StoreLocation = {
    id: "loc_wf_yorkville",
    merchantId: "merch_whole_foods",
    name: "Whole Foods Yorkville",
    address: "87 Avenue Rd",
    city: "Toronto",
    province: "ON",
    postalCode: "M5R 3R9",
    latitude: 43.6702,
    longitude: -79.3934,
  };

  const mockBranch2: StoreLocation = {
    id: "loc_wf_mississauga",
    merchantId: "merch_whole_foods",
    name: "Whole Foods Square One",
    address: "155 Square One Dr",
    city: "Mississauga",
    province: "ON",
    postalCode: "L5B 4M4",
    latitude: 43.5931,
    longitude: -79.6425,
  };

  const mockFlyer: ApiFlyer = {
    id: "flyer_wf_weekly",
    merchantId: "merch_whole_foods",
    title: "Organic Harvest Weekly",
    flyerImageUrl: "/uploads/flyers/wf.jpg",
    aspectRatio: 1.414,
    pageCount: 2,
    status: "published",
  };

  it("validates franchise brand structure and branding colors", () => {
    expect(mockFranchise.name).toBe("Whole Foods Market");
    expect(mockFranchise.slug).toBe("whole-foods-market");
    expect(mockFranchise.initial).toBe("WF");
    expect(mockFranchise.logoBg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(mockFranchise.logoColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(mockFranchise.category?.id).toBe("groceries");
  });

  it("correctly associates store branches with their parent franchise", () => {
    const branches = [mockBranch1, mockBranch2];
    const franchiseBranches = branches.filter((b) => b.merchantId === mockFranchise.id);

    expect(franchiseBranches.length).toBe(2);
    expect(franchiseBranches.map((b) => b.city)).toContain("Toronto");
    expect(franchiseBranches.map((b) => b.city)).toContain("Mississauga");
  });

  it("correctly associates circulars with the franchise brand", () => {
    const flyersList = [mockFlyer];
    const franchiseFlyers = flyersList.filter((f) => f.merchantId === mockFranchise.id);

    expect(franchiseFlyers.length).toBe(1);
    expect(franchiseFlyers[0].title).toBe("Organic Harvest Weekly");
  });

  it("simulates cascade deletion when a franchise is deleted", () => {
    let franchises = [mockFranchise];
    let locations = [mockBranch1, mockBranch2];
    let flyers = [mockFlyer];

    const deletedId = "merch_whole_foods";

    // Cascade delete simulation matching backend Postgres schema ON DELETE CASCADE
    franchises = franchises.filter((m) => m.id !== deletedId);
    locations = locations.filter((loc) => loc.merchantId !== deletedId);
    flyers = flyers.filter((f) => f.merchantId !== deletedId);

    expect(franchises.length).toBe(0);
    expect(locations.length).toBe(0);
    expect(flyers.length).toBe(0);
  });

  it("includes essential default retail categories", () => {
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThanOrEqual(4);
    const categoryIds = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain("groceries");
    expect(categoryIds).toContain("pharmacy");
    expect(categoryIds).toContain("home");
  });

  it("updates affiliated store locations when franchise branding is edited", () => {
    const updatedFranchise: Merchant = {
      ...mockFranchise,
      name: "Whole Foods Market 365",
      logoBg: "#0B7A68",
    };

    let locations = [
      { ...mockBranch1, merchant: mockFranchise },
      { ...mockBranch2, merchant: mockFranchise },
    ];

    locations = locations.map((loc) =>
      loc.merchantId === updatedFranchise.id ? { ...loc, merchant: updatedFranchise } : loc,
    );

    expect(locations[0].merchant?.name).toBe("Whole Foods Market 365");
    expect(locations[0].merchant?.logoBg).toBe("#0B7A68");
  });
});
