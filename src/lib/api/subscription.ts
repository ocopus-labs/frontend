// Subscription API client

const API_BASE = '/api/subscription';

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  currency: string;
  maxLocations: number;
  maxTeamMembers: number;
  maxOrdersPerMonth: number;
  features: PlanFeatures;
  isPublic: boolean;
  sortOrder: number;
}

export interface PlanFeatures {
  kitchenDisplay: boolean;
  analytics: 'basic' | 'advanced';
  inventory: boolean;
  expenses: boolean;
  api: boolean;
  whiteLabel: boolean;
}

export interface Subscription {
  id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  plan: SubscriptionPlan;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface UsageStats {
  ordersThisMonth: number;
  orderLimit: number;
  locationsCount: number;
  locationLimit: number;
  teamMembersCount: number;
  teamMemberLimit: number;
  periodStart: string;
  periodEnd: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

export interface PortalResponse {
  url: string;
}

// Fetch helper
type FetchFn = typeof fetch;

interface FetchOptions {
  fetch?: FetchFn;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & FetchOptions = {}
): Promise<T> {
  const { fetch: customFetch = fetch, ...init } = options;

  const response = await customFetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// API functions

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(
  options: FetchOptions = {}
): Promise<{ plans: SubscriptionPlan[] }> {
  return apiRequest('/plans', options);
}

/**
 * Get current user's subscription
 */
export async function getMySubscription(
  options: FetchOptions = {}
): Promise<{ subscription: Subscription }> {
  return apiRequest('/me', options);
}

/**
 * Get current usage stats
 */
export async function getSubscriptionUsage(
  options: FetchOptions = {}
): Promise<{ usage: UsageStats }> {
  return apiRequest('/usage', options);
}

/**
 * Create checkout session for upgrading to a plan
 */
export async function createCheckout(
  planSlug: string,
  options: FetchOptions = {}
): Promise<CheckoutResponse> {
  return apiRequest('/checkout', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ planSlug }),
  });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  options: FetchOptions = {}
): Promise<{ success: boolean; cancelAtPeriodEnd: boolean }> {
  return apiRequest('/cancel', {
    ...options,
    method: 'POST',
  });
}

/**
 * Get customer portal URL for managing billing
 */
export async function getCustomerPortalUrl(
  options: FetchOptions = {}
): Promise<PortalResponse> {
  return apiRequest('/portal', {
    ...options,
    method: 'POST',
  });
}

/**
 * Format price in INR
 */
export function formatPrice(amount: number, currency: string = 'INR'): string {
  if (amount === 0) return 'Free';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format limit display (-1 = unlimited)
 */
export function formatLimit(value: number): string {
  return value === -1 ? 'Unlimited' : value.toString();
}

/**
 * Get plan features as displayable list
 */
export function getPlanFeaturesList(plan: SubscriptionPlan): string[] {
  const features: string[] = [];

  // Limits
  features.push(`${formatLimit(plan.maxLocations)} business location${plan.maxLocations !== 1 ? 's' : ''}`);
  features.push(`${formatLimit(plan.maxTeamMembers)} team member${plan.maxTeamMembers !== 1 ? 's' : ''}`);
  features.push(
    plan.maxOrdersPerMonth === -1
      ? 'Unlimited orders'
      : `Up to ${plan.maxOrdersPerMonth} orders/month`
  );

  // Features
  if (plan.features.kitchenDisplay) {
    features.push('Kitchen Display System');
  }
  if (plan.features.analytics === 'advanced') {
    features.push('Advanced analytics');
  }
  if (plan.features.inventory) {
    features.push('Inventory management');
  }
  if (plan.features.expenses) {
    features.push('Expense tracking');
  }
  if (plan.features.api) {
    features.push('API access');
  }
  if (plan.features.whiteLabel) {
    features.push('White-label options');
  }

  return features;
}
