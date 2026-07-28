<script lang="ts" module>
	export interface AgentErrorProps {
		copy: AgentErrorCopy;
		/** Invoked by the action button when `copy.action.retry` is set. */
		onRetry?: () => void;
		class?: string;
	}
</script>

<script lang="ts">
	import { page } from '$app/state';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import type { AgentErrorCopy } from './agent-errors';
	import InfoIcon from '@lucide/svelte/icons/info';
	import AlertIcon from '@lucide/svelte/icons/triangle-alert';
	import BanIcon from '@lucide/svelte/icons/circle-x';

	let { copy, onRetry, class: className }: AgentErrorProps = $props();

	const Icon = $derived(
		copy.tone === 'error' ? BanIcon : copy.tone === 'warning' ? AlertIcon : InfoIcon
	);

	// Business-scoped routes are addressed by type + slug, not by the business
	// id the API uses, so links are built from the route params rather than
	// from `agent.businessId`.
	const href = $derived(
		copy.action?.path && page.params.business && page.params.slug
			? `/${page.params.business}/${page.params.slug}/${copy.action.path}`
			: null
	);
</script>

<Alert.Root variant={copy.tone === 'error' ? 'destructive' : 'default'} class={cn(className)}>
	<Icon class="size-4" />
	<Alert.Title>{copy.title}</Alert.Title>
	<Alert.Description class="space-y-3">
		<p class="text-sm">{copy.message}</p>
		{#if href}
			<Button variant="outline" size="sm" {href}>{copy.action?.label}</Button>
		{:else if copy.action?.retry && onRetry}
			<Button variant="outline" size="sm" onclick={onRetry}>{copy.action.label}</Button>
		{/if}
	</Alert.Description>
</Alert.Root>
