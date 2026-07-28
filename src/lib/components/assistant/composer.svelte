<script lang="ts" module>
	export interface ComposerProps {
		onSend: (text: string) => void;
		/** Drives the submit button between send / spinner / stop. */
		status?: ChatStatus;
		onStop?: () => void;
		placeholder?: string;
		/** Focus on mount — right for a dedicated page, wrong for a panel FAB. */
		autofocus?: boolean;
		/** Tighter padding for the floating panel. */
		compact?: boolean;
		/** Rendered between the textarea and the toolbar, e.g. the status line. */
		above?: Snippet;
		class?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as PromptInput from '$lib/components/ai-elements/prompt-input/index.js';
	import type {
		ChatStatus,
		PromptInputMessage
	} from '$lib/components/ai-elements/prompt-input/index.js';
	import { agent, ASSISTANT_NAME } from '$lib/stores/agent.svelte';
	import ProviderSelector from './provider-selector.svelte';
	import { cn } from '$lib/utils.js';

	let {
		onSend,
		status = 'ready',
		onStop,
		placeholder = `Ask ${ASSISTANT_NAME}…`,
		autofocus = false,
		compact = false,
		above,
		class: className
	}: ComposerProps = $props();

	let textareaRef = $state<HTMLTextAreaElement | null>(null);

	const readiness = $derived(agent.readiness);
	const providers = $derived(readiness.state === 'ready' ? readiness.providers : []);
	const defaultSlug = $derived(readiness.state === 'ready' ? readiness.defaultProviderSlug : null);
	const busy = $derived(status === 'submitted' || status === 'streaming');

	$effect(() => {
		// Focused after mount rather than with the `autofocus` attribute, which
		// only fires on initial document load and does nothing when the composer
		// appears from a client-side navigation.
		if (autofocus) queueMicrotask(() => textareaRef?.focus());
	});

	function handleSubmit(message: PromptInputMessage) {
		const text = message.text.trim();
		if (!text || busy) return;
		onSend(text);
	}
</script>

<!--
	Enter to send and Shift+Enter for a newline come from PromptInput.Textarea,
	as does stop-while-streaming on the submit button. Reimplementing either
	here would be a second, subtly different keyboard contract in the same app.
-->
<PromptInput.Root onSubmit={handleSubmit} class={cn(className)}>
	<PromptInput.Body>
		<PromptInput.Textarea
			bind:ref={textareaRef}
			{placeholder}
			class={compact ? 'max-h-32 text-base' : 'max-h-48 text-base'}
		/>
	</PromptInput.Body>

	{#if above}
		<div class="px-3">{@render above()}</div>
	{/if}

	<PromptInput.Toolbar class="justify-between gap-2">
		<PromptInput.Tools>
			<ProviderSelector
				{providers}
				{defaultSlug}
				value={agent.providerSlug}
				onSelect={(slug) => (agent.providerSlug = slug)}
				disabled={busy}
			/>
		</PromptInput.Tools>
		<!-- `touch` rather than the default 28px: this is the single control the
		     whole surface depends on, and it is used on counter tablets. -->
		<PromptInput.Submit {status} {onStop} size="icon-touch" />
	</PromptInput.Toolbar>
</PromptInput.Root>
