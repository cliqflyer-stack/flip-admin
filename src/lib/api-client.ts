/**
 * Backend API Client for Snatchup Admin Portal
 * Connects directly to the Neon-backed Snatchup REST API.
 */

import type { Patch } from "@/lib/utils";

export const API_BASE = import.meta.env["VITE_API_URL"] || "https://flip-api-kdfp.onrender.com";

export const TOKEN_KEY = "flip_admin_token";
/** Fired when the API rejects the stored session, so the app can sign the user out. */
export const UNAUTHORIZED_EVENT = "flip:unauthorized";

/** `fetch` for admin-only endpoints: attaches the session token. */
async function adminFetch(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  return res;
}

export interface StoreLocation {
  id: string;
  merchantId: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  phone?: string | undefined;
  logoUrl?: string | undefined;
  privacyPolicyUrl?: string | null | undefined;
  termsUrl?: string | null | undefined;
  merchant?: Merchant | undefined;
  flyers?: ApiFlyer[] | undefined;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null | undefined;
  displayOrder?: number | null | undefined;
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  initial: string;
  logoBg: string;
  logoColor: string;
  logoUrl?: string | null | undefined;
  bannerUrl?: string | null | undefined;
  categoryId?: string | null | undefined;
  website?: string | null | undefined;
  privacyPolicyUrl?: string | null | undefined;
  termsUrl?: string | null | undefined;
  category?: Category | null | undefined;
  locations?: StoreLocation[] | undefined;
  flyers?: ApiFlyer[] | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface ApiProduct {
  id: string;
  merchantId?: string | null | undefined;
  name: string;
  brand: string;
  description: string;
  regularPrice: string | number;
  offerPrice: string | number;
  unit: string;
  category: string;
  sku?: string | null | undefined;
  upc?: string | null | undefined;
  options?: ProductOption[] | undefined;
  flyerId?: string | null | undefined;
  imageUrl: string;
  merchant?: Merchant | undefined;
  createdAt?: string | undefined;
}

export interface ProductOption {
  label: string;
  value: string;
}

export const PRODUCT_PRESET_IMAGES = [
  { label: "Coca-Cola", url: "/uploads/products/coca-cola.jpg" },
  { label: "Lay's Chips", url: "/uploads/products/lays.jpg" },
  { label: "Doritos Nacho", url: "/uploads/products/doritos.jpg" },
  { label: "Oreo Cookies", url: "/uploads/products/oreo.jpg" },
  { label: "Froot Loops", url: "/uploads/products/froot-loops.jpg" },
  { label: "Red Bull Energy", url: "/uploads/products/red-bull.jpg" },
  { label: "Tide Pods", url: "/uploads/products/tide.jpg" },
  { label: "Colgate Toothpaste", url: "/uploads/products/colgate.jpg" },
];

export interface ApiHotspot {
  id: string;
  flyerId: string;
  flyerPageId?: string | null | undefined;
  productId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  titleOverride?: string | null | undefined;
  priceOverride?: string | null | undefined;
  product?: ApiProduct | undefined;
}

export interface ApiFlyer {
  id: string;
  merchantId: string;
  storeLocationId?: string | null | undefined;
  title: string;
  subtitle?: string | undefined;
  badgeText?: string | undefined;
  badgeVariant?: string | undefined;
  flyerImageUrl: string;
  aspectRatio: number;
  status: "draft" | "published" | "archived";
  pageCount: number;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  validFrom?: string | null | undefined;
  validTo?: string | null | undefined;
  merchant?: Merchant | undefined;
  storeLocation?: StoreLocation | null | undefined;
  hotspots?: ApiHotspot[] | undefined;
}

export interface DashboardStats {
  flyers: number;
  products: number;
  merchants: number;
  franchises?: number | undefined;
  stores?: number | undefined;
  hotspots: number;
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/api/v1/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

export async function fetchFlyers(includeExpired = true): Promise<ApiFlyer[]> {
  const url = new URL(`${API_BASE}/api/v1/flyers`);
  if (includeExpired) {
    url.searchParams.set("includeExpired", "true");
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch flyers");
  return res.json();
}

export async function fetchFlyerById(id: string): Promise<ApiFlyer> {
  const res = await fetch(`${API_BASE}/api/v1/flyers/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch flyer ${id}`);
  return res.json();
}

export async function createFlyer(data: Patch<ApiFlyer>): Promise<ApiFlyer> {
  const res = await adminFetch(`${API_BASE}/api/v1/flyers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create flyer");
  return res.json();
}

export async function updateFlyer(id: string, data: Patch<ApiFlyer>): Promise<ApiFlyer> {
  const res = await adminFetch(`${API_BASE}/api/v1/flyers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update flyer");
  return res.json();
}

export async function deleteFlyer(id: string): Promise<{ success: boolean }> {
  const res = await adminFetch(`${API_BASE}/api/v1/flyers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete flyer");
  return res.json();
}

export async function saveHotspotsBatch(
  flyerId: string,
  hotspots: Array<{
    id?: string | undefined;
    productId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>,
): Promise<{ success: boolean; count: number; hotspots: ApiHotspot[] }> {
  const res = await adminFetch(`${API_BASE}/api/v1/flyers/${flyerId}/hotspots/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hotspots }),
  });
  if (!res.ok) throw new Error("Failed to save hotspots to database");
  return res.json();
}

export async function fetchProducts(query?: string, flyerId?: string): Promise<ApiProduct[]> {
  const url = new URL(`${API_BASE}/api/v1/products`);
  if (query) url.searchParams.set("q", query);
  if (flyerId) url.searchParams.set("flyerId", flyerId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function createProduct(data: Patch<ApiProduct>): Promise<ApiProduct> {
  const res = await adminFetch(`${API_BASE}/api/v1/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export async function updateProduct(id: string, data: Patch<ApiProduct>): Promise<ApiProduct> {
  const res = await adminFetch(`${API_BASE}/api/v1/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}

export async function deleteProduct(id: string): Promise<{ success: boolean; deletedId: string }> {
  const res = await adminFetch(`${API_BASE}/api/v1/products/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete product");
  return res.json();
}

export async function fetchMerchants(): Promise<Merchant[]> {
  const res = await fetch(`${API_BASE}/api/v1/merchants`);
  if (!res.ok) throw new Error("Failed to fetch merchants");
  return res.json();
}

export async function createMerchant(data: Patch<Merchant>): Promise<Merchant> {
  const slug =
    data.slug?.trim() ||
    data.name
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") ||
    `franchise-${Date.now().toString(36)}`;
  const initial = data.initial?.trim() || data.name?.trim().charAt(0).toUpperCase() || "F";
  const payload = {
    ...data,
    name: data.name?.trim(),
    slug,
    initial,
    logoBg: data.logoBg || "#075E50",
    logoColor: data.logoColor || "#FFFFFF",
  };
  const res = await adminFetch(`${API_BASE}/api/v1/merchants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to create franchise brand");
  }
  return res.json();
}

export async function updateMerchant(id: string, data: Patch<Merchant>): Promise<Merchant> {
  const payload: Patch<Merchant> = { ...data };
  if (data.name) payload.name = data.name.trim();
  if (data.slug) payload.slug = data.slug.trim();
  if (data.initial) payload.initial = data.initial.trim();
  const res = await adminFetch(`${API_BASE}/api/v1/merchants/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to update franchise brand");
  }
  return res.json();
}

export async function deleteMerchant(id: string): Promise<{ success: boolean; deletedId: string }> {
  const res = await adminFetch(`${API_BASE}/api/v1/merchants/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to delete franchise brand");
  }
  return res.json();
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "groceries", name: "Groceries", icon: "shopping-cart", displayOrder: 1 },
  { id: "pharmacy", name: "Pharmacy & Health", icon: "heart", displayOrder: 2 },
  { id: "home", name: "Home & Hardware", icon: "home", displayOrder: 3 },
  { id: "beauty", name: "Beauty", icon: "smile", displayOrder: 4 },
  { id: "latest", name: "Latest Deals", icon: "zap", displayOrder: 5 },
  { id: "for_you", name: "General", icon: "sparkles", displayOrder: 6 },
];

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/categories`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {
    // Fallback to presets
  }
  return DEFAULT_CATEGORIES;
}

export async function createCategory(data: Patch<Category>): Promise<Category> {
  const id =
    data.id?.trim() ||
    data.name
      ?.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "") ||
    `cat_${Date.now().toString(36)}`;

  const res = await adminFetch(`${API_BASE}/api/v1/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      id,
      name: data.name?.trim(),
      icon: data.icon || "tag",
      displayOrder: data.displayOrder ?? 0,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to create category");
  }
  return res.json();
}

export async function updateCategory(id: string, data: Patch<Category>): Promise<Category> {
  const res = await adminFetch(`${API_BASE}/api/v1/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to update category");
  }
  return res.json();
}

export async function deleteCategory(id: string): Promise<{ success: boolean; deletedId: string }> {
  const res = await adminFetch(`${API_BASE}/api/v1/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to delete category");
  }
  return res.json();
}

export async function fetchStoreLocations(merchantId?: string): Promise<StoreLocation[]> {
  const url = new URL(`${API_BASE}/api/v1/store-locations`);
  if (merchantId) url.searchParams.set("merchantId", merchantId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch store locations");
  return res.json();
}

export async function createStoreLocation(data: Patch<StoreLocation>): Promise<StoreLocation> {
  const res = await adminFetch(`${API_BASE}/api/v1/store-locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create store location");
  return res.json();
}

export async function updateStoreLocation(
  id: string,
  data: Patch<StoreLocation>,
): Promise<StoreLocation> {
  const res = await adminFetch(`${API_BASE}/api/v1/store-locations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update store location");
  return res.json();
}

export async function deleteStoreLocation(id: string): Promise<{ success: boolean }> {
  const res = await adminFetch(`${API_BASE}/api/v1/store-locations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete store location");
  return res.json();
}

export async function uploadImage(file: File): Promise<{ success: boolean; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await adminFetch(`${API_BASE}/api/v1/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload image");
  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  phone?: string | null | undefined;
  avatarUrl?: string | null | undefined;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  token: string;
}

export async function loginUser(
  email: string,
  password: string,
  adminOnly = true,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, adminOnly }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Authentication failed");
  }
  return data;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  name: string;
  phone?: string | undefined;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Registration failed");
  }
  return data;
}

export async function fetchCurrentUser(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to verify session");
  }
  return data;
}

