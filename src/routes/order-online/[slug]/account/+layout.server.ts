import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/public';

export const load: LayoutServerLoad = async ({ params, cookies }) => {
	const baseUrl = env.PUBLIC_API_BASE?.replace(/\/api(\/v\d+)?$/, '') || 'http://localhost:3000';

	const cookieHeader = cookies
		.getAll()
		.map((c) => `${c.name}=${c.value}`)
		.join('; ');

	let session: { user?: unknown } | null = null;
	try {
		const res = await fetch(`${baseUrl}/api/customer-auth/get-session`, {
			headers: { cookie: cookieHeader }
		});
		if (res.ok) {
			session = await res.json().catch(() => null);
		}
	} catch {
		// treat as unauthenticated
	}

	if (!session?.user) {
		throw redirect(302, `/order-online/${params.slug}/checkout`);
	}

	return { slug: params.slug };
};
