export type BusinessType =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'salon'
  | 'spa'
  | 'gym'
  | 'retail'
  | 'clinic'
  | 'other';

export interface BusinessAddress {
  street?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface BusinessContact {
  email?: string;
  phone?: string;
  website?: string;
}

export interface BusinessSettings {
  timezone: string;
  currency: string;
  taxRate?: string;
  businessHours?: Record<string, { open: string; close: string; isClosed?: boolean }>;
  paymentMethods?: string[];
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  logo?: string;
  description?: string;
  address: BusinessAddress;
  contact: BusinessContact;
  settings: BusinessSettings;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessPayload {
  name: string;
  type: BusinessType;
  description?: string;
  logo?: string;
  subType?: string;
  address: BusinessAddress;
  contact: BusinessContact;
  settings: BusinessSettings;
}

export interface UpdateBusinessPayload extends Partial<CreateBusinessPayload> {
  status?: 'active' | 'inactive' | 'suspended';
}

export interface BusinessTypeConfig {
  value: string;
  label: string;
  description: string;
  subtypes: string[];
  features: string[];
}
