<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { syncOfflineOrders } from '$lib/utils/offline-sync';

	interface Props {
		businessId: string;
	}

	let { businessId }: Props = $props();

	let isOnline = $state(browser ? navigator.onLine : true);
	let pendingCount = $state(0);

	async function refreshCount() {
		const { getPendingOrderCount } = await import('$lib/utils/offline-store');
		pendingCount = await getPendingOrderCount(businessId);
	}

	function handleOnline() {
		isOnline = true;
		syncOfflineOrders(businessId).then(refreshCount);
	}

	function handleOffline() {
		isOnline = false;
		refreshCount();
	}

	onMount(() => {
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		refreshCount();
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		}
	});
</script>

{#if !isOnline}
	<div class="bg-orange-500 px-4 py-1.5 text-center text-sm text-white">
		You are offline — orders will be saved locally
		{#if pendingCount > 0}
			<span class="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{pendingCount} pending</span>
		{/if}
	</div>
{:else if pendingCount > 0}
	<div class="bg-blue-500 px-4 py-1.5 text-center text-sm text-white">
		{pendingCount} offline order{pendingCount === 1 ? '' : 's'} pending sync...
	</div>
{/if}
