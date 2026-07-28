import { listSessions } from '$lib/api/agent';
import type { LayoutLoad } from './$types';

/**
 * Client-only.
 *
 * The chat UI's markdown pipeline pulls in `decode-named-character-reference`,
 * whose browser build touches `document` at module scope and crashes SSR. Every
 * message also needs an authenticated session, so there is nothing to prerender.
 */
export const ssr = false;

export const load: LayoutLoad = async ({ parent, fetch }) => {
	const data = await parent();
	const businessId = data.businessId as string | undefined;

	if (!businessId) return { ...data, sessions: [], sessionsCursor: null };

	// Loaded here rather than in the page so the sidebar is populated once for
	// the whole section — switching between threads must not refetch the list.
	try {
		const { sessions, nextCursor } = await listSessions(businessId, {}, { fetch });
		return { ...data, sessions, sessionsCursor: nextCursor ?? null };
	} catch {
		// A failed list is not a reason to block the page: the composer still
		// works, and the sidebar renders its own error state on retry.
		return { ...data, sessions: [], sessionsCursor: null };
	}
};
