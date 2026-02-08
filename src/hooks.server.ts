import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/auth.server';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	const isStaticAsset = pathname.startsWith('/_app') || pathname.startsWith('/favicon');
	const isApiRoute = pathname.startsWith('/api');

	// Static assets and API routes don't need session
	if (isStaticAsset || isApiRoute) {
		return resolve(event);
	}

	// Fetch session for ALL page routes (public, auth, and protected)
	const sessionData = await getSession(event.request.headers);

	if (sessionData) {
		event.locals.session = sessionData.session;
		event.locals.user = sessionData.user;
	}

	// Determine if this is a public/auth route (no login required)
	const isLandingPage = pathname === '/';
	const isAuthRoute =
		pathname.startsWith('/login') ||
		pathname.startsWith('/register') ||
		pathname.startsWith('/forgot-password') ||
		pathname.startsWith('/forget-password') ||
		pathname.startsWith('/reset-password') ||
		pathname.startsWith('/verify-email');
	const isPublicRoute =
		pathname.startsWith('/pricing') ||
		pathname.startsWith('/about');
	const isOrderRoute = pathname.startsWith('/order');

	// Public and auth routes don't require login
	if (isLandingPage || isAuthRoute || isPublicRoute || isOrderRoute) {
		return resolve(event);
	}

	// Protected routes require a valid session
	if (!sessionData) {
		const returnTo = encodeURIComponent(pathname + event.url.search);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	return resolve(event);
};
