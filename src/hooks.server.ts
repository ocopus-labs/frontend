import { redirect, type Handle, type HandleFetch } from '@sveltejs/kit';
import { getSession } from '$lib/auth.server';
import { env } from '$env/dynamic/public';

// Maintenance mode check with cache
let maintenanceCache: { value: boolean; checked: number } = { value: false, checked: 0 };
const MAINTENANCE_CACHE_TTL = 15_000; // 15 seconds

async function isMaintenanceMode(): Promise<boolean> {
	const now = Date.now();
	if (now - maintenanceCache.checked < MAINTENANCE_CACHE_TTL) {
		return maintenanceCache.value;
	}

	try {
		const baseUrl = env.PUBLIC_API_BASE || 'http://localhost:3000/api';
		const res = await fetch(`${baseUrl}/ping`, {
			signal: AbortSignal.timeout(3000),
		}).catch(() => null);

		// 503 = maintenance on, 200 = maintenance off
		maintenanceCache = { value: res?.status === 503, checked: now };
	} catch {
		maintenanceCache = { value: false, checked: now };
	}

	return maintenanceCache.value;
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	const isStaticAsset = pathname.startsWith('/_app') || pathname.startsWith('/favicon');
	const isApiRoute = pathname.startsWith('/api');

	// Static assets and API routes don't need session
	if (isStaticAsset || isApiRoute) {
		return resolve(event);
	}

	// Maintenance page is always accessible
	if (pathname === '/maintenance') {
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

	// Public and order routes don't need session at all
	if (isPublicRoute || isOrderRoute) {
		return resolve(event);
	}

	// Fetch session once for all remaining routes
	const sessionData = await getSession(event.request.headers);

	// Redirect logged-in users away from landing and auth pages
	if (isLandingPage || isAuthRoute) {
		if (sessionData) {
			const target = sessionData.user?.role === 'super_admin' ? '/admin' : '/dashboard';
			redirect(307, target);
		}
		return resolve(event);
	}

	// Protected routes require a valid session
	if (!sessionData) {
		const returnTo = encodeURIComponent(pathname + event.url.search);
		redirect(307, `/login?returnTo=${returnTo}`);
	}

	event.locals.session = sessionData.session;
	event.locals.user = sessionData.user;

	// Check maintenance mode for non-admin users on protected routes
	if (sessionData.user?.role !== 'super_admin' && !pathname.startsWith('/admin')) {
		const inMaintenance = await isMaintenanceMode();
		if (inMaintenance) {
			redirect(307, '/maintenance');
		}
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
