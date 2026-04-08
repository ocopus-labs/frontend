import { env } from '$env/dynamic/public';
import type { Session, User } from 'better-auth';

interface SessionUser extends User {
	role?: string | null;
}

export interface SessionResponse {
	session: Session;
	user: SessionUser;
}

/**
 * Fetch session from Better Auth backend using request headers.
 * This properly validates the session token with the backend.
 */
export async function getSession(headers: Headers): Promise<SessionResponse | null> {
	const baseUrl = env.PUBLIC_API_BASE?.replace(/\/api(\/v\d+)?$/, '') || 'http://localhost:3000';

	try {
		const response = await fetch(`${baseUrl}/api/auth/get-session`, {
			method: 'GET',
			headers: {
				cookie: headers.get('cookie') || ''
			}
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();

		// Better Auth returns null/empty if no session
		if (!data || !data.session) {
			return null;
		}

		return data as SessionResponse;
	} catch (error) {
		console.error('Failed to fetch session:', error);
		return null;
	}
}
