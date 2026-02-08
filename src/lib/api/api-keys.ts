import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  permissions: string[];
  rateLimit: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateApiKeyPayload {
  name: string;
  scopes: string[];
  permissions: string[];
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  key: string;
  apiKey: ApiKey;
}

// ==================== API FUNCTIONS ====================

export async function getApiKeys(
  businessId: string,
  options?: { fetch?: typeof fetch }
): Promise<ApiKey[]> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get<ApiKey[]>(`/business/${businessId}/api-keys`);
}

export async function createApiKey(
  businessId: string,
  payload: CreateApiKeyPayload
): Promise<CreateApiKeyResponse> {
  const api = getApiClient();
  return api.post<CreateApiKeyResponse>(`/business/${businessId}/api-keys`, payload);
}

export async function revokeApiKey(
  businessId: string,
  keyId: string
): Promise<{ message: string }> {
  const api = getApiClient();
  return api.delete<{ message: string }>(`/business/${businessId}/api-keys/${keyId}`);
}

export async function rotateApiKey(
  businessId: string,
  keyId: string
): Promise<CreateApiKeyResponse> {
  const api = getApiClient();
  return api.post<CreateApiKeyResponse>(`/business/${businessId}/api-keys/${keyId}/rotate`);
}

// ==================== CONSTANTS ====================

export const AVAILABLE_SCOPES = [
  { value: 'orders', label: 'Orders', description: 'Create and manage orders' },
  { value: 'menu', label: 'Menu', description: 'Read and update menu items' },
  { value: 'tables', label: 'Tables', description: 'View table status and layout' },
  { value: 'inventory', label: 'Inventory', description: 'Manage stock levels' },
  { value: 'payments', label: 'Payments', description: 'Process and view payments' },
  { value: 'analytics', label: 'Analytics', description: 'View business analytics' },
  { value: 'team', label: 'Team', description: 'View team members' },
  { value: 'expenses', label: 'Expenses', description: 'Record and view expenses' },
  { value: 'search', label: 'Search', description: 'Search across all resources' },
] as const;

export const AVAILABLE_PERMISSIONS = [
  { value: 'operations:read', label: 'Read Orders', scope: 'orders' },
  { value: 'operations:create', label: 'Create Orders', scope: 'orders' },
  { value: 'operations:update', label: 'Update Orders', scope: 'orders' },
  { value: 'operations:cancel', label: 'Cancel Orders', scope: 'orders' },
  { value: 'catalog:read', label: 'Read Menu', scope: 'menu' },
  { value: 'catalog:update', label: 'Update Menu', scope: 'menu' },
  { value: 'scheduling:read', label: 'Read Tables', scope: 'tables' },
  { value: 'inventory:read', label: 'Read Inventory', scope: 'inventory' },
  { value: 'inventory:manage_stock', label: 'Adjust Stock', scope: 'inventory' },
  { value: 'billing:read_invoice', label: 'Read Payments', scope: 'payments' },
  { value: 'billing:process_payment', label: 'Process Payments', scope: 'payments' },
  { value: 'analytics:view', label: 'View Analytics', scope: 'analytics' },
  { value: 'business:read', label: 'Read Team', scope: 'team' },
  { value: 'expense:read', label: 'Read Expenses', scope: 'expenses' },
  { value: 'expense:create', label: 'Create Expenses', scope: 'expenses' },
] as const;
