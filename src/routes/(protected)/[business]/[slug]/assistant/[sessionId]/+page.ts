import { getSession } from '$lib/api/agent';
import type { PageLoad } from './$types';

/**
 * Fetch the transcript so a deep link or a refresh lands on the real thread
 * rather than an empty one that fills in a moment later.
 *
 * A failure is not thrown: the session may simply be new. The page hydrates
 * from the store instead and renders an empty thread, which is recoverable —
 * an error page is not.
 */
export const load: PageLoad = async ({ params, parent, fetch }) => {
	const data = await parent();
	const businessId = data.businessId as string | undefined;
	if (!businessId) return { sessionId: params.sessionId, messages: null, prevCursor: null };

	try {
		const detail = await getSession(businessId, params.sessionId, {}, { fetch });
		return {
			sessionId: params.sessionId,
			session: detail.session,
			messages: detail.messages,
			// Present when the thread is longer than one page. Passed through so
			// the store knows there is earlier history without re-fetching to
			// find out.
			prevCursor: detail.prevCursor ?? null
		};
	} catch {
		return { sessionId: params.sessionId, messages: null, prevCursor: null };
	}
};
