<script lang="ts">
	import { onMount } from 'svelte';
	import Wrench from '@lucide/svelte/icons/wrench';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { Button } from '$lib/components/ui/button';
	import { signOut } from '$lib/auth';

	let checking = $state(false);

	async function checkStatus() {
		checking = true;
		try {
			const res = await fetch('/api');
			if (res.ok) {
				window.location.href = '/dashboard';
				return;
			}
		} catch {
			// still down
		}
		checking = false;
	}

	// Auto-check every 30 seconds
	onMount(() => {
		const interval = setInterval(checkStatus, 30000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Under Maintenance</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center bg-background px-4">
	<div class="mx-auto max-w-md text-center">
		<div class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
			<Wrench class="size-8 text-muted-foreground" />
		</div>

		<h1 class="text-2xl font-bold tracking-tight">We'll be right back</h1>

		<p class="mt-3 text-muted-foreground">
			We're performing scheduled maintenance to improve your experience. This usually takes just a few minutes.
		</p>

		<Button variant="outline" class="mt-8" onclick={checkStatus} disabled={checking}>
			{#if checking}
				<RefreshCw class="mr-2 size-4 animate-spin" />
				Checking...
			{:else}
				<RefreshCw class="mr-2 size-4" />
				Check again
			{/if}
		</Button>

		<p class="mt-6 text-xs text-muted-foreground">
			Auto-checking every 30 seconds
		</p>

		<Button variant="ghost" class="mt-4 text-muted-foreground" onclick={() => { signOut(); window.location.href = '/login'; }}>
			<LogOut class="mr-2 size-4" />
			Sign in as admin
		</Button>
	</div>
</div>
