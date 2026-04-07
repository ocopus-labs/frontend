import type { MenuCategory, MenuGroup, MenuItem, MenuResponse, ModifierGroup, POSLayout, POSTab } from '$lib/types/menu';
import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
  requiresKitchen?: boolean;
}

export interface MenuItemModifier {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
  sortOrder: number;
}

export interface MenuItemIngredientPayload {
  inventoryItemId: string;
  quantityUsed: number;
  unit: string;
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
  requiresKitchen?: boolean | null;
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
  ingredients?: MenuItemIngredientPayload[];
}

export interface ModifierGroupOptionPayload {
  name: string;
  price: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface CreateModifierGroupPayload {
  name: string;
  required?: boolean;
  multiSelect?: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: ModifierGroupOptionPayload[];
  sortOrder?: number;
}

export interface UpdateModifierGroupPayload {
  name?: string;
  required?: boolean;
  multiSelect?: boolean;
  minSelections?: number;
  maxSelections?: number;
  options?: ModifierGroupOptionPayload[];
  sortOrder?: number;
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

export async function seedMenuTemplate(
  businessId: string,
  template: string,
  options?: FetchOption
): Promise<{ message: string; categoriesCreated: number; itemsCreated: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/seed-template`, { template });
}

export async function bulkUpdatePrices(
  businessId: string,
  updates: { itemId: string; newPrice: number }[],
  options?: FetchOption
): Promise<{ message: string; updatedCount: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/menu/items/bulk-price`, { updates });
}

export async function bulkImportMenuItems(
  businessId: string,
  items: { name: string; price: number; category: string; description?: string }[],
  options?: FetchOption
): Promise<{ message: string; categoriesCreated: number; itemsCreated: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/import`, { items });
}

// ==================== MODIFIER GROUPS ====================

export async function getModifierGroups(
  businessId: string,
  options?: FetchOption
): Promise<{ modifierGroups: ModifierGroup[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu/modifier-groups`);
}

export async function getModifierGroupById(
  businessId: string,
  groupId: string,
  options?: FetchOption
): Promise<{ modifierGroup: ModifierGroup }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu/modifier-groups/${groupId}`);
}

export async function createModifierGroup(
  businessId: string,
  data: CreateModifierGroupPayload,
  options?: FetchOption
): Promise<{ message: string; modifierGroup: ModifierGroup }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/modifier-groups`, data);
}

export async function updateModifierGroup(
  businessId: string,
  groupId: string,
  data: UpdateModifierGroupPayload,
  options?: FetchOption
): Promise<{ message: string; modifierGroup: ModifierGroup }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/menu/modifier-groups/${groupId}`, data);
}

export async function deleteModifierGroup(
  businessId: string,
  groupId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/menu/modifier-groups/${groupId}`);
}

// ==================== GROUPS ====================

export async function getGroups(
  businessId: string,
  options?: FetchOption
): Promise<{ groups: MenuGroup[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu/groups`);
}

export async function createGroup(
  businessId: string,
  data: { name: string; description?: string; icon?: string; color?: string; itemIds: string[]; sortOrder?: number; isActive?: boolean },
  options?: FetchOption
): Promise<{ message: string; group: MenuGroup }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/groups`, data);
}

export async function updateGroup(
  businessId: string,
  groupId: string,
  data: Partial<{ name: string; description?: string; icon?: string; color?: string; itemIds: string[]; sortOrder?: number; isActive?: boolean }>,
  options?: FetchOption
): Promise<{ message: string; group: MenuGroup }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/menu/groups/${groupId}`, data);
}

export async function deleteGroup(
  businessId: string,
  groupId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/menu/groups/${groupId}`);
}

// ==================== POS LAYOUT ====================

export async function getPOSLayout(
  businessId: string,
  options?: FetchOption
): Promise<{ posLayout: POSLayout | null }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu/pos-layout`);
}

export async function savePOSLayout(
  businessId: string,
  tabs: POSTab[],
  options?: FetchOption
): Promise<{ message: string; layout: POSLayout }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.put(`/business/${businessId}/menu/pos-layout`, { tabs });
}

// ==================== FAVORITES ====================

export async function getFavorites(
  businessId: string,
  options?: FetchOption
): Promise<{ favorites: string[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/menu/favorites`);
}

export async function addFavorite(
  businessId: string,
  menuItemId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/menu/favorites`, { menuItemId });
}

export async function removeFavorite(
  businessId: string,
  menuItemId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/menu/favorites/${menuItemId}`);
}
