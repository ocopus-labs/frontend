import { Chat } from '@ai-sdk/svelte';
import {
	DefaultChatTransport,
	lastAssistantMessageIsCompleteWithApprovalResponses,
	type UIMessage
} from 'ai';
import { ApiError } from '$lib/api/client';
import {
	branchSession,
	chatStreamUrl,
	createSession,
	deleteSession,
	getAgentStatus,
	getSession,
	listSessions,
	sendMessageFeedback,
	updateSession,
	type AgentMessage,
	type AgentSession,
	type AgentStatus,
	type UpdateSessionParams
} from '$lib/api/agent';
import { downloadBlob } from '$lib/utils/export';
import { exportFilename, toMarkdown } from '$lib/components/assistant/export-session';

/** The assistant's name, mirrored from the backend system prompt. */
export const ASSISTANT_NAME = 'JAY';

export type AgentReadiness =
	| { state: 'unknown' }
	| { state: 'checking' }
	| {
			state: 'ready';
			toolCount: number;
			providers: { slug: string; label: string }[];
			defaultProviderSlug: string;
			/** Absent when quotas are not enforced for this business. */
			quota?: { messagesUsed: number; messagesLimit: number | null };
	  }
	| { state: 'blocked'; code: string; message: string };

/**
 * Assistant state, shared between the dedicated page and the floating panel.
 *
 * Module-scoped rather than component state so navigating between pages does
 * not tear down an in-flight conversation. Since B1 the transcript lives on the
 * server, so this holds a cache rather than the only copy — a hard refresh
 * restores the same thread from the API.
 *
 * One `Chat` per session id, memoised. Rebuilding a `Chat` mid-stream would
 * abandon the reader and lose the answer, so instances are only ever created,
 * never replaced.
 */
/**
 * Until `/status` answers, amounts have to be formatted as *something*. INR
 * matches the backend's own fallback, so the two do not disagree in the window
 * before readiness resolves.
 */
const DEFAULT_CURRENCY = 'INR';
const DEFAULT_TIMEZONE = 'UTC';

class AgentStore {
	businessId = $state<string | null>(null);
	readiness = $state<AgentReadiness>({ state: 'unknown' });

	/**
	 * How this business writes money and dates, from `/status`.
	 *
	 * Not read off the page's business context: the floating panel mounts in a
	 * layout that has one, but the renderers are shared with the dedicated
	 * page and a table of amounts in the wrong currency is worse than no table.
	 */
	currency = $state(DEFAULT_CURRENCY);
	timezone = $state(DEFAULT_TIMEZONE);

	/** Sidebar list. Ordered by the server: pinned first, then most recent. */
	sessions = $state<AgentSession[]>([]);
	sessionsLoading = $state(false);
	sessionsError = $state<string | null>(null);
	/** Set while a further page of sessions exists; null once the list is whole. */
	sessionsCursor = $state<string | null>(null);
	sessionsLoadingMore = $state(false);

	/**
	 * Per-session marker for the next page of *older* messages.
	 *
	 * `undefined` means "not known yet" (the transcript has not been fetched),
	 * `null` means "this is the whole thread". The distinction matters: the
	 * "load earlier" control must not appear before the first load has settled.
	 */
	messageCursors = $state<Record<string, string | null>>({});
	loadingOlder = $state<string | null>(null);
	/** Current search term; empty means "everything". */
	query = $state('');
	showArchived = $state(false);

	/** Floating-panel visibility. The panel binds to a real session from B1. */
	panelOpen = $state(false);
	/** The session the panel is showing; null until one is created for it. */
	panelSessionId = $state<string | null>(null);

	/**
	 * Text typed on the empty-state page before a session existed.
	 *
	 * Creating a session and navigating takes a round trip; rather than block
	 * the composer behind it, the text is parked here and sent by the session
	 * page once it mounts.
	 */
	pendingPrompt = $state<string | null>(null);

	/** Provider override from the model picker. Null means server default. */
	providerSlug = $state<string | null>(null);

