<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';

	let showRefresh = $state(false);
	let waitingWorker: ServiceWorker | null = $state(null);

	if (browser && 'serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('/sw.js', { scope: '/' })
			.then((registration) => {
				// Check for updates every hour
				setInterval(() => registration.update(), 60 * 60 * 1000);

				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					if (!newWorker) return;

					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							waitingWorker = newWorker;
							showRefresh = true;
						}
					});
				});
			})
			.catch((err) => console.error('SW registration failed:', err));
	}

	function update() {
		waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
		window.location.reload();
	}

	function close() {
		showRefresh = false;
	}
</script>

{#if showRefresh}
	<div
		class="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg"
		role="alert"
	>
		<div class="text-sm">
			<p class="font-medium">New version available</p>
			<p class="text-muted-foreground">Reload to update the app.</p>
		</div>
		<div class="flex gap-2">
			<Button variant="ghost" size="sm" onclick={close}>Dismiss</Button>
			<Button size="sm" onclick={update}>Update</Button>
		</div>
	</div>
{/if}
