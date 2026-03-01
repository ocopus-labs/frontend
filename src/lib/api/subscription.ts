// Subscription API client

import { createApiClient, getApiClient } from './client';
import { formatCurrency as i18nFormatCurrency, type CurrencyCode } from '$lib/utils/i18n';

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
  loyalty: boolean;
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
  hasBillingAccount: boolean;
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

type FetchOption = { fetch?: typeof fetch };

// API functions

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(
  options?: FetchOption
): Promise<{ plans: SubscriptionPlan[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/subscription/plans');
}

/**
 * Get current user's subscription
 */
export async function getMySubscription(
  options?: FetchOption
): Promise<{ subscription: Subscription }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/subscription/me');
}

/**
 * Get current usage stats
 */
export async function getSubscriptionUsage(
  options?: FetchOption
): Promise<{ usage: UsageStats }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/subscription/usage');
}

/**
 * Create checkout session for upgrading to a plan
 */
export async function createCheckout(
  planSlug: string,
  options?: FetchOption
): Promise<CheckoutResponse> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post('/subscription/checkout', { planSlug });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  options?: FetchOption
): Promise<{ success: boolean; cancelAtPeriodEnd: boolean }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post('/subscription/cancel');
}

/**
 * Get customer portal URL for managing billing
 */
export async function getCustomerPortalUrl(
  options?: FetchOption
): Promise<PortalResponse> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post('/subscription/portal');
}

/**
 * Format price using i18n utility with proper locale lookup
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  if (amount === 0) return 'Free';
  return i18nFormatCurrency(amount, currency.toUpperCase() as CurrencyCode);
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
  if (plan.features.loyalty) {
    features.push('Loyalty & Rewards');
  }
  if (plan.features.api) {
    features.push('API access');
  }
  if (plan.features.whiteLabel) {
    features.push('White-label options');
  }

  return features;
}
