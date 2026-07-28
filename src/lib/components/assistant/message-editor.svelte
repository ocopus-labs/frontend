<script lang="ts" module>
	export interface MessageEditorProps {
		/** The question being rewritten. */
		initial: string;
		onSubmit: (text: string) => void;
		onCancel: () => void;
	}
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	let { initial, onSubmit, onCancel }: MessageEditorProps = $props();

	let value = $state(initial);
	let textarea = $state<HTMLTextAreaElement | null>(null);

	const dirty = $derived(value.trim().length > 0);

	/**
	 * Focus with the caret at the end, not selecting the whole thing.
	 *
	 * An edit is nearly always an amendment — a word changed, a date corrected —
	 * so a full selection means the first keystroke destroys the question the
	 * operator wanted to adjust.
	 */
	$effect(() => {
		if (!textarea) return;
		textarea.focus();
		textarea.setSelectionRange(value.length, value.length);
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onCancel();
			return;
		}
		// Enter sends, Shift+Enter breaks the line — the same contract as the
		// composer, so the two do not disagree about what Enter means.
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (dirty) onSubmit(value);
		}
	}
</script>

<div class="w-full space-y-2">
	<Textarea
		bind:ref={textarea}
		bind:value
		rows={3}
		class="resize-none"
		aria-label="Edit your message"
		onkeydown={handleKeydown}
	/>
	<div class="flex justify-end gap-2">
		<Button variant="ghost" size="sm" onclick={onCancel}>Cancel</Button>
		<Button size="sm" disabled={!dirty} onclick={() => onSubmit(value)}>Send</Button>
	</div>
</div>
