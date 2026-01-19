import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/auth.server';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	const isLandingPage = pathname === '/';
	const isStaticAsset = pathname.startsWith('/_app') || pathname.startsWith('/favicon');
	const isApiRoute = pathname.startsWith('/api');
	const isAuthRoute =
		pathname.startsWith('/login') ||
		pathname.startsWith('/register') ||
		pathname.startsWith('/forgot-password') ||
		pathname.startsWith('/reset-password');

	// For public routes, no session check needed
	if (isLandingPage || isStaticAsset || isApiRoute || isAuthRoute) {
		return resolve(event);
	}

	// Fetch and validate session from Better Auth backend
	const sessionData = await getSession(event.request.headers);

	if (sessionData) {
		event.locals.session = sessionData.session;
		event.locals.user = sessionData.user;
	} else {
		// No valid session - redirect to login
		const returnTo = encodeURIComponent(pathname);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	return resolve(event);
};
