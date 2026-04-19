import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const base = (env.PUBLIC_API_BASE ?? '').replace(/\/$/, '') || 'http://localhost:3000/api/v1';
	const res = await fetch(`${base}/order-online/${params.slug}/config`);
	if (!res.ok) throw error(res.status, 'Restaurant not found');
	const data = (await res.json()) as { config: Record<string, unknown> };
	return { slug: params.slug, config: data.config };
};
