import { env } from '$env/dynamic/public';
import { createApiClient, getApiClient } from './client';
import { mockAgentApi } from './agent.mock';

/**
 * Typed client for the assistant's session/history API.
 *
 * Transcribed from `docs/contracts/agent-api.md` (version 1.5), which is frozen
 * per batch so the frontend and backend tracks can be built in parallel. The
 * types here are the contract's only executable form — if the backend changes
 * shape without the contract being re-frozen, this file stops compiling
 * against the fixtures, which is the intended failure.
 *
 * Set `PUBLIC_AGENT_MOCK=1` to serve every call from fixtures. That is the
 * default working mode until the matching backend batch lands; the integration
 * checkpoint at the end of each batch is flipping it off.
 */

// ==================== TYPES (contract v1.5) ====================

/** ISO-8601 UTC. Render in the business timezone, never raw. */
export type Timestamp = string;

/** Opaque pagination cursor; pass back verbatim. */
export type Cursor = string;

export type MessageRole = 'user' | 'assistant';

export type ToolPartState =
	| 'input-streaming'
	| 'input-available'
	| 'approval-requested'
	| 'approval-responded'
	| 'output-available'
	| 'output-denied'
	| 'output-error';

export interface ToolApproval {
	id: string;
	approved?: boolean;
	reason?: string;
	isAutomatic?: boolean;
}

export interface ToolPart {
	type: string;
	toolName?: string;
	toolCallId: string;
	state: ToolPartState;
	input?: unknown;
	/** Envelope-shaped from B3; older transcripts hold whatever the tool returned. */
	output?: unknown;
	errorText?: string;
	approval?: ToolApproval;
}

/**
 * Plain-language statement of what a pending call will do — "Mark order
 * ORD-1043 as cancelled" — shown above Approve/Reject instead of the raw input.
 *
 * Arrives as its own part rather than on `ToolApproval` because the AI SDK's
 * approval-request chunk has no free-text field (`reason?: never` on the
 * `user-approval` branch). The server writes one keyed by `toolCallId`
 * alongside the approval request; the card looks it up by that id.
 */
export interface ConsequenceData {
	toolCallId: string;
	toolName: string;
	text: string;
	severity: 'high' | 'medium';
}

export interface ConsequencePart {
	type: 'data-consequence';
	id?: string;
	data: ConsequenceData;
}

export type MessagePart =
	{ type: 'text'; text: string } | { type: 'reasoning'; text: string } | ConsequencePart | ToolPart;

export type ValueFormat =
	'money' | 'date' | 'datetime' | 'number' | 'percent' | 'status' | 'boolean' | 'text';

export interface TableColumn {
	/** Dotted path into the row — `pricing.total` reads a nested field. */
	key: string;
	label: string;
	format?: ValueFormat;
}

export interface RecordField {
	label: string;
	value: unknown;
	format?: ValueFormat;
}

export interface SeriesPoint {
	/** An ISO date or a bucket label ('14:00', 'Mon'). */
	t: string;
	v: number;
}

/**
 * Discriminated tool output, so a renderer can be chosen without inspecting
 * tool names. Anything not yet migrated arrives without a `kind` and falls
 * through to the generic renderer rather than being dumped as JSON.
 *
 * `rows` and `data` carry the **whole** payload; `columns` and `fields` are a
 * display hint over it. Trimming the payload to the displayed columns would
 * have hidden the rest of each record from the model too, so a follow-up
 * question would cost a second tool call.
 */
export type ToolResultEnvelope =
	| {
			kind: 'table';
			title?: string;
			columns: TableColumn[];
			rows: Record<string, unknown>[];
			/** Totals, pagination and filters the payload carried besides the rows. */
			meta?: Record<string, unknown>;
	  }
	| { kind: 'record'; title?: string; fields: RecordField[]; data?: unknown }
	| {
			kind: 'series';
			title?: string;
			unit: 'money' | 'count';
			points: SeriesPoint[];
			meta?: Record<string, unknown>;
	  }
	| { kind: 'text'; title?: string; text: string }
	| { kind: 'raw'; title?: string; data: unknown };

