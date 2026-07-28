import { ApiError } from '$lib/api/client';

const STATUS_MESSAGES: Record<number, string> = {
	400: 'The request was invalid. Please check your input and try again.',
	401: 'Your session has expired. Please log in again.',
	403: "You don't have permission to perform this action.",
	404: 'The requested resource was not found.',
	409: 'This action conflicts with an existing resource.',
	429: 'Too many requests. Please wait a moment and try again.',
	500: 'Something went wrong on our end. Please try again later.',
	502: 'The server is temporarily unavailable. Please try again later.',
	503: 'The service is temporarily unavailable. Please try again later.'
};

const MESSAGE_PATTERNS: [RegExp, string][] = [
	[/failed to fetch/i, 'Unable to connect to the server. Please check your internet connection.'],
	[/network/i, 'A network error occurred. Please check your connection and try again.'],
	[/timeout/i, 'The request timed out. Please try again.'],
	[/aborted/i, 'The request was cancelled.']
];

/**
 * Maps raw API/network errors to user-friendly messages.
 */
export function userFriendlyError(
	error: unknown,
	fallback = 'Something went wrong. Please try again.'
): string {
	if (error instanceof ApiError) {
		return STATUS_MESSAGES[error.statusCode] || error.message || fallback;
	}

	if (error instanceof Error) {
		for (const [pattern, message] of MESSAGE_PATTERNS) {
			if (pattern.test(error.message)) {
				return message;
			}
		}
		return error.message || fallback;
	}

	if (typeof error === 'string') {
		return error || fallback;
	}

	return fallback;
}
