import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
	body?: unknown;
}

export interface ApiClientOptions {
	fetch?: typeof fetch;
}

export class ApiError extends Error {
	constructor(
		public statusCode: number,
		message: string,
		public data?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Request failed' }));

		// Handle maintenance mode
		if (response.status === 503 && error.maintenance && browser) {
			window.location.href = '/maintenance';
			throw new ApiError(503, 'Platform is under maintenance', error);
		}

		// Handle session expiry: clear cache and redirect to login
		if (response.status === 401 && browser) {
			clearApiCache();
			const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
			window.location.href = `/login?returnTo=${returnTo}&reason=session-expired`;
		}

		throw new ApiError(response.status, errorMessage(error), error);
	}

	// 204, or any empty body. `response.json()` on an empty stream rejects with
	// a SyntaxError, which callers then report as a failure — so a successful
	// DELETE looked to the UI exactly like a failed one, and optimistic updates
	// rolled themselves back. The backend's only 204s are session delete and two
	// admin routes, which is why this survived so long.
	if (response.status === 204 || response.headers.get('content-length') === '0') {
		return undefined as T;
	}
	return response.json();
}

/**
 * The server's message, whatever shape it arrived in.
 *
 * `AllExceptionsFilter` wraps every message in an array (`message: string[]`),
 * including single-message errors and validation-pipe output. Passing that
 * array straight to `Error` stringifies it with commas and no spaces.
 */
function errorMessage(error: { message?: unknown }): string {
	const { message } = error;
	if (typeof message === 'string' && message) return message;
	if (Array.isArray(message)) {
		const parts = message.filter((m): m is string => typeof m === 'string');
		if (parts.length) return parts.join('; ');
	}
	return 'Request failed';
}

// ==================== Client-side GET cache ====================

const cache = new Map<string, { data: unknown; expiry: number }>();
const DEFAULT_CACHE_TTL_MS = 30_000; // 30 seconds

function getCached<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiry) {
		cache.delete(key);
		return null;
	}
	return entry.data as T;
}

function setCache(key: string, data: unknown, ttlMs: number = DEFAULT_CACHE_TTL_MS) {
	cache.set(key, { data, expiry: Date.now() + ttlMs });
	// Cap cache size to prevent unbounded growth
	if (cache.size > 200) {
		const oldest = cache.keys().next().value;
		if (oldest) cache.delete(oldest);
	}
}

/**
 * Clear cached API responses.
 * - No argument: clears all cached data
 * - With pattern: clears entries whose key contains the pattern
 */
export function clearApiCache(pattern?: string) {
	if (!pattern) {
		cache.clear();
		return;
	}
	for (const key of cache.keys()) {
		if (key.includes(pattern)) cache.delete(key);
	}
}

// ==================== API Client ====================

/**
 * Creates an API client with optional custom fetch function.
 *
 * Usage in +page.ts / +layout.ts (SSR):
 * ```ts
 * export const load: PageLoad = async ({ fetch }) => {
 *   const api = createApiClient({ fetch });
 *   const data = await api.get('/business');
 *   return { data };
 * };
 * ```
 *
 * Usage in components (client-side):
 * ```ts
 * const api = createApiClient();
 * const data = await api.get('/business');
 * ```
 */
export function createApiClient(options: ApiClientOptions = {}) {
	const fetchFn = options.fetch || fetch;
	const baseUrl = env.PUBLIC_API_BASE || '/api/v1';
	// Only use client-side cache when using browser fetch (not SSR's fetch)
	const useCache = browser && !options.fetch;

	async function request<T>(endpoint: string, fetchOptions: FetchOptions = {}): Promise<T> {
		const { body, headers: customHeaders, ...rest } = fetchOptions;
		const method = (rest.method || 'GET').toUpperCase();

		// Client-side GET cache check
		const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
		if (useCache && method === 'GET') {
			const cached = getCached<T>(url);
			if (cached !== null) return cached;
		}

		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			...customHeaders
		};

		const config: RequestInit = {
			credentials: 'include',
			...rest,
			headers
		};

		if (body !== undefined) {
			config.body = JSON.stringify(body);
		}

		const response = await fetchFn(url, config);
		const data = await handleResponse<T>(response);

		// Cache successful GET responses on client
		if (useCache && method === 'GET') {
			setCache(url, data);
		}

		return data;
	}

	return {
		get<T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> {
			return request<T>(endpoint, { ...options, method: 'GET' });
		},

		post<T>(
			endpoint: string,
			body?: unknown,
			options?: Omit<FetchOptions, 'method' | 'body'>
		): Promise<T> {
			return request<T>(endpoint, { ...options, method: 'POST', body });
		},

		patch<T>(
			endpoint: string,
			body?: unknown,
			options?: Omit<FetchOptions, 'method' | 'body'>
		): Promise<T> {
			return request<T>(endpoint, { ...options, method: 'PATCH', body });
		},

		put<T>(
			endpoint: string,
			body?: unknown,
			options?: Omit<FetchOptions, 'method' | 'body'>
		): Promise<T> {
			return request<T>(endpoint, { ...options, method: 'PUT', body });
		},

		delete<T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> {
			return request<T>(endpoint, { ...options, method: 'DELETE' });
		}
	};
}

// Default client for use in components (uses global fetch)
let defaultClient: ReturnType<typeof createApiClient> | null = null;

export function getApiClient(): ReturnType<typeof createApiClient> {
	if (!defaultClient) {
		defaultClient = createApiClient();
	}
	return defaultClient;
}

export type ApiClient = ReturnType<typeof createApiClient>;
