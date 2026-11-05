import { describe, expect, it } from "vitest";
import type { StoreLocation, ApiFlyer } from "@/lib/api-client";

describe("Store Locations & Dynamic Flyer Preview", () => {
  const mockLocation: StoreLocation = {
    id: "loc_downtown_01",
    merchantId: "fresh_market",
    name: "Downtown Flagship",
    address: "100 Main St, Suite 4",
    city: "Toronto",
    state: "ON",
    postalCode: "M5V 2N8",
    phone: "416-555-0199",
    latitude: 43.6532,
    longitude: -79.3832,
    isActive: true,
  };

  const chainWideFlyer: ApiFlyer = {
    id: "flyer_chain_01",
    merchantId: "fresh_market",
    title: "Weekly Super Deals",
    description: "Chain-wide flyer across all franchise locations",
    pdfUrl: "https://example.com/flyer.pdf",
    totalPages: 4,
    validFrom: "2026-11-01T00:00:00Z",
    validTo: "2026-11-07T23:59:59Z",
    status: "published",
    storeLocationId: null,
  };

  const storeWiseFlyer: ApiFlyer = {
    id: "flyer_store_01",
    merchantId: "fresh_market",
    title: "Downtown Specials",
    description: "Exclusive to Downtown branch",
    pdfUrl: "https://example.com/flyer-downtown.pdf",
    totalPages: 2,
    validFrom: "2026-11-01T00:00:00Z",
    validTo: "2026-11-07T23:59:59Z",
    status: "published",
    storeLocationId: "loc_downtown_01",
    storeLocation: mockLocation,
  };

  it("differentiates chain-wide flyers from store-wise flyers", () => {
    expect(chainWideFlyer.storeLocationId).toBeNull();
    expect(chainWideFlyer.storeLocation).toBeUndefined();

    expect(storeWiseFlyer.storeLocationId).toBe("loc_downtown_01");
    expect(storeWiseFlyer.storeLocation?.name).toBe("Downtown Flagship");
    expect(storeWiseFlyer.storeLocation?.city).toBe("Toronto");
  });

  it("filters flyers by store location correctly", () => {
    const allFlyers = [chainWideFlyer, storeWiseFlyer];

    // Filter for Downtown Flagship
    const downtownFlyers = allFlyers.filter(
      (f) => !f.storeLocationId || f.storeLocationId === "loc_downtown_01"
    );
    expect(downtownFlyers.length).toBe(2); // Should include chain-wide + downtown

    // Filter for another location
    const suburbFlyers = allFlyers.filter(
      (f) => !f.storeLocationId || f.storeLocationId === "loc_suburb_99"
    );
    expect(suburbFlyers.length).toBe(1);
    expect(suburbFlyers[0].id).toBe("flyer_chain_01");
  });
});
