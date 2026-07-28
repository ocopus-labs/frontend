import type {
	AgentMessage,
	AgentSession,
	AgentStatus,
	SessionDetailResponse,
	SessionListResponse,
	UpdateSessionParams,
	UsageResponse
} from './agent';

/**
 * Fixtures standing in for the agent backend.
 *
 * These exist so the frontend track of each batch can be built and reviewed
 * before the matching backend endpoints land. They are typed against the
 * contract rather than loosely shaped: when `docs/contracts/agent-api.md` is
 * re-frozen and `agent.ts` updated, anything stale here fails to compile. That
 * is the mechanism that keeps the two tracks honest — not review discipline.
 *
 * State is in-memory and per-page-load, which is enough to exercise create /
 * rename / pin / archive / delete without a server.
 */

const now = Date.UTC(2026, 6, 28, 9, 0, 0);
const iso = (offsetMinutes: number) => new Date(now - offsetMinutes * 60_000).toISOString();

let nextId = 100;
const makeId = () => `mock-${nextId++}`;

function seedSessions(): AgentSession[] {
	return [
		{
			id: 'mock-1',
			title: "Yesterday's sales breakdown",
			pinned: true,
			archived: false,
			messageCount: 6,
			lastMessageAt: iso(35),
			createdAt: iso(120),
			providerSlug: 'groq',
			modelId: 'llama-3.3-70b-versatile'
		},
		{
			id: 'mock-2',
			title: 'Which items are low on stock?',
			pinned: false,
			archived: false,
			messageCount: 4,
			lastMessageAt: iso(240),
			createdAt: iso(300),
			providerSlug: 'groq',
			modelId: 'llama-3.3-70b-versatile'
		},
		{
			id: 'mock-3',
			title: null, // exercises the "untitled until auto-titled" state
			pinned: false,
			archived: false,
			messageCount: 1,
			lastMessageAt: iso(1500),
			createdAt: iso(1500),
			providerSlug: null,
			modelId: null
		},
		{
			id: 'mock-4',
			title: 'Staff roster for Diwali week',
			pinned: false,
			archived: true,
			messageCount: 12,
			lastMessageAt: iso(11_000),
			createdAt: iso(12_000),
			providerSlug: 'cerebras',
			modelId: 'llama-3.3-70b'
		}
	];
}

let sessions = seedSessions();

/** A thread exercising every part type the UI has to render. */
const seededMessages: Record<string, AgentMessage[]> = {
	'mock-1': [
		{
			id: 'msg-1',
			role: 'user',
			createdAt: iso(40),
			parts: [{ type: 'text', text: "What were yesterday's sales?" }]
		},
		{
			id: 'msg-2',
			role: 'assistant',
			createdAt: iso(39),
			usage: {
				promptTokens: 2140,
				completionTokens: 180,
				latencyMs: 3400,
				modelId: 'llama-3.3-70b-versatile'
			},
			parts: [
				{
					type: 'tool-get-sales-summary',
					toolName: 'get-sales-summary',
					toolCallId: 'call-1',
					state: 'output-available',
					input: { date: '2026-07-27' },
					output: {
						kind: 'record',
						fields: [
							{ label: 'Gross sales', value: 4_86_500, format: 'money' },
							{ label: 'Orders', value: 213, format: 'number' },
							{ label: 'Average order', value: 2284, format: 'money' },
							{ label: 'Refunds', value: 3200, format: 'money' }
						]
					}
				},
				{
					type: 'text',
					text: 'Yesterday you took **₹4,86,500** across **213 orders** — an average of ₹2,284 per order. Refunds were ₹3,200, under 1% of gross.'
				}
			]
		},
		{
			id: 'msg-3',
			role: 'user',
			createdAt: iso(36),
			parts: [{ type: 'text', text: 'Break that down by hour' }]
		},
		{
			id: 'msg-4',
			role: 'assistant',
			createdAt: iso(35),
			feedback: 'up',
			parts: [
				{
					type: 'tool-get-sales-summary',
					toolName: 'get-sales-summary',
					toolCallId: 'call-2',
					state: 'output-available',
					input: { date: '2026-07-27', groupBy: 'hour' },
					output: {
						kind: 'series',
						unit: 'money',
						title: 'Sales by hour',
						points: [
							{ t: iso(1_800), v: 12_400 },
							{ t: iso(1_740), v: 28_900 },
							{ t: iso(1_680), v: 61_200 },
							{ t: iso(1_620), v: 88_700 },
							{ t: iso(1_560), v: 74_300 },
							{ t: iso(1_500), v: 45_100 }
						]
					}
				},
				{ type: 'text', text: 'Your peak was the 8–9pm hour at ₹88,700.' }
			]
		}
	],
	'mock-2': [
		{
			id: 'msg-5',
			role: 'user',
			createdAt: iso(245),
			parts: [{ type: 'text', text: 'Which items are low on stock?' }]
		},
		{
			id: 'msg-6',
			role: 'assistant',
			createdAt: iso(240),
			parts: [
				{ type: 'reasoning', text: 'Checking inventory against reorder thresholds.' },
				{
					type: 'tool-list-inventory-items',
					toolName: 'list-inventory-items',
					toolCallId: 'call-3',
					state: 'output-available',
					input: { belowReorderPoint: true },
					output: {
						kind: 'table',
						title: 'Low stock',
						meta: { total: 3 },
						columns: [
							{ key: 'name', label: 'Item' },
							{ key: 'currentStock', label: 'On hand', format: 'number' },
							{ key: 'minimumStock', label: 'Reorder at', format: 'number' },
							{ key: 'unit', label: 'Unit' },
							{ key: 'status', label: 'Status', format: 'status' }
						],
						// Rows carry every field, not just the displayed columns —
						// the fixtures mirror that so a renderer that quietly
						// depends on a trimmed row fails here rather than in
						// production.
						rows: [
							{
								id: 'inv-1',
								name: 'Paneer',
								sku: 'PNR-01',
								currentStock: 2.5,
								minimumStock: 10,
								unit: 'kg',
								costPerUnit: 320,
								status: 'out_of_stock'
							},
							{
								id: 'inv-2',
								name: 'Basmati rice',
								sku: 'RCE-02',
								currentStock: 8,
								minimumStock: 25,
								unit: 'kg',
								costPerUnit: 110,
								status: 'low_stock'
							},
							{
								id: 'inv-3',
								name: 'Cooking oil',
								sku: 'OIL-01',
								currentStock: 14,
								minimumStock: 20,
								unit: 'l',
								costPerUnit: 145,
								status: 'low_stock'
							}
						]
					}
				},
				{
					type: 'text',
					text: 'Three items are below their reorder point. **Paneer** is critical at 2.5 kg against a threshold of 10 kg.'
				}
			]
		}
	],
	'mock-3': [
		{
			id: 'msg-7',
			role: 'user',
			createdAt: iso(1500),
			parts: [{ type: 'text', text: 'Cancel order 1043' }]
		},
		{
			id: 'msg-8',
			role: 'assistant',
			createdAt: iso(1499),
			parts: [
				// The consequence travels as its own part, not on the approval:
				// the SDK's approval-request chunk has no free-text field, so the
				// server writes one keyed by `toolCallId` alongside it.
				{
					type: 'data-consequence',
					id: 'call-4',
					data: {
						toolCallId: 'call-4',
						toolName: 'update-order-status',
						text: 'Mark order ORD-1043 as cancelled',
						severity: 'high'
					}
				},
				{
					// The approval state the whole gate exists for.
					type: 'tool-update-order-status',
					toolName: 'update-order-status',
					toolCallId: 'call-4',
					state: 'approval-requested',
					input: { orderId: '1043', status: 'cancelled' },
					approval: { id: 'approval-1' }
				}
			]
		}
	]
};

