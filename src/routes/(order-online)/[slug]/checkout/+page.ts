import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const { slug } = params;

	// The checkout page reads cart and config from sessionStorage on the client.
	// If there's no cart, we redirect back to the menu.
	return {
		slug
	};
};
