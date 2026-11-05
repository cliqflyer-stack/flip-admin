/**
 * Backend API Client for Flip Admin Portal
 * Connects directly to the Neon-backed Flip REST API.
 */

export const API_BASE =
  import.meta.env.VITE_API_URL || 'https://flip-api-kdfp.onrender.com';

export interface StoreLocation {
  id: string;
  merchantId: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  logoUrl?: string;
  merchant?: Merchant;
  flyers?: ApiFlyer[];
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  initial: string;
  logoBg: string;
  logoColor: string;
  logoUrl?: string;
  bannerUrl?: string;
  categoryId?: string;
  website?: string;
  locations?: StoreLocation[];
}

export interface ApiProduct {
  id: string;
  merchantId?: string | null;
  name: string;
  brand: string;
  description: string;
  regularPrice: string | number;
  offerPrice: string | number;
  unit: string;
  category: string;
  sku?: string | null;
  imageUrl: string;
  merchant?: Merchant;
  createdAt?: string;
}

export const PRODUCT_PRESET_IMAGES = [
  { label: 'Coca-Cola', url: '/uploads/products/coca-cola.jpg' },
  { label: 'Lay\'s Chips', url: '/uploads/products/lays.jpg' },
  { label: 'Doritos Nacho', url: '/uploads/products/doritos.jpg' },
  { label: 'Oreo Cookies', url: '/uploads/products/oreo.jpg' },
  { label: 'Froot Loops', url: '/uploads/products/froot-loops.jpg' },
  { label: 'Red Bull Energy', url: '/uploads/products/red-bull.jpg' },
  { label: 'Tide Pods', url: '/uploads/products/tide.jpg' },
  { label: 'Colgate Toothpaste', url: '/uploads/products/colgate.jpg' },
];

export interface ApiHotspot {
  id: string;
  flyerId: string;
  flyerPageId?: string | null;
  productId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  titleOverride?: string | null;
  priceOverride?: string | null;
  product?: ApiProduct;
}

export interface ApiFlyer {
  id: string;
  merchantId: string;
  storeLocationId?: string | null;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: string;
  flyerImageUrl: string;
  aspectRatio: number;
  status: 'draft' | 'published' | 'archived';
  pageCount: number;
  createdAt?: string;
  updatedAt?: string;
  merchant?: Merchant;
  storeLocation?: StoreLocation | null;
  hotspots?: ApiHotspot[];
}

export interface DashboardStats {
  flyers: number;
  products: number;
  merchants: number;
  hotspots: number;
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/api/v1/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchFlyers(): Promise<ApiFlyer[]> {
  const res = await fetch(`${API_BASE}/api/v1/flyers`);
  if (!res.ok) throw new Error('Failed to fetch flyers');
  return res.json();
}

export async function fetchFlyerById(id: string): Promise<ApiFlyer> {
  const res = await fetch(`${API_BASE}/api/v1/flyers/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch flyer ${id}`);
  return res.json();
}

export async function createFlyer(data: Partial<ApiFlyer>): Promise<ApiFlyer> {
  const res = await fetch(`${API_BASE}/api/v1/flyers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create flyer');
  return res.json();
}

export async function updateFlyer(id: string, data: Partial<ApiFlyer>): Promise<ApiFlyer> {
  const res = await fetch(`${API_BASE}/api/v1/flyers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update flyer');
  return res.json();
}

export async function deleteFlyer(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/flyers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete flyer');
  return res.json();
}

export async function saveHotspotsBatch(
  flyerId: string,
  hotspots: Array<{
    id?: string;
    productId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>
): Promise<{ success: boolean; count: number; hotspots: ApiHotspot[] }> {
  const res = await fetch(`${API_BASE}/api/v1/flyers/${flyerId}/hotspots/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hotspots }),
  });
  if (!res.ok) throw new Error('Failed to save hotspots to database');
  return res.json();
}

export async function fetchProducts(query?: string): Promise<ApiProduct[]> {
  const url = new URL(`${API_BASE}/api/v1/products`);
  if (query) url.searchParams.set('q', query);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function createProduct(data: Partial<ApiProduct>): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/api/v1/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create product');
  return res.json();
}

export async function updateProduct(id: string, data: Partial<ApiProduct>): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/api/v1/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
}

export async function deleteProduct(id: string): Promise<{ success: boolean; deletedId: string }> {
  const res = await fetch(`${API_BASE}/api/v1/products/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
}

export async function fetchMerchants(): Promise<Merchant[]> {
  const res = await fetch(`${API_BASE}/api/v1/merchants`);
  if (!res.ok) throw new Error('Failed to fetch merchants');
  return res.json();
}

export async function fetchStoreLocations(merchantId?: string): Promise<StoreLocation[]> {
  const url = new URL(`${API_BASE}/api/v1/store-locations`);
  if (merchantId) url.searchParams.set('merchantId', merchantId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch store locations');
  return res.json();
}

export async function createStoreLocation(data: Partial<StoreLocation>): Promise<StoreLocation> {
  const res = await fetch(`${API_BASE}/api/v1/store-locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create store location');
  return res.json();
}

export async function updateStoreLocation(id: string, data: Partial<StoreLocation>): Promise<StoreLocation> {
  const res = await fetch(`${API_BASE}/api/v1/store-locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update store location');
  return res.json();
}

export async function deleteStoreLocation(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/store-locations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete store location');
  return res.json();
}

export async function uploadImage(file: File): Promise<{ success: boolean; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/v1/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  token: string;
}

export async function loginUser(
  email: string,
  password: string,
  adminOnly = true
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, adminOnly }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Authentication failed');
  }
  return data;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  return data;
}

export async function fetchCurrentUser(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify session');
  }
  return data;
}

/**
 * Resolves an image URL: if relative (like /uploads/...), prepends API_BASE
 */
export function resolveImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}
