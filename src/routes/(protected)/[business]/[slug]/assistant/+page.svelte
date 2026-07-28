<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/assistant/empty-state.svelte';
	import { agent } from '$lib/stores/agent.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const basePath = $derived(`/${page.params.business}/${page.params.slug}/assistant`);

	// First name only. "Hello, Rohit Kushwaha" reads like a form letter; the
	// greeting is the one place in an operational tool where that matters.
	const userName = $derived(
		typeof data.user?.name === 'string' && data.user.name.trim()
			? data.user.name.trim().split(/\s+/)[0]
			: null
	);

	let starting = $state(false);

	/**
	 * Start a thread from the first message.
	 *
	 * Creating the session is a round trip, so the text is parked on the store
	 * and sent by the session page once it mounts — the operator sees their
	 * message immediately instead of a composer that swallows it.
	 */
	async function start(text: string) {
		if (starting || !text.trim()) return;
		starting = true;
		try {
			const session = await agent.newSession();
			if (!session) return;
			agent.pendingPrompt = text;
			await goto(`${basePath}/${session.id}`);
		} finally {
			starting = false;
		}
	}
</script>

<div class="h-full min-h-0 overflow-y-auto">
	<EmptyState
		{userName}
		businessType={data.businessType as string | undefined}
		{basePath}
		onSend={(text) => void start(text)}
		sending={starting}
	/>
</div>
