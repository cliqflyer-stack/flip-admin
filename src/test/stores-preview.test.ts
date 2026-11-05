import { describe, expect, it } from "vitest";
import type { StoreLocation, ApiFlyer, ApiProduct } from "@/lib/api-client";
import { PRODUCT_PRESET_IMAGES } from "@/lib/api-client";

describe("Store Locations & Dynamic Flyer Preview", () => {
  const mockLocation: StoreLocation = {
    id: "loc_downtown_01",
    merchantId: "fresh_market",
    name: "Downtown Flagship",
    address: "100 Main St, Suite 4",
    city: "Toronto",
    province: "ON",
    postalCode: "M5V 2N8",
    phone: "416-555-0199",
    latitude: 43.6532,
    longitude: -79.3832,
  };

  const chainWideFlyer: ApiFlyer = {
    id: "flyer_chain_01",
    merchantId: "fresh_market",
    title: "Weekly Super Deals",
    flyerImageUrl: "/uploads/flyers/flyer.jpg",
    aspectRatio: 1.414,
    pageCount: 1,
    status: "published",
    storeLocationId: null,
  };

  const storeWiseFlyer: ApiFlyer = {
    id: "flyer_store_01",
    merchantId: "fresh_market",
    title: "Downtown Specials",
    flyerImageUrl: "/uploads/flyers/flyer-downtown.jpg",
    aspectRatio: 1.414,
    pageCount: 1,
    status: "published",
    storeLocationId: "loc_downtown_01",
    storeLocation: mockLocation,
  };

  const sampleProduct: ApiProduct = {
    id: "prod_lays_classic",
    name: "Lay's Classic Potato Chips 220g",
    brand: "Lay's",
    category: "Snacks",
    unit: "220g",
    sku: "06563345",
    regularPrice: "4.99",
    offerPrice: "3.49",
    description: "Classic potato chips with signature crunch",
    imageUrl: "/uploads/products/lays.jpg",
  };

  it("differentiates chain-wide flyers from store-wise flyers", () => {
    expect(chainWideFlyer.storeLocationId).toBeNull();
    expect(chainWideFlyer.storeLocation).toBeUndefined();

    expect(storeWiseFlyer.storeLocationId).toBe("loc_downtown_01");
    expect(storeWiseFlyer.storeLocation?.name).toBe("Downtown Flagship");
    expect(storeWiseFlyer.storeLocation?.city).toBe("Toronto");
  });

  it("validates store GPS coordinates for map visibility", () => {
    expect(mockLocation.latitude).toBeDefined();
    expect(mockLocation.longitude).toBeDefined();
    expect(mockLocation.latitude!).toBeGreaterThanOrEqual(-90);
    expect(mockLocation.latitude!).toBeLessThanOrEqual(90);
    expect(mockLocation.longitude!).toBeGreaterThanOrEqual(-180);
    expect(mockLocation.longitude!).toBeLessThanOrEqual(180);
  });

  it("calculates product deal savings percentage correctly", () => {
    const reg = parseFloat(String(sampleProduct.regularPrice));
    const off = parseFloat(String(sampleProduct.offerPrice));
    const savings = Math.round(((reg - off) / reg) * 100);

    expect(savings).toBe(30);
    expect(sampleProduct.unit).toBe("220g");
    expect(sampleProduct.sku).toBe("06563345");
  });

  it("has valid product image presets", () => {
    expect(PRODUCT_PRESET_IMAGES.length).toBeGreaterThanOrEqual(5);
    PRODUCT_PRESET_IMAGES.forEach((p) => {
      expect(p.label).toBeDefined();
      expect(p.url).toMatch(/^\/uploads\/products\/.+\.jpg$/);
    });
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
