import { redirect, type Handle, type HandleFetch } from '@sveltejs/kit';
import { getSession } from '$lib/auth.server';
import { env } from '$env/dynamic/public';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	const isStaticAsset = pathname.startsWith('/_app') || pathname.startsWith('/favicon');
	const isApiRoute = pathname.startsWith('/api');

	// Static assets and API routes don't need session
	if (isStaticAsset || isApiRoute) {
		return resolve(event);
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

	// Redirect logged-in users away from landing and auth pages
	if (isLandingPage || isAuthRoute) {
		const sessionData = await getSession(event.request.headers);
		if (sessionData) {
			const target = sessionData?.user?.role === 'super_admin' ? '/admin' : '/dashboard';
			redirect(307, target);
		}
		return resolve(event);
	}

	// Public and order routes don't require login
	if (isPublicRoute || isOrderRoute) {
		return resolve(event);
	}

	// Only fetch session for protected routes
	const sessionData = await getSession(event.request.headers);

	if (sessionData) {
		event.locals.session = sessionData.session;
		event.locals.user = sessionData.user;
	}

	// Protected routes require a valid session
	if (!sessionData) {
		const returnTo = encodeURIComponent(pathname + event.url.search);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	return resolve(event);
};

/**
 * Forward cookies to cross-origin API requests during SSR.
 * SvelteKit's event.fetch only auto-forwards cookies for same-origin requests.
 * Since PUBLIC_API_BASE may point to a different origin (e.g. pos.rohitk06.in),
 * we need to manually attach the cookie header for authenticated API calls.
 */
export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
	const apiBase = env.PUBLIC_API_BASE || '/api';

	if (apiBase !== '/api' && request.url.startsWith(apiBase)) {
		request.headers.set('cookie', event.request.headers.get('cookie') || '');
	}

	return fetch(request);
};