function findSession(id: string): AgentSession {
	const session = sessions.find((s) => s.id === id);
	if (!session) throw new Error(`Mock session not found: ${id}`);
	return session;
}

/** Simulated latency, so loading states are actually visible while developing. */
const delay = <T>(value: T, ms = 220): Promise<T> =>
	new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const mockAgentApi = {
	status: (): Promise<AgentStatus> =>
		delay({
			ready: true,
			toolCount: 204,
			providers: [
				{ slug: 'groq', label: 'Groq' },
				{ slug: 'cerebras', label: 'Cerebras' },
				{ slug: 'openrouter', label: 'OpenRouter' }
			],
			defaultProviderSlug: 'groq',
			locale: { currency: 'INR', timezone: 'Asia/Kolkata' },
			quota: { messagesUsed: 34, messagesLimit: 500 }
		}),

	listSessions: (
		params: {
			q?: string;
			archived?: boolean;
		} = {}
	): Promise<SessionListResponse> => {
		let list = sessions.filter((s) => s.archived === (params.archived ?? false));
		if (params.q) {
			const needle = params.q.toLowerCase();
			list = list.filter((s) => (s.title ?? '').toLowerCase().includes(needle));
		}
		// Pinned first, then most recent — the order the contract specifies.
		list = [...list].sort((a, b) => {
			if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
			return b.lastMessageAt.localeCompare(a.lastMessageAt);
		});
		return delay({ sessions: list });
	},

	getSession: (id: string): Promise<SessionDetailResponse> =>
		delay({ session: findSession(id), messages: seededMessages[id] ?? [] }),

	createSession: (params: { title?: string }): Promise<AgentSession> => {
		const session: AgentSession = {
			id: makeId(),
			title: params.title ?? null,
			pinned: false,
			archived: false,
			messageCount: 0,
			lastMessageAt: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			providerSlug: null,
			modelId: null
		};
		sessions = [session, ...sessions];
		return delay(session, 120);
	},

	updateSession: (id: string, params: UpdateSessionParams): Promise<AgentSession> => {
		const session = findSession(id);
		if (params.title !== undefined) session.title = params.title;
		if (params.pinned !== undefined) session.pinned = params.pinned;
		if (params.archived !== undefined) session.archived = params.archived;
		return delay(session, 120);
	},

	deleteSession: (id: string): Promise<void> => {
		sessions = sessions.filter((s) => s.id !== id);
		return delay(undefined, 120);
	},

	sendFeedback: (messageId: string, rating: 'up' | 'down'): Promise<void> => {
		// Recorded rather than discarded, so the UI can be checked against the
		// applied state — a thumbs-up that does not stick looks like a bug.
		for (const thread of Object.values(seededMessages)) {
			const message = thread.find((m) => m.id === messageId);
			if (message) {
				message.feedback = rating;
				break;
			}
		}
		return delay(undefined, 120);
	},

	usage: (): Promise<UsageResponse> =>
		delay({
			totals: { messages: 342, tokens: 1_284_000, costMinor: 0, currency: 'INR' },
			daily: Array.from({ length: 7 }, (_, i) => ({
				date: new Date(now - (6 - i) * 86_400_000).toISOString().slice(0, 10),
				messages: 30 + i * 7,
				tokens: 120_000 + i * 18_000,
				costMinor: 0
			})),
			quota: { messagesLimit: 500, resetsAt: iso(-540) }
		}),

	/** Reset in-memory state — for tests and story setup. */
	__reset: () => {
		sessions = seedSessions();
		nextId = 100;
	}
};