	/**
	 * Per-message state the SDK's `UIMessage` has no room for.
	 *
	 * `Chat` owns `messages`, and its part array is the AI SDK's shape — there is
	 * nowhere in it for a rating or a token count. Both are contract fields that
	 * arrive with the persisted transcript, so they are kept beside it, keyed by
	 * message id, and seeded on hydrate.
	 */
	messageFeedback = $state<Record<string, 'up' | 'down'>>({});
	messageUsage = $state<Record<string, NonNullable<AgentMessage['usage']>>>({});

	/** Message id currently open in the inline editor; null when none is. */
	editingMessageId = $state<string | null>(null);

	/** Session currently being exported, so its menu item can show progress. */
	exporting = $state<string | null>(null);

	#chats = new Map<string, Chat>();
	/** Sessions whose transcript has already been fetched. */
	#hydrated = new Set<string>();

	// ==================== binding ====================

	/**
	 * Point the store at a business. Everything cached belongs to the previous
	 * one, so switching businesses drops it all — a session id from another
	 * tenant is a 404 at best.
	 */
	bind(businessId: string) {
		if (this.businessId === businessId) return;
		this.businessId = businessId;
		this.readiness = { state: 'unknown' };
		this.currency = DEFAULT_CURRENCY;
		this.timezone = DEFAULT_TIMEZONE;
		this.sessions = [];
		this.sessionsError = null;
		this.sessionsCursor = null;
		this.messageCursors = {};
		this.query = '';
		this.showArchived = false;
		this.panelSessionId = null;
		this.pendingPrompt = null;
		this.providerSlug = null;
		this.messageFeedback = {};
		this.messageUsage = {};
		this.editingMessageId = null;
		this.exporting = null;
		this.#chats.clear();
		this.#hydrated.clear();
	}

	// ==================== readiness ====================

	async checkReadiness(fetchFn?: typeof fetch) {
		if (!this.businessId) return;
		this.readiness = { state: 'checking' };
		try {
			const status: AgentStatus = await getAgentStatus(this.businessId, {
				fetch: fetchFn
			});
			if (status.ready) {
				// Kept flat rather than inside `readiness` because every table cell
				// and every amount in the thread reads it, and threading a
				// discriminated union through five renderers to get a currency
				// code buys nothing.
				this.currency = status.locale?.currency ?? DEFAULT_CURRENCY;
				this.timezone = status.locale?.timezone ?? DEFAULT_TIMEZONE;
			}
			this.readiness = status.ready
				? {
						state: 'ready',
						toolCount: status.toolCount,
						providers: status.providers,
						defaultProviderSlug: status.defaultProviderSlug,
						...(status.quota ? { quota: status.quota } : {})
					}
				: { state: 'blocked', code: status.code, message: status.message };
		} catch (e) {
			// A 403 from the feature gate arrives here as an `ApiError` carrying
			// `FEATURE_DISABLED`. Collapsing everything to `NETWORK` told the
			// operator to check their connection when the real answer — and the
			// action that fixes it — was already in the response body.
			this.readiness = {
				state: 'blocked',
				code: errorCode(e) ?? 'NETWORK',
				message: e instanceof Error ? e.message : 'Could not reach the assistant.'
			};
		}
	}

	// ==================== sessions ====================

	async loadSessions(fetchFn?: typeof fetch) {
		if (!this.businessId) return;
		this.sessionsLoading = true;
		this.sessionsError = null;
		try {
			const { sessions, nextCursor } = await listSessions(
				this.businessId,
				{
					...(this.query.trim() ? { q: this.query.trim() } : {}),
					...(this.showArchived ? { archived: true } : {})
				},
				{ fetch: fetchFn }
			);
			this.sessions = sessions;
			this.sessionsCursor = nextCursor ?? null;
		} catch (e) {
			this.sessionsError = e instanceof Error ? e.message : 'Could not load conversations.';
		} finally {
			this.sessionsLoading = false;
		}
	}

