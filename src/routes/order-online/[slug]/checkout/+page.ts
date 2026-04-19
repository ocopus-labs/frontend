import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	// Server load (page.server.ts) fetches config authoritatively.
	// Pass it through so the page component receives slug and config.
	return { ...data };
};
