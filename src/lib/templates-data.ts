/**
 * Pre-defined retail flyer templates for Flip interactive flyers.
 * Each template includes aspect ratios, layout specs, and preset hotspot regions.
 */

export interface PresetHotspot {
  title: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlyerTemplate {
  id: string;
  title: string;
  category: "Grocery" | "Pharmacy" | "Hardware" | "Retail";
  description: string;
  aspectRatio: number;
  recommendedWidth: number;
  recommendedHeight: number;
  badgeText: string;
  badgeVariant: "lime" | "dark" | "outline";
  previewImageUrl: string;
  hotspotCount: number;
  defaultMerchantId: string;
  presetHotspots: PresetHotspot[];
}

export const TEMPLATES_LIBRARY: FlyerTemplate[] = [
  {
    id: "tpl_weekly_grocery",
    title: "Weekly Grocery Specials",
    category: "Grocery",
    description: "Standard retail layout featuring a top store banner and a 4-item bottom product deal grid.",
    aspectRatio: 1.414,
    recommendedWidth: 1200,
    recommendedHeight: 1697,
    badgeText: "WEEKLY DEALS",
    badgeVariant: "lime",
    previewImageUrl: "/uploads/flyers/full_drug_mart_flyer.png",
    hotspotCount: 4,
    defaultMerchantId: "merch_longos",
    presetHotspots: [
      {
        title: "Deal Slot 1 (Top Left)",
        category: "Beverages",
        x: 0.05,
        y: 0.165,
        width: 0.21,
        height: 0.08,
      },
      {
        title: "Deal Slot 2 (Top Mid-Left)",
        category: "Snacks",
        x: 0.28,
        y: 0.165,
        width: 0.21,
        height: 0.08,
      },
      {
        title: "Deal Slot 3 (Top Mid-Right)",
        category: "Beverages",
        x: 0.51,
        y: 0.165,
        width: 0.21,
        height: 0.08,
      },
      {
        title: "Deal Slot 4 (Top Right)",
        category: "Breakfast",
        x: 0.74,
        y: 0.165,
        width: 0.21,
        height: 0.08,
      },
    ],
  },
  {
    id: "tpl_pharmacy_wellness",
    title: "Pharmacy & Wellness Spotlight",
    category: "Pharmacy",
    description: "Ideal for health, vitamins, and personal care circulars with prominent circular tap targets.",
    aspectRatio: 1.414,
    recommendedWidth: 1200,
    recommendedHeight: 1697,
    badgeText: "OPTIMUM SAVINGS",
    badgeVariant: "lime",
    previewImageUrl: "/uploads/flyers/drug_mart_flyer.png",
    hotspotCount: 4,
    defaultMerchantId: "merch_drug_mart",
    presetHotspots: [
      {
        title: "Vitamins Spotlight",
        category: "Health & Vitamins",
        x: 0.08,
        y: 0.22,
        width: 0.19,
        height: 0.09,
      },
      {
        title: "Skin & Personal Care",
        category: "Personal Care",
        x: 0.31,
        y: 0.22,
        width: 0.19,
        height: 0.09,
      },
      {
        title: "Eye Health & Supplements",
        category: "Health & Vitamins",
        x: 0.54,
        y: 0.22,
        width: 0.19,
        height: 0.09,
      },
      {
        title: "Digestive & Cold Relief",
        category: "Medicine",
        x: 0.77,
        y: 0.22,
        width: 0.19,
        height: 0.09,
      },
    ],
  },
  {
    id: "tpl_mega_saver_matrix",
    title: "Supermarket 2×3 Deal Matrix",
    category: "Grocery",
    description: "High-density 6-product circular grid designed for maximum shopper interaction on mobile devices.",
    aspectRatio: 1.5,
    recommendedWidth: 1200,
    recommendedHeight: 1800,
    badgeText: "MEGA SAVER",
    badgeVariant: "dark",
    previewImageUrl: "/uploads/flyers/longos_flyer.png",
    hotspotCount: 6,
    defaultMerchantId: "merch_longos",
    presetHotspots: [
      { title: "Row 1 Left", category: "Produce", x: 0.08, y: 0.15, width: 0.4, height: 0.12 },
      { title: "Row 1 Right", category: "Bakery", x: 0.52, y: 0.15, width: 0.4, height: 0.12 },
      { title: "Row 2 Left", category: "Dairy", x: 0.08, y: 0.35, width: 0.4, height: 0.12 },
      { title: "Row 2 Right", category: "Meat", x: 0.52, y: 0.35, width: 0.4, height: 0.12 },
      { title: "Row 3 Left", category: "Snacks", x: 0.08, y: 0.55, width: 0.4, height: 0.12 },
      { title: "Row 3 Right", category: "Beverages", x: 0.52, y: 0.55, width: 0.4, height: 0.12 },
    ],
  },
  {
    id: "tpl_hardware_home",
    title: "Home & Hardware Specials",
    category: "Hardware",
    description: "Designed for seasonal home improvement, tools, and garden flyers with spacious product cards.",
    aspectRatio: 1.4,
    recommendedWidth: 1200,
    recommendedHeight: 1680,
    badgeText: "SPRING PROMO",
    badgeVariant: "outline",
    previewImageUrl: "/uploads/flyers/hardware_flyer.png",
    hotspotCount: 3,
    defaultMerchantId: "merch_hardware",
    presetHotspots: [
      { title: "Hero Center Tool", category: "Hardware", x: 0.1, y: 0.18, width: 0.8, height: 0.22 },
      { title: "Left Accessory", category: "Hardware", x: 0.08, y: 0.5, width: 0.4, height: 0.18 },
      { title: "Right Accessory", category: "Household", x: 0.52, y: 0.5, width: 0.4, height: 0.18 },
    ],
  },
  {
    id: "tpl_flash_sale_showcase",
    title: "Weekend Flash Sale Banner",
    category: "Retail",
    description: "Compact 1:1 square flyer with high-urgency callouts suitable for social feeds and app banners.",
    aspectRatio: 1.0,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    badgeText: "48-HOUR FLASH",
    badgeVariant: "lime",
    previewImageUrl: "/uploads/flyers/sample_flyer.jpg",
    hotspotCount: 4,
    defaultMerchantId: "merch_longos",
    presetHotspots: [
      { title: "Flash Item A", category: "Snacks", x: 0.08, y: 0.1, width: 0.38, height: 0.38 },
      { title: "Flash Item B", category: "Beverages", x: 0.54, y: 0.1, width: 0.38, height: 0.38 },
      { title: "Flash Item C", category: "Breakfast", x: 0.08, y: 0.54, width: 0.38, height: 0.38 },
      { title: "Flash Item D", category: "Household", x: 0.54, y: 0.54, width: 0.38, height: 0.38 },
    ],
  },
];