	/**
	 * Append the next page of sessions.
	 *
	 * The server has always returned `nextCursor`; nothing read it, so a long
	 * history simply stopped at 30 with no indication there was more.
	 */
	async loadMoreSessions() {
		if (!this.businessId || !this.sessionsCursor || this.sessionsLoadingMore) return;
		this.sessionsLoadingMore = true;
		try {
			const { sessions, nextCursor } = await listSessions(this.businessId, {
				cursor: this.sessionsCursor,
				...(this.query.trim() ? { q: this.query.trim() } : {}),
				...(this.showArchived ? { archived: true } : {})
			});
			// Deduplicated on id: a session touched between the two requests moves
			// to the top of the ordering and would otherwise arrive twice.
			const seen = new Set(this.sessions.map((s) => s.id));
			this.sessions = [...this.sessions, ...sessions.filter((s) => !seen.has(s.id))];
			this.sessionsCursor = nextCursor ?? null;
		} catch (e) {
			this.sessionsError = e instanceof Error ? e.message : 'Could not load more conversations.';
		} finally {
			this.sessionsLoadingMore = false;
		}
	}

	/** Seed the list from a SvelteKit load, avoiding a second fetch on entry. */
	primeSessions(sessions: AgentSession[], nextCursor?: string) {
		this.sessions = sessions;
		this.sessionsCursor = nextCursor ?? null;
	}

	/**
	 * Prepend the previous page of messages onto a hydrated thread.
	 *
	 * The SDK owns `chat.messages`, but the setter is public, so older history
	 * can be spliced in front of what is already there without disturbing a
	 * turn in flight. Refused while one is: replacing the array mid-stream
	 * would drop the partial assistant message being written into it.
	 */
	async loadOlderMessages(sessionId: string) {
		const before = this.messageCursors[sessionId];
		if (!this.businessId || !before || this.loadingOlder === sessionId) return;
		if (this.isBusy(sessionId)) return;

		const chat = this.#chats.get(sessionId);
		if (!chat) return;

		this.loadingOlder = sessionId;
		try {
			const detail = await getSession(this.businessId, sessionId, { before });
			// Older turns carry their own ratings and token counts; without this
			// the thumbs on a page loaded backwards render blank.
			this.#absorbMessageMeta(detail.messages);
			const older = toUiMessages(detail.messages);
			const seen = new Set(chat.messages.map((m) => m.id));
			chat.messages = [...older.filter((m) => !seen.has(m.id)), ...chat.messages];
			this.messageCursors[sessionId] = detail.prevCursor ?? null;
		} catch (e) {
			this.sessionsError = e instanceof Error ? e.message : 'Could not load earlier messages.';
		} finally {
			this.loadingOlder = null;
		}
	}

	/** Whether this thread has older messages still on the server. */
	hasOlderMessages(sessionId: string): boolean {
		return Boolean(this.messageCursors[sessionId]);
	}

	async newSession(): Promise<AgentSession | null> {
		if (!this.businessId) return null;
		const session = await createSession(this.businessId);
		this.sessions = [session, ...this.sessions];
		// A brand-new session has no transcript to fetch; marking it hydrated
		// stops the session page issuing a GET that can only return nothing.
		this.#hydrated.add(session.id);
		return session;
	}

	/**
	 * Apply a change locally first, then persist.
	 *
	 * Pin and rename are judged by whether the sidebar moves, and a round trip
	 * is long enough to read as a dropped click. On failure the previous values
	 * are put back and the error surfaced rather than swallowed.
	 */
	async patchSession(sessionId: string, params: UpdateSessionParams) {
		if (!this.businessId) return;
		const index = this.sessions.findIndex((s) => s.id === sessionId);
		const previous = index >= 0 ? { ...this.sessions[index] } : null;

		if (index >= 0) {
			this.sessions[index] = { ...this.sessions[index], ...params };
			this.#resort();
		}

		try {
			const updated = await updateSession(this.businessId, sessionId, params);
			const at = this.sessions.findIndex((s) => s.id === sessionId);
			if (at >= 0) this.sessions[at] = updated;
			// Archiving removes it from the default listing.
			if (params.archived !== undefined && params.archived !== this.showArchived) {
				this.sessions = this.sessions.filter((s) => s.id !== sessionId);
			}
		} catch (e) {
			if (previous && index >= 0) this.sessions[index] = previous;
			this.sessionsError = e instanceof Error ? e.message : 'Could not save that change.';
			throw e;
		}
	}

