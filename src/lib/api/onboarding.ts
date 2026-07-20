import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

/**
 * Setup-wizard progress as stored on the business.
 *
 * Steps are identified by id, never by index: the tables step is hidden for
 * business types that don't have tables, so index 3 means different things for
 * a restaurant and a salon.
 */
export interface OnboardingState {
	currentStepId?: string;
	furthestStepId?: string;
	skippedStepIds?: string[];
	completed?: Record<string, boolean>;
	summaries?: Record<string, string>;
	selectedFeatures?: string[];
}

export interface OnboardingStatus {
	state: OnboardingState;
	completedAt: string | null;
	isComplete: boolean;
}

export interface IncompleteOnboarding {
	id: string;
	name: string;
	slug: string;
	type: string;
	state: OnboardingState;
}

export type UpdateOnboardingPayload = OnboardingState & {
	/** Marks setup finished in the same call that saves the final state. */
	complete?: boolean;
};

type FetchOption = { fetch?: typeof fetch };

// ==================== ONBOARDING API ====================

export async function getOnboardingStatus(
	businessId: string,
	options?: FetchOption
): Promise<OnboardingStatus> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/onboarding`);
}

/**
 * Partial update -- the server merges into the saved state, so callers only
 * send their own slice and cannot clobber another step's progress.
 */
export async function updateOnboardingState(
	businessId: string,
	payload: UpdateOnboardingPayload,
	options?: FetchOption
): Promise<OnboardingStatus> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/onboarding`, payload);
}

/** Businesses the signed-in user owns that never finished setup. */
export async function listIncompleteOnboarding(
	options?: FetchOption
): Promise<{ businesses: IncompleteOnboarding[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get('/onboarding/incomplete');
}
