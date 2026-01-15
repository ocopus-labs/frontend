import { redirect, type Handle } from '@sveltejs/kit';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/forget-password', '/contact'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Check if it's a public route, static asset, or landing page
	const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
	const isLandingPage = pathname === '/';
	const isStaticAsset = pathname.startsWith('/_app') || pathname.startsWith('/favicon');
	const isApiRoute = pathname.startsWith('/api');

	if (isPublicRoute || isLandingPage || isStaticAsset || isApiRoute) {
		return resolve(event);
	}

	// Check for session cookie
	const sessionCookie = event.cookies.get('better-auth.session_token');

	// If no session and trying to access protected route, redirect to login
	if (!sessionCookie) {
		const returnTo = encodeURIComponent(pathname);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	return resolve(event);
};
