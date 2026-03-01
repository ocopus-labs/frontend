import { env } from '$env/dynamic/public';

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
    throw new ApiError(response.status, error.message || 'Request failed', error);
  }
  return response.json();
}

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
  // When a custom fetch is provided (SSR context), use relative URL so SvelteKit's
  // fetch auto-forwards cookies from the incoming request. For browser (global fetch),
  // use the absolute PUBLIC_API_BASE so the request reaches the correct API server.
  const baseUrl = options.fetch ? '/api' : (env.PUBLIC_API_BASE || '/api');

  async function request<T>(endpoint: string, fetchOptions: FetchOptions = {}): Promise<T> {
    const { body, headers: customHeaders, ...rest } = fetchOptions;

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

    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const response = await fetchFn(url, config);
    return handleResponse<T>(response);
  }

  return {
    get<T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> {
      return request<T>(endpoint, { ...options, method: 'GET' });
    },

    post<T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> {
      return request<T>(endpoint, { ...options, method: 'POST', body });
    },

    patch<T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> {
      return request<T>(endpoint, { ...options, method: 'PATCH', body });
    },

    put<T>(endpoint: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> {
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