	async removeSession(sessionId: string) {
		if (!this.businessId) return;
		const snapshot = this.sessions;
		this.sessions = this.sessions.filter((s) => s.id !== sessionId);
		try {
			await deleteSession(this.businessId, sessionId);
			this.#chats.delete(sessionId);
			this.#hydrated.delete(sessionId);
		} catch (e) {
			this.sessions = snapshot;
			this.sessionsError = e instanceof Error ? e.message : 'Could not delete that conversation.';
			throw e;
		}
	}

	sessionById(sessionId: string): AgentSession | undefined {
		return this.sessions.find((s) => s.id === sessionId);
	}

	/**
	 * Re-read one session's metadata after a turn.
	 *
	 * The title is generated server-side after the first exchange, and the
	 * counters move on every turn — without this the sidebar keeps showing
	 * "New conversation" until the next full page load.
	 */
	async refreshSession(sessionId: string) {
		if (!this.businessId) return;
		try {
			const { session } = await getSession(this.businessId, sessionId, { limit: 1 });
			const index = this.sessions.findIndex((s) => s.id === sessionId);
			if (index >= 0) this.sessions[index] = session;
			else this.sessions = [session, ...this.sessions];
			this.#resort();
		} catch {
			// Cosmetic. A stale sidebar entry is not worth an error banner.
		}
	}