export interface AgentSession {
	id: string;
	title: string | null;
	pinned: boolean;
	archived: boolean;
	messageCount: number;
	lastMessageAt: Timestamp;
	createdAt: Timestamp;
	providerSlug: string | null;
	modelId: string | null;
}

export interface AgentMessage {
	id: string;
	role: MessageRole;
	parts: MessagePart[];
	createdAt: Timestamp;
	feedback?: 'up' | 'down';
	usage?: {
		promptTokens: number;
		completionTokens: number;
		latencyMs: number;
		modelId: string;
	};
}

export type AgentStatus =
	| {
			ready: true;
			toolCount: number;
			providers: { slug: string; label: string }[];
			defaultProviderSlug: string;
			/**
			 * How this business writes numbers and dates. Sent here rather than
			 * read off the page's business context because the floating panel
			 * mounts outside any route that loads one.
			 */
			locale: { currency: string; timezone: string };
			quota?: { messagesUsed: number; messagesLimit: number | null };
	  }
	| { ready: false; code: string; message: string };

export interface SessionListResponse {
	sessions: AgentSession[];
	nextCursor?: Cursor;
}

export interface SessionDetailResponse {
	session: AgentSession;
	messages: AgentMessage[];
	prevCursor?: Cursor;
}

export type UsageScope = 'me' | 'business';

export interface UsageDay {
	/** Business-local calendar day, `YYYY-MM-DD`. Empty days are omitted. */
	date: string;
	messages: number;
	tokens: number;
	costMinor: number;
}

export interface UsageResponse {
	/** Echoed by the server, so a chart cannot be mislabelled client-side. */
	scope: UsageScope;
	/** The range actually applied, after the server filled in defaults. */
	from: string;
	to: string;
	/**
	 * `costMinor` is structurally `0` today — no per-model prices are persisted,
	 * so nothing has ever written a non-zero value. Render tokens, not money,
	 * until that changes. See the contract's §5 note.
	 */
	totals: { messages: number; tokens: number; costMinor: number; currency: string };
	daily: UsageDay[];
	/** Always about the caller, whatever the scope. Absent when uncapped. */
	quota?: { messagesLimit: number | null; resetsAt: Timestamp };
}

export interface ListSessionsParams {
	cursor?: Cursor;
	limit?: number;
	q?: string;
	archived?: boolean;
}

export interface UpdateSessionParams {
	title?: string;
	pinned?: boolean;
	archived?: boolean;
}

// ==================== CONFIG ====================

/** Whether fixtures stand in for the backend. See the module comment. */
export const AGENT_MOCK = env.PUBLIC_AGENT_MOCK === '1';

const base = (businessId: string) => `/business/${businessId}/agent`;

function client(fetchFn?: typeof fetch) {
	return fetchFn ? createApiClient({ fetch: fetchFn }) : getApiClient();
}

/**
 * Absolute URL for the streaming endpoint.
 *
 * Returned as a URL rather than a function because the stream is consumed by
 * `@ai-sdk/svelte`'s `DefaultChatTransport`, which owns the request itself —
 * hand-parsing a UI message stream is a reliable way to get partial tool calls
 * wrong.
 */
export function chatStreamUrl(businessId: string, sessionId: string): string {
	const apiBase = env.PUBLIC_API_BASE || '/api/v1';
	return `${apiBase}${base(businessId)}/sessions/${sessionId}/chat`;
}

// ==================== API ====================

export async function getAgentStatus(
	businessId: string,
	options?: { fetch?: typeof fetch }
): Promise<AgentStatus> {
	if (AGENT_MOCK) return mockAgentApi.status();
	return client(options?.fetch).get<AgentStatus>(`${base(businessId)}/status`);
}

