/**
 * Backend API Client for Flip Admin Portal
 * Connects directly to the Neon-backed Flip REST API.
 */

export const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  initial: string;
  logoBg: string;
  logoColor: string;
  logoUrl?: string;
  website?: string;
}

export interface ApiProduct {
  id: string;
  merchantId?: string;
  name: string;
  brand: string;
  description: string;
  regularPrice: string | number;
  offerPrice: string | number;
  unit: string;
  category: string;
  imageUrl: string;
  merchant?: Merchant;
}

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

export async function fetchMerchants(): Promise<Merchant[]> {
  const res = await fetch(`${API_BASE}/api/v1/merchants`);
  if (!res.ok) throw new Error('Failed to fetch merchants');
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