export function isFlyerExpired(flyer: ApiFlyer): boolean {
  if (!flyer.validTo) return false;
  return new Date(flyer.validTo) < new Date();
}

export function isFlyerScheduled(flyer: ApiFlyer): boolean {
  if (!flyer.validFrom) return false;
  return new Date(flyer.validFrom) > new Date();
}

export function isFlyerActive(flyer: ApiFlyer): boolean {
  return flyer.status === "published" && !isFlyerExpired(flyer) && !isFlyerScheduled(flyer);
}

export interface FlyerExpiryInfo {
  status: "active" | "expired" | "scheduled" | "no-expiry" | "draft" | "archived";
  badgeLabel: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  daysRemaining?: number | undefined;
  formattedExpiry?: string | undefined;
  formattedValidFrom?: string | undefined;
  isExpired: boolean;
  isVisibleToShoppers: boolean;
}

export function getFlyerExpiryInfo(flyer: ApiFlyer): FlyerExpiryInfo {
  const now = new Date();
  const isExpired = isFlyerExpired(flyer);
  const isScheduled = isFlyerScheduled(flyer);

  const formattedExpiry = flyer.validTo
    ? new Date(flyer.validTo).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  const formattedValidFrom = flyer.validFrom
    ? new Date(flyer.validFrom).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  if (flyer.status === "draft") {
    return {
      status: "draft",
      badgeLabel: "Draft",
      badgeVariant: "secondary",
      formattedExpiry,
      formattedValidFrom,
      isExpired,
      isVisibleToShoppers: false,
    };
  }

  if (flyer.status === "archived") {
    return {
      status: "archived",
      badgeLabel: "Archived",
      badgeVariant: "secondary",
      formattedExpiry,
      formattedValidFrom,
      isExpired,
      isVisibleToShoppers: false,
    };
  }

  if (isExpired) {
    return {
      status: "expired",
      badgeLabel: "Expired · Hidden",
      badgeVariant: "destructive",
      formattedExpiry,
      formattedValidFrom,
      isExpired: true,
      isVisibleToShoppers: false,
    };
  }

  if (isScheduled) {
    return {
      status: "scheduled",
      badgeLabel: formattedValidFrom ? `Starts ${formattedValidFrom}` : "Scheduled",
      badgeVariant: "outline",
      formattedExpiry,
      formattedValidFrom,
      isExpired: false,
      isVisibleToShoppers: false,
    };
  }

  if (flyer.validTo) {
    const validToDate = new Date(flyer.validTo);
    const diffMs = validToDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const label =
      daysRemaining === 0
        ? "Expires today"
        : daysRemaining === 1
          ? "Expires tomorrow"
          : daysRemaining <= 7
            ? `${daysRemaining} days left`
            : `Until ${formattedExpiry}`;

    return {
      status: "active",
      badgeLabel: label,
      badgeVariant: "default",
      daysRemaining,
      formattedExpiry,
      formattedValidFrom,
      isExpired: false,
      isVisibleToShoppers: true,
    };
  }

  return {
    status: "no-expiry",
    badgeLabel: "Active · No Expiry",
    badgeVariant: "outline",
    formattedExpiry: undefined,
    formattedValidFrom,
    isExpired: false,
    isVisibleToShoppers: true,
  };
}

