<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	/**
	 * Fallback client-side redirect to /dashboard/subscriptions/result.
	 * The server-side load function should handle the redirect before this
	 * page ever renders, but this exists as a safety net.
	 */
	onMount(() => {
		const queryString = $page.url.searchParams.toString();
		const target = queryString
			? `/dashboard/subscriptions/result?${queryString}`
			: '/dashboard/subscriptions/result';
		goto(target, { replaceState: true });
	});
</script>

<div class="flex min-h-[80vh] items-center justify-center p-4">
	<p class="text-muted-foreground">Redirecting...</p>
</div>
