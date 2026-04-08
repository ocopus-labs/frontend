import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type DriverStatus = 'available' | 'busy' | 'offline';

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

export interface DeliveryDriver {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  vehicleType?: string;
  status: DriverStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryZone {
  id: string;
  restaurantId: string;
  name: string;
  polygon: [number, number][];
  deliveryFee: number;
  minOrderAmount: number;
  estimatedMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  restaurantId: string;
  orderId: string;
  driverId?: string;
  zoneId?: string;
  status: DeliveryStatus;
  customerAddress: string;
  customerPhone: string;
  customerName?: string;
  deliveryFee: number;
  estimatedMinutes?: number;
  trackingToken: string;
  notes?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  driver?: DeliveryDriver;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    [key: string]: unknown;
  };
  zone?: DeliveryZone;
}

export interface DeliveryTracking {
  id: string;
  status: DeliveryStatus;
  customerAddress: string;
  customerName?: string;
  deliveryFee: number;
  estimatedMinutes?: number;
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehicleType?: string;
    status: string;
  };
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface CreateDriverPayload {
  name: string;
  phone: string;
  vehicleType?: string;
}

export interface UpdateDriverPayload {
  name?: string;
  phone?: string;
  vehicleType?: string;
  status?: string;
  isActive?: boolean;
}

export interface CreateZonePayload {
  name: string;
  polygon: [number, number][];
  deliveryFee: number;
  minOrderAmount: number;
  estimatedMinutes: number;
}

export interface AssignDeliveryPayload {
  orderId: string;
  driverId: string;
}

export interface UpdateDeliveryStatusPayload {
  status: DeliveryStatus;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== DRIVER ENDPOINTS ====================

export async function getDrivers(
  businessId: string,
  status?: string,
  options?: FetchOption
): Promise<{ drivers: DeliveryDriver[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const url = status
    ? `/business/${businessId}/delivery/drivers?status=${encodeURIComponent(status)}`
    : `/business/${businessId}/delivery/drivers`;
  return api.get(url);
}

export async function createDriver(
  businessId: string,
  data: CreateDriverPayload,
  options?: FetchOption
): Promise<{ message: string; driver: DeliveryDriver }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/delivery/drivers`, data);
}

export async function updateDriver(
  businessId: string,
  driverId: string,
  data: UpdateDriverPayload,
  options?: FetchOption
): Promise<{ message: string; driver: DeliveryDriver }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/delivery/drivers/${driverId}`, data);
}

// ==================== ZONE ENDPOINTS ====================

export async function getZones(
  businessId: string,
  options?: FetchOption
): Promise<{ zones: DeliveryZone[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/delivery/zones`);
}

export async function createZone(
  businessId: string,
  data: CreateZonePayload,
  options?: FetchOption
): Promise<{ message: string; zone: DeliveryZone }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/delivery/zones`, data);
}

export async function updateZone(
  businessId: string,
  zoneId: string,
  data: CreateZonePayload,
  options?: FetchOption
): Promise<{ message: string; zone: DeliveryZone }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/delivery/zones/${zoneId}`, data);
}

// ==================== DELIVERY ENDPOINTS ====================

export async function assignDelivery(
  businessId: string,
  data: AssignDeliveryPayload,
  options?: FetchOption
): Promise<{ message: string; delivery: Delivery }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/delivery/assign`, data);
}

export async function updateDeliveryStatus(
  businessId: string,
  deliveryId: string,
  data: UpdateDeliveryStatusPayload,
  options?: FetchOption
): Promise<{ message: string; delivery: Delivery }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/delivery/${deliveryId}/status`, data);
}

export async function getActiveDeliveries(
  businessId: string,
  options?: FetchOption
): Promise<{ deliveries: Delivery[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/delivery/active`);
}

// ==================== PUBLIC TRACKING ====================

export async function trackDelivery(
  token: string,
  options?: FetchOption
): Promise<{ delivery: DeliveryTracking }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/delivery/track/${token}`);
}
