import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/auth.server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/forget-password', '/contact'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Check if it's a public route, static asset, or landing page
	const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
	const isLandingPage = pathname === '/';
	const isStaticAsset = pathname.startsWith('/_app') || pathname.startsWith('/favicon');
	const isApiRoute = pathname.startsWith('/api');

	// For public routes, no session check needed
	if (isPublicRoute || isLandingPage || isStaticAsset || isApiRoute) {
		return resolve(event);
	}

	// Fetch and validate session from Better Auth backend
	const sessionData = await getSession(event.request.headers);

	if (sessionData) {
		// Populate locals with session and user for use in load functions
		event.locals.session = sessionData.session;
		event.locals.user = sessionData.user;
	} else {
		// No valid session - redirect to login
		const returnTo = encodeURIComponent(pathname);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	return resolve(event);
};
