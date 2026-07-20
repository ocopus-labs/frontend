import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const base = (env.PUBLIC_API_BASE ?? '').replace(/\/$/, '') || 'http://localhost:3000/api/v1';
	const res = await fetch(`${base}/order-online/${params.slug}/config`);
	if (!res.ok) throw error(res.status, 'Restaurant not found');
	// The endpoint returns the config object itself (business, onlineOrdering,
	// deliveryZones, …) — there is no `{ config: … }` envelope. Reading a
	// `.config` property here silently yielded undefined, which zeroed out
	// `authEnabled` on the checkout page and disabled the sign-in gate.
	const config = (await res.json()) as Record<string, unknown>;
	return { slug: params.slug, config };
};
