import type { MenuCategory, MenuItem, MenuResponse } from '$lib/types/menu';
import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface MenuItemModifier {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
  sortOrder: number;
}

export interface CreateMenuItemPayload {
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  preparationTime?: number;
  sortOrder?: number;
  modifiers?: {
    sizes?: MenuItemModifier[];
    spiceLevels?: MenuItemModifier[];
    preparation?: string[];
    addOns?: MenuItemModifier[];
    removals?: string[];
  };
  taxCode?: string;
  taxCategory?: string;
  customTaxRate?: number;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== MENU ====================

export async function getMenu(
  businessId: string,
  options?: FetchOption
): Promise<MenuResponse> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu`);
}

export async function publishMenu(
  businessId: string,
  options?: FetchOption
): Promise<{ message: string; menu: MenuResponse }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/publish`);
}

// ==================== CATEGORIES ====================

export async function getCategories(
  businessId: string,
  options?: FetchOption
): Promise<{ categories: MenuCategory[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu/categories`);
}

export async function getCategoryById(
  businessId: string,
  categoryId: string,
  options?: FetchOption
): Promise<{ category: MenuCategory }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu/categories/${categoryId}`);
}

export async function createCategory(
  businessId: string,
  data: CreateCategoryPayload,
  options?: FetchOption
): Promise<{ message: string; category: MenuCategory }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/categories`, data);
}

export async function updateCategory(
  businessId: string,
  categoryId: string,
  data: Partial<CreateCategoryPayload>,
  options?: FetchOption
): Promise<{ message: string; category: MenuCategory }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/menu/categories/${categoryId}`, data);
}

export async function deleteCategory(
  businessId: string,
  categoryId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/menu/categories/${categoryId}`);
}

export async function reorderCategories(
  businessId: string,
  categoryIds: string[],
  options?: FetchOption
): Promise<{ message: string; categories: MenuCategory[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/categories/reorder`, { categoryIds });
}

// ==================== ITEMS ====================

export async function getItems(
  businessId: string,
  params?: { categoryId?: string; limit?: number; offset?: number },
  options?: FetchOption
): Promise<{ items: MenuItem[]; total: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const searchParams = new URLSearchParams();
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query
    ? `/business/${businessId}/menu/items?${query}`
    : `/business/${businessId}/menu/items`;
  return api.get(url);
}

export async function getItemById(
  businessId: string,
  itemId: string,
  options?: FetchOption
): Promise<{ item: MenuItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu/items/${itemId}`);
}

export async function createMenuItem(
  businessId: string,
  data: CreateMenuItemPayload,
  options?: FetchOption
): Promise<{ message: string; item: MenuItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/items`, data);
}

export async function updateMenuItem(
  businessId: string,
  itemId: string,
  data: Partial<CreateMenuItemPayload>,
  options?: FetchOption
): Promise<{ message: string; item: MenuItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/menu/items/${itemId}`, data);
}

export async function deleteMenuItem(
  businessId: string,
  itemId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/menu/items/${itemId}`);
}

export async function toggleItemAvailability(
  businessId: string,
  itemId: string,
  options?: FetchOption
): Promise<{ message: string; item: MenuItem }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/items/${itemId}/toggle-availability`);
}

export async function bulkUpdateAvailability(
  businessId: string,
  itemIds: string[],
  isAvailable: boolean,
  options?: FetchOption
): Promise<{ message: string; items: MenuItem[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/items/bulk-availability`, { itemIds, isAvailable });
}

export async function seedDefaultCategories(
  businessId: string,
  options?: FetchOption
): Promise<{ message: string; categories: MenuCategory[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/seed-categories`);
}
