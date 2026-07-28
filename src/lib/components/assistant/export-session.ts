import type { AgentMessage, AgentSession, MessagePart, ToolPart } from '$lib/api/agent';

/**
 * Turning a saved conversation into something an operator can keep.
 *
 * Markdown rather than a screenshot or a PDF: it pastes into a ticket, a
 * handover note or an email without losing the tool calls, and it is the one
 * format that survives being read by a person and by a machine.
 *
 * Pure string building, deliberately free of Svelte and of the DOM. The
 * frontend has no unit runner today (only Playwright), so this is not covered
 * yet — but an export that silently drops half a thread is the kind of bug
 * nobody notices until they need the export, and keeping the logic in a plain
 * module is what makes covering it a matter of adding a runner rather than
 * untangling a component.
 */

/** A tool part carries both the typed (`tool-*`) and MCP-discovered shapes. */
function isToolPart(part: MessagePart): part is ToolPart {
	return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
}

/**
 * A text part.
 *
 * A plain `part.type === 'text'` check does not narrow the union: `ToolPart.type`
 * is `string`, so TypeScript cannot rule it out on the tag alone. Checking the
 * payload too is what makes this a guard rather than a hope.
 */
function isTextPart(part: MessagePart): part is { type: 'text'; text: string } {
	return part.type === 'text' && typeof (part as { text?: unknown }).text === 'string';
}

/** The tool's own name, which for a `tool-x` part is in the type suffix. */
function toolNameOf(part: ToolPart): string {
	return part.toolName ?? (part.type.startsWith('tool-') ? part.type.slice(5) : 'tool');
}

/**
 * One line describing what a tool call did.
 *
 * Deliberately not the payload. A result table can be thousands of rows, and a
 * transcript that inlines them is unreadable *and* copies customer data into a
 * file that leaves the app — the same reasoning that keeps tool payloads
 * encrypted at rest server-side.
 */
function describeToolPart(part: ToolPart): string {
	const name = toolNameOf(part);
	switch (part.state) {
		case 'output-available':
			return `_Used **${name}**_`;
		case 'output-denied':
			return `_Declined **${name}**_`;
		case 'output-error':
			return `_**${name}** failed${part.errorText ? `: ${part.errorText}` : ''}_`;
		case 'approval-requested':
			return `_**${name}** — waiting for approval_`;
		default:
			return `_Called **${name}**_`;
	}
}

function renderParts(parts: MessagePart[]): string {
	const chunks: string[] = [];
	for (const part of parts) {
		if (isTextPart(part)) {
			if (part.text.trim()) chunks.push(part.text.trim());
		} else if (isToolPart(part)) {
			chunks.push(describeToolPart(part));
		}
		// `reasoning` is omitted on purpose: it is the model thinking aloud, it
		// is not part of the answer, and it is the least reliable text in the
		// thread to paste into a ticket someone will act on.
	}
	return chunks.join('\n\n');
}

export interface ExportOptions {
	/** IANA zone from `/status`; timestamps are the operator's, not UTC's. */
	timezone: string;
	/** Shown as the assistant's name in the transcript. */
	assistantName: string;
}

function formatTimestamp(iso: string, timezone: string): string {
	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: timezone
		}).format(new Date(iso));
	} catch {
		// An unknown zone must not take the whole export down; the ISO string is
		// unambiguous even if it is not local.
		return iso;
	}
}

/** The whole conversation as a Markdown document. */
export function toMarkdown(
	session: AgentSession,
	messages: AgentMessage[],
	options: ExportOptions
): string {
	const title = session.title?.trim() || 'Conversation';
	const lines = [
		`# ${title}`,
		'',
		`_Exported ${formatTimestamp(new Date().toISOString(), options.timezone)}_`,
		''
	];

	for (const message of messages) {
		const who = message.role === 'user' ? 'You' : options.assistantName;
		lines.push(`## ${who}`, `_${formatTimestamp(message.createdAt, options.timezone)}_`, '');
		const body = renderParts(message.parts);
		lines.push(body || '_(no text)_', '');
	}

	return lines.join('\n');
}

/**
 * A filename that is safe on every filesystem the app runs on.
 *
 * Windows rejects `\/:*?"<>|`, and a model-generated title cheerfully contains
 * several of them — a thread titled "Sales: today vs yesterday?" would produce
 * a download that silently fails.
 */
export function exportFilename(session: AgentSession, extension: string): string {
	const base = (session.title?.trim() || 'conversation')
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 60)
		.toLowerCase();
	const stamp = new Date().toISOString().slice(0, 10);
	return `${base || 'conversation'}-${stamp}.${extension}`;
}