/**
 * Format date string into YYYY-MM-DD for <input type="date" />
 */
export function formatIsoDateOnly(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0] ?? "";
  } catch {
    return "";
  }
}

/**
 * Convert a YYYY-MM-DD date input string into an ISO string at end of that day (23:59:59.999)
 */
export function toEndOfDayIso(dateStr: string): string {
  if (!dateStr) return "";
  const [year = 0, month = 1, day = 1] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, 23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Convert a YYYY-MM-DD date input string into an ISO string at start of that day (00:00:00.000)
 */
export function toStartOfDayIso(dateStr: string): string {
  if (!dateStr) return "";
  const [year = 0, month = 1, day = 1] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Calculate future date string YYYY-MM-DD from today
 */
export function getRelativeDateString(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the end date of current month in YYYY-MM-DD
 */
export function getEndOfCurrentMonthString(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Resolves an image URL: if relative (like /uploads/...), prepends API_BASE
 */
export function resolveImageUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
    return url;
  }
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface DealSearchResult {
  id: string;
  productId: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  regularPrice: string | number;
  offerPrice: string | number;
  unit: string;
  productImageUrl: string;
  hasHotspot: boolean;
  hotspotId?: string | undefined;
  flyerId?: string | undefined;
  flyerTitle?: string | undefined;
  flyerImageUrl?: string | undefined;
  merchantId?: string | null | undefined;
  merchantName?: string | undefined;
  merchantLogoBg?: string | undefined;
  merchantLogoColor?: string | undefined;
  storeLocationId?: string | null | undefined;
  storeName?: string | undefined;
  x?: number | undefined;
  y?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  titleOverride?: string | null | undefined;
  priceOverride?: string | null | undefined;
}

export type ExtractionFlag =
  | "NO_NAME"
  | "AMBIGUOUS_PRICE"
  | "MULTI_BUY"
  | "PRICE_MISMATCH"
  | "SEVERAL_PRICES"
  | "LOW_OCR_CONFIDENCE"
  | "AI_READ";

export interface ExtractedItem {
  id: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  unit: string;
  offerPrice: number;
  regularPrice: number | null;
  badgeText: string;
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
  flags: ExtractionFlag[];
  needsReview: boolean;
  matchedProductId: string | null;
  applied: boolean;
}

export interface ExtractionJob {
  id: string;
  flyerId: string;
  status: "queued" | "processing" | "ready" | "applied" | "failed";
  imageUrl: string;
  items: ExtractedItem[];
  errorCode: string | null;
  errorMessage: string | null;
}

export type ExtractionSelection = Pick<
  ExtractedItem,
  "name" | "brand" | "description" | "category" | "unit" | "offerPrice" | "regularPrice" | "box"
> & { itemId: string; productId: string | null };

export const isExtractionRunning = (job: ExtractionJob | null | undefined) =>
  job?.status === "queued" || job?.status === "processing";

async function extractionRequest<T>(path: string, body?: object): Promise<T> {
  const res = await adminFetch(
    `${API_BASE}${path}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message ?? data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

/** Queues a flyer to be read. Returns the running job if there already is one. */
export async function startFlyerExtraction(flyerId: string, autoApply = false) {
  const { job } = await extractionRequest<{ job: ExtractionJob }>(
    `/api/v1/flyers/${encodeURIComponent(flyerId)}/extractions`,
    { autoApply },
  );
  return job;
}

export async function fetchLatestExtraction(flyerId: string) {
  const { job } = await extractionRequest<{ job: ExtractionJob | null }>(
    `/api/v1/flyers/${encodeURIComponent(flyerId)}/extractions/latest`,
  );
  return job;
}

export async function applyFlyerExtraction(
  jobId: string,
  items: ExtractionSelection[],
  replaceExisting: boolean,
) {
  return extractionRequest<{ applied: number; skipped: number }>(
    `/api/v1/flyer-extractions/${encodeURIComponent(jobId)}/apply`,
    { items, replaceExisting },
  );
}

/** Waits for the flyer's extraction to finish; returns the last state seen on timeout. */
export async function waitForExtraction(
  flyerId: string,
  { timeoutMs = 60_000, intervalMs = 2_000 } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let job = await fetchLatestExtraction(flyerId);
  while (isExtractionRunning(job) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    job = await fetchLatestExtraction(flyerId);
  }
  return job;
}

/**
 * Crops a bounding box area from a flyer image to create a clean product thumbnail.
 * Optionally updates the product's imageUrl in database if productId is provided.
 */
export async function cropBannerArea(params: {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  productId?: string | undefined;
}): Promise<{ success: boolean; url: string; filename: string; pixelWidth: number; pixelHeight: number }> {
  const res = await adminFetch(`${API_BASE}/api/v1/upload/crop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Crop failed: ${errorText}`);
  }
  return res.json();
}

/**
 * Searches products and active circular deals.
 * Returns matching products with flyer hotspot coordinates and cropped visual snippet coordinates.
 */
export async function searchDeals(params: {
  query: string;
  merchantId?: string | undefined;
  storeLocationId?: string | undefined;
  limit?: number | undefined;
}): Promise<{ query: string; count: number; results: DealSearchResult[] }> {
  const url = new URL(`${API_BASE}/api/v1/search/deals`);
  if (params.query) url.searchParams.set("q", params.query);
  if (params.merchantId) url.searchParams.set("merchantId", params.merchantId);
  if (params.storeLocationId) url.searchParams.set("storeLocationId", params.storeLocationId);
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("Search request failed");
  }
  return res.json();
}