	#resort() {
		this.sessions = [...this.sessions].sort((a, b) => {
			if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
			return b.lastMessageAt.localeCompare(a.lastMessageAt);
		});
	}

	// ==================== transcripts ====================

	/**
	 * The `Chat` for a session, created on first use.
	 *
	 * `initialMessages` is only honoured at construction — the SDK owns the
	 * array afterwards — so history has to be fetched before this is called.
	 * `hydrate()` does that; this returns an empty thread if it wasn't.
	 */
	chatFor(sessionId: string, initialMessages: UIMessage[] = []): Chat {
		const existing = this.#chats.get(sessionId);
		if (existing) return existing;

		const chat = new Chat({
			id: sessionId,
			messages: initialMessages,
			transport: new DefaultChatTransport({
				api: chatStreamUrl(this.businessId ?? '', sessionId),
				// Better Auth is cookie-based and PUBLIC_API_BASE may be a
				// different origin, so cookies must be sent explicitly.
				credentials: 'include',
				/**
				 * Send one message, not the transcript.
				 *
				 * The server owns history since B1. Posting the whole array back
				 * would let a tampered client replay forged assistant turns and
				 * fabricated tool results into the model's context — and would
				 * grow the request without bound on a long thread.
				 */
				prepareSendMessagesRequest: ({ messages, body, trigger, messageId }) => {
					const provider = this.providerSlug ? { providerSlug: this.providerSlug } : {};

					if (trigger === 'regenerate-message') {
						/**
						 * A plain regeneration carries no message — the question being
						 * re-asked is already in the server's copy of the thread.
						 *
						 * `messageId` is undefined when `regenerate()` is called with no
						 * argument. By then the SDK has already sliced the assistant turn
						 * off `messages`, so the last entry is the user turn before it —
						 * and naming that is equivalent, since the server keeps a named
						 * user turn and re-asks it.
						 */
						return {
							body: {
								regenerateFromMessageId: messageId ?? messages[messages.length - 1]?.id,
								...provider,
								...body
							}
						};
					}

					// `body` is spread last so an edit-and-resend — which passes
					// `regenerateFromMessageId` through `sendMessage`'s options — arrives
					// alongside the replacement message. The server reads the pair as
					// "supersede that turn, then append this one".
					return {
						body: {
							message: messages[messages.length - 1],
							...provider,
							...body
						}
					};
				}
			}),
			// Once every pending approval in the last assistant message has a
			// response, resume the run automatically instead of making the user
			// send an empty follow-up message.
			sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
			onFinish: () => {
				void this.refreshSession(sessionId);
			}
		});

		this.#chats.set(sessionId, chat);
		return chat;
	}

	/**
	 * Load a session's stored transcript into a `Chat`, once.
	 *
	 * Re-entrant by design: the layout, the panel and a deep link can all ask
	 * for the same session, and only the first should fetch.
	 */
	async hydrate(
		sessionId: string,
		options: {
			fetch?: typeof fetch;
			messages?: AgentMessage[];
			prevCursor?: string | null;
		} = {}
	): Promise<Chat | null> {
		if (!this.businessId) return null;

		if (this.#hydrated.has(sessionId)) return this.chatFor(sessionId);

		let messages = options.messages;
		if (messages) {
			// Seeded from a route load, which carries the cursor alongside it.
			this.messageCursors[sessionId] = options.prevCursor ?? null;
		} else {
			try {
				const detail = await getSession(this.businessId, sessionId, {}, { fetch: options.fetch });
				messages = detail.messages;
				this.messageCursors[sessionId] = detail.prevCursor ?? null;
				const index = this.sessions.findIndex((s) => s.id === sessionId);
				if (index >= 0) this.sessions[index] = detail.session;
			} catch {
				// Leave it unhydrated so a retry can still succeed; the page
				// renders an empty thread rather than failing outright.
				return null;
			}
		}

		// Ratings and token counts travel with the persisted transcript but have
		// nowhere to live inside a `UIMessage`, so they are lifted out here —
		// before `toUiMessages` drops everything the SDK does not model.
		this.#absorbMessageMeta(messages);

		this.#hydrated.add(sessionId);
		return this.chatFor(sessionId, toUiMessages(messages));
	}

	#absorbMessageMeta(messages: AgentMessage[]) {
		for (const message of messages) {
			if (message.feedback) this.messageFeedback[message.id] = message.feedback;
			if (message.usage) this.messageUsage[message.id] = message.usage;
		}
	}

	/** Whether a turn is in flight for this session. */
	isBusy(sessionId: string): boolean {
		const status = this.#chats.get(sessionId)?.status;
		return status === 'submitted' || status === 'streaming';
	}

	// ==================== message actions ====================

	/**
	 * Rate an answer, applied locally first.
	 *
	 * Clicking the same thumb again clears the rating: the control reads as a
	 * toggle, and leaving it stuck on would make an accidental click permanent.
	 * Clearing is local-only — the contract has no DELETE, so the server keeps
	 * the last explicit rating. That asymmetry is deliberate: an operator
	 * un-highlighting a thumb is undoing a UI gesture, not asking to be
	 * forgotten, and inventing an endpoint for it is a contract change.
	 */
	async rateMessage(messageId: string, rating: 'up' | 'down') {
		if (!this.businessId) return;

		const previous = this.messageFeedback[messageId];
		if (previous === rating) {
			delete this.messageFeedback[messageId];
			return;
		}

		this.messageFeedback[messageId] = rating;
		try {
			await sendMessageFeedback(this.businessId, messageId, rating);
		} catch (e) {
			// Put the thumb back rather than leave it showing a rating the server
			// never took.
			if (previous) this.messageFeedback[messageId] = previous;
			else delete this.messageFeedback[messageId];
			this.sessionsError = e instanceof Error ? e.message : 'Could not save that rating.';
		}
	}

	/**
	 * Re-run the thread from a message.
	 *
	 * The SDK truncates its own copy and the server supersedes its own, by the
	 * same rule: an assistant turn is replaced, a user turn is re-asked. Refused
	 * mid-stream — regenerating while a turn is in flight would race the
	 * response being written into the array being truncated.
	 */
	async regenerate(sessionId: string, messageId: string) {
		if (this.isBusy(sessionId)) return;
		const chat = this.#chats.get(sessionId);
		if (!chat) return;

		try {
			await chat.regenerate({ messageId });
		} catch (e) {
			this.sessionsError = e instanceof Error ? e.message : 'Could not regenerate that answer.';
		}
	}

	/**
	 * Replace a question and ask it again.
	 *
	 * Two things have to agree: the SDK's local array and the server's stored
	 * thread. The local slice drops the edited turn and everything after it, and
	 * `regenerateFromMessageId` tells the server to do the same before appending
	 * the replacement — sent together, which the contract reads as
	 * edit-and-resend.
	 */
	async editAndResend(sessionId: string, messageId: string, text: string) {
		if (this.isBusy(sessionId)) return;
		const chat = this.#chats.get(sessionId);
		if (!chat) return;

		const trimmed = text.trim();
		if (!trimmed) return;

		const index = chat.messages.findIndex((m) => m.id === messageId);
		if (index < 0) return;

		const snapshot = chat.messages;
		chat.messages = chat.messages.slice(0, index);
		this.editingMessageId = null;

		try {
			await chat.sendMessage({ text: trimmed }, { body: { regenerateFromMessageId: messageId } });
		} catch (e) {
			// The turn never left, so the thread the operator was looking at is
			// still the truth. Restoring it beats leaving them with a transcript
			// that silently lost its last exchange.
			chat.messages = snapshot;
			this.sessionsError = e instanceof Error ? e.message : 'Could not resend that message.';
		}
	}

	/**
	 * Download a whole conversation as Markdown.
	 *
	 * Pages the transcript to the beginning rather than exporting what happens
	 * to be on screen. `GET /sessions/:id` returns the newest 50 by default, so
	 * exporting the cached thread would silently truncate a long conversation to
	 * its tail — and an export that drops history is worse than none, because
	 * nobody checks.
	 */
	async exportSession(sessionId: string): Promise<boolean> {
		if (!this.businessId) return false;

		this.exporting = sessionId;
		try {
			const first = await getSession(this.businessId, sessionId);
			let messages = first.messages;
			let cursor = first.prevCursor;

			// Bounded so a corrupt cursor cannot spin forever; 200 pages is far
			// past any real thread and still terminates.
			for (let page = 0; cursor && page < 200; page++) {
				const older = await getSession(this.businessId, sessionId, { before: cursor });
				if (!older.messages.length) break;
				messages = [...older.messages, ...messages];
				cursor = older.prevCursor;
			}

			const markdown = toMarkdown(first.session, messages, {
				timezone: this.timezone,
				assistantName: ASSISTANT_NAME
			});
			downloadBlob(
				new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
				exportFilename(first.session, 'md')
			);
			return true;
		} catch (e) {
			this.sessionsError = e instanceof Error ? e.message : 'Could not export that conversation.';
			return false;
		} finally {
			this.exporting = null;
		}
	}

	/**
	 * Fork the thread at a message into a new one.
	 *
	 * Returns the new session so the caller can navigate to it; the sidebar is
	 * updated here so the fork is visible even if navigation is declined.
	 */
	async branch(sessionId: string, messageId: string): Promise<AgentSession | null> {
		if (!this.businessId) return null;
		try {
			const session = await branchSession(this.businessId, sessionId, messageId);
			this.sessions = [session, ...this.sessions];
			this.#resort();
			// Not marked hydrated: the fork has a copied transcript on the server,
			// so the session page must fetch it rather than render an empty thread.
			return session;
		} catch (e) {
			this.sessionsError = e instanceof Error ? e.message : 'Could not branch that conversation.';
			return null;
		}
	}

	// ==================== panel ====================

	openPanel() {
		this.panelOpen = true;
		if (this.readiness.state === 'unknown') void this.checkReadiness();
	}

	closePanel() {
		this.panelOpen = false;
	}

	togglePanel() {
		if (this.panelOpen) this.closePanel();
		else this.openPanel();
	}

	/** The panel's own thread, created lazily so opening it costs nothing. */
	async ensurePanelSession(): Promise<string | null> {
		if (this.panelSessionId) return this.panelSessionId;
		const session = await this.newSession();
		this.panelSessionId = session?.id ?? null;
		return this.panelSessionId;
	}
}

/**
 * The stable contract code on an API failure, if there is one.
 *
 * `ApiError.data` is the parsed error body, so `code` is right there — it just
 * has to be read rather than flattened into `message`.
 */
function errorCode(error: unknown): string | null {
	if (!(error instanceof ApiError)) return null;
	const data = error.data as { code?: unknown } | undefined;
	return typeof data?.code === 'string' ? data.code : null;
}

/**
 * Persisted messages carry contract fields (`usage`, `feedback`) the SDK does
 * not know about. Only id/role/parts round-trip into a `Chat`; the rest is read
 * from the session store where it is needed.
 */
function toUiMessages(messages: AgentMessage[]): UIMessage[] {
	return messages.map((m) => ({
		id: m.id,
		role: m.role,
		parts: m.parts
	})) as UIMessage[];
}

export const agent = new AgentStore();
