import type { Subscription, PlanFeatures } from '$lib/api/subscription';

/**
 * Feature keys that can be checked for plan access
 */
export type FeatureKey = keyof PlanFeatures | 'analytics_advanced';

/**
 * Map of sidebar item titles to their required features
 */
export const FEATURE_REQUIREMENTS: Record<string, FeatureKey> = {
	'Kitchen Display': 'kitchenDisplay',
	Inventory: 'inventory',
	Expenses: 'expenses'
};

/**
 * Features that require PRO or higher plan
 */
export const PRO_FEATURES: FeatureKey[] = ['kitchenDisplay', 'inventory', 'expenses'];

/**
 * Features that require ENTERPRISE plan
 */
export const ENTERPRISE_FEATURES: FeatureKey[] = ['api', 'whiteLabel'];

/**
 * Check if a specific feature is enabled for the given subscription
 */
export function hasFeatureAccess(
	subscription: Subscription | null | undefined,
	feature: FeatureKey
): boolean {
	if (!subscription?.plan?.features) {
		// No subscription = free plan, only basic features
		return false;
	}

	const features = subscription.plan.features;

	// Handle analytics_advanced specially
	if (feature === 'analytics_advanced') {
		return features.analytics === 'advanced';
	}

	// Check boolean features
	if (feature in features) {
		return Boolean(features[feature as keyof PlanFeatures]);
	}

	return false;
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlan(feature: FeatureKey): 'PRO' | 'ENTERPRISE' | null {
	if (ENTERPRISE_FEATURES.includes(feature)) {
		return 'ENTERPRISE';
	}
	if (PRO_FEATURES.includes(feature)) {
		return 'PRO';
	}
	return null;
}

/**
 * Check if user is on free plan
 */
export function isFreePlan(subscription: Subscription | null | undefined): boolean {
	if (!subscription?.plan) return true;
	return subscription.plan.slug === 'free';
}

/**
 * Check if user is on pro plan or higher
 */
export function isProPlanOrHigher(subscription: Subscription | null | undefined): boolean {
	if (!subscription?.plan) return false;
	return subscription.plan.slug === 'pro' || subscription.plan.slug === 'enterprise';
}

/**
 * Check if user is on enterprise plan
 */
export function isEnterprisePlan(subscription: Subscription | null | undefined): boolean {
	if (!subscription?.plan) return false;
	return subscription.plan.slug === 'enterprise';
}

/**
 * Get display name for the current plan
 */
export function getPlanDisplayName(subscription: Subscription | null | undefined): string {
	return subscription?.plan?.displayName || 'Free';
}

/**
 * Get plan badge color based on plan type
 */
export function getPlanBadgeColor(
	subscription: Subscription | null | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' {
	if (!subscription?.plan) return 'outline';
	switch (subscription.plan.slug) {
		case 'enterprise':
			return 'default';
		case 'pro':
			return 'secondary';
		default:
			return 'outline';
	}
}