export async function createSession(
	businessId: string,
	params: { title?: string } = {}
): Promise<AgentSession> {
	if (AGENT_MOCK) return mockAgentApi.createSession(params);
	return getApiClient().post<AgentSession>(`${base(businessId)}/sessions`, params);
}

export async function listSessions(
	businessId: string,
	params: ListSessionsParams = {},
	options?: { fetch?: typeof fetch }
): Promise<SessionListResponse> {
	if (AGENT_MOCK) return mockAgentApi.listSessions(params);

	const query = new URLSearchParams();
	if (params.cursor) query.set('cursor', params.cursor);
	if (params.limit) query.set('limit', String(params.limit));
	if (params.q) query.set('q', params.q);
	if (params.archived) query.set('archived', 'true');

	const qs = query.toString();
	return client(options?.fetch).get<SessionListResponse>(
		`${base(businessId)}/sessions${qs ? `?${qs}` : ''}`
	);
}

export async function getSession(
	businessId: string,
	sessionId: string,
	params: { before?: Cursor; limit?: number } = {},
	options?: { fetch?: typeof fetch }
): Promise<SessionDetailResponse> {
	if (AGENT_MOCK) return mockAgentApi.getSession(sessionId);

	const query = new URLSearchParams();
	if (params.before) query.set('before', params.before);
	if (params.limit) query.set('limit', String(params.limit));

	const qs = query.toString();
	return client(options?.fetch).get<SessionDetailResponse>(
		`${base(businessId)}/sessions/${sessionId}${qs ? `?${qs}` : ''}`
	);
}

export async function updateSession(
	businessId: string,
	sessionId: string,
	params: UpdateSessionParams
): Promise<AgentSession> {
	if (AGENT_MOCK) return mockAgentApi.updateSession(sessionId, params);
	return getApiClient().patch<AgentSession>(`${base(businessId)}/sessions/${sessionId}`, params);
}

export async function deleteSession(businessId: string, sessionId: string): Promise<void> {
	if (AGENT_MOCK) return mockAgentApi.deleteSession(sessionId);
	await getApiClient().delete(`${base(businessId)}/sessions/${sessionId}`);
}

export async function sendMessageFeedback(
	businessId: string,
	messageId: string,
	rating: 'up' | 'down',
	note?: string
): Promise<void> {
	if (AGENT_MOCK) return mockAgentApi.sendFeedback(messageId, rating);
	await getApiClient().post(`${base(businessId)}/messages/${messageId}/feedback`, {
		rating,
		note
	});
}

export async function getUsage(
	businessId: string,
	params: { from?: string; to?: string; scope?: UsageScope } = {},
	options?: { fetch?: typeof fetch }
): Promise<UsageResponse> {
	if (AGENT_MOCK) return mockAgentApi.usage(params.scope ?? 'me');

	const query = new URLSearchParams();
	if (params.from) query.set('from', params.from);
	if (params.to) query.set('to', params.to);
	// `me` is the server's default; sending it would only make the URL noisier.
	if (params.scope === 'business') query.set('scope', 'business');

	const qs = query.toString();
	return client(options?.fetch).get<UsageResponse>(
		`${base(businessId)}/usage${qs ? `?${qs}` : ''}`
	);
}

/**
 * Fork a thread at a message into a new one.
 *
 * The alternative to regenerating: rather than replacing the answer in front of
 * you, keep it and take the conversation elsewhere from that point. The copy
 * includes the named message.
 */
export async function branchSession(
	businessId: string,
	sessionId: string,
	messageId: string,
	title?: string
): Promise<AgentSession> {
	if (AGENT_MOCK) return mockAgentApi.branchSession(sessionId, messageId, title);
	return getApiClient().post<AgentSession>(`${base(businessId)}/sessions/${sessionId}/branch`, {
		messageId,
		...(title ? { title } : {})
	});
}
