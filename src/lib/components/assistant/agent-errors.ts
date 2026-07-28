/**
 * Operator-facing copy for the assistant's failure modes.
 *
 * The contract (`docs/contracts/agent-api.md`) guarantees a stable `code` on
 * every non-2xx response precisely so the UI can switch on it. Before this the
 * thread rendered `error.message` verbatim in a monospace block — which for a
 * transport failure is a stack-ish string, and for a 429 is a sentence with a
 * number in it that looks like a bug report. Neither told an operator what to
 * do next, which is the only thing an error in an operational tool is for.
 *
 * Anything unrecognised falls through to a generic entry rather than being
 * dropped: a new backend code should read as "something went wrong, here is the
 * detail", not as silence.
 */

export type AgentErrorTone = 'info' | 'warning' | 'error';

export interface AgentErrorAction {
	label: string;
	/** Route relative to the business, e.g. `settings/features`. */
	path?: string;
	/** Retrying the same turn is meaningful for transient failures only. */
	retry?: boolean;
}

export interface AgentErrorCopy {
	code: string;
	title: string;
	message: string;
	tone: AgentErrorTone;
	action?: AgentErrorAction;
}

type Entry = Omit<AgentErrorCopy, 'code' | 'message'> & { message?: string };

const ENTRIES: Record<string, Entry> = {
	NO_PROVIDER: {
		title: 'No AI provider is enabled',
		message: 'A platform administrator needs to enable a provider before the assistant can answer.',
		tone: 'warning'
	},
	NO_APPROVAL_SECRET: {
		title: 'The assistant is not fully configured',
		// Deliberately vague about which variable. Naming a specific secret to a
		// counter operator is noise; the backend logs already name it for whoever
		// can act on it.
		message:
			'A platform administrator needs to finish setting it up. Nothing you can do from here.',
		tone: 'warning'
	},
	FEATURE_DISABLED: {
		title: 'The assistant is turned off for this business',
		message: 'An owner can switch it on in Settings → Features.',
		tone: 'info',
		action: { label: 'Open features', path: 'settings/features' }
	},
	FEATURE_GRACE_READONLY: {
		title: 'Read-only while billing is sorted out',
		// Thrown by FeatureAccessGuard on every non-GET during a subscription
		// grace period, so it lands on the send button rather than on page load.
		message:
			'Your subscription needs attention, so the assistant can read but not change anything until it is renewed.',
		tone: 'warning',
		action: { label: 'Open billing', path: 'settings/billing' }
	},
	NO_TOOLS: {
		title: 'Your role has no assistant access',
		message:
			'The assistant works through your existing permissions, and this role has none it can use. Ask an owner or manager to change it.',
		tone: 'info'
	},
	INVALID_CURSOR: {
		title: 'That page marker is out of date',
		message: 'Reload to start from the top of the list.',
		tone: 'info'
	},
	NOTHING_TO_RESUME: {
		title: 'That action is no longer pending',
		message:
			'It was already approved, rejected, or the conversation moved on. Reload to see where it got to.',
		tone: 'info'
	},
	QUOTA_EXCEEDED: {
		title: "Today's assistant allowance is used up",
		message: 'It resets at midnight in your business timezone.',
		tone: 'info'
	},
	RATE_LIMITED: {
		title: 'Too many requests',
		message: 'Give it a few seconds and try again.',
		tone: 'info',
		action: { label: 'Try again', retry: true }
	},
	SESSION_NOT_FOUND: {
		title: 'That conversation is gone',
		message: 'It was deleted, or it belongs to another account.',
		tone: 'info'
	},
	NETWORK: {
		title: 'Could not reach the assistant',
		message: 'Check your connection and try again.',
		tone: 'error',
		action: { label: 'Try again', retry: true }
	}
};

const GENERIC: Entry = {
	title: 'Something went wrong',
	tone: 'error',
	action: { label: 'Try again', retry: true }
};

/**
 * Copy for a known code.
 *
 * `detail` is the server's own message. It is used only when this file has
 * nothing better to say — a message written for the specific failure beats a
 * generic one, but a generic one beats a raw transport string.
 */
export function agentErrorCopy(code: string, detail?: string): AgentErrorCopy {
	const entry = ENTRIES[code] ?? GENERIC;
	return {
		code,
		title: entry.title,
		message: entry.message ?? detail ?? 'Please try again in a moment.',
		tone: entry.tone,
		...(entry.action ? { action: entry.action } : {})
	};
}

/**
 * Recover a contract code from whatever the chat transport threw.
 *
 * `@ai-sdk/svelte` surfaces a pre-stream failure as an `Error` whose message is
 * the raw response body, so the structured error is in there — as text. Once
 * the stream has opened the status code is already sent and errors arrive as a
 * stream part instead, with no body to parse; those land on the generic entry,
 * which is correct, because a mid-stream failure has no remedy the operator
 * can act on.
 */
export function agentErrorFrom(error: unknown): AgentErrorCopy {
	const raw = error instanceof Error ? error.message : String(error ?? '');

	const code = extractCode(raw);
	if (code) return agentErrorCopy(code, extractMessage(raw));

	// A fetch that never reached the server throws a TypeError, not an HTTP
	// body — worth distinguishing, because "check your connection" is real
	// advice and "something went wrong" is not.
	if (error instanceof TypeError || /failed to fetch|networkerror/i.test(raw)) {
		return agentErrorCopy('NETWORK');
	}

	return agentErrorCopy('UNKNOWN', raw || undefined);
}

function parseBody(raw: string): Record<string, unknown> | null {
	const start = raw.indexOf('{');
	if (start === -1) return null;
	try {
		const parsed: unknown = JSON.parse(raw.slice(start));
		return typeof parsed === 'object' && parsed !== null
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function extractCode(raw: string): string | null {
	const body = parseBody(raw);
	if (body && typeof body.code === 'string') return body.code;
	// Some transports stringify the body into a longer sentence; the code is a
	// SCREAMING_SNAKE token and any of ours is distinctive enough to match.
	const match =
		/\b(NO_PROVIDER|NO_APPROVAL_SECRET|FEATURE_DISABLED|FEATURE_GRACE_READONLY|INVALID_CURSOR|NO_TOOLS|NOTHING_TO_RESUME|QUOTA_EXCEEDED|RATE_LIMITED|SESSION_NOT_FOUND)\b/.exec(
			raw
		);
	return match ? match[1] : null;
}

/**
 * The server's own sentence, used only when no entry above has a better one.
 *
 * `AllExceptionsFilter` wraps every message in an array, so a string-only check
 * matched nothing and the generic fallback always showed its placeholder copy
 * instead of the detail the server had actually sent.
 */
function extractMessage(raw: string): string | undefined {
	const body = parseBody(raw);
	if (!body) return undefined;
	if (typeof body.message === 'string' && body.message) return body.message;
	if (Array.isArray(body.message)) {
		const parts = body.message.filter((m): m is string => typeof m === 'string');
		if (parts.length) return parts.join('; ');
	}
	return undefined;
}
