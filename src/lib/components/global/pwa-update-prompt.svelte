<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { Button } from '$lib/components/ui/button';

	const {
		needRefresh: [needRefresh],
		updateServiceWorker
	} = useRegisterSW({
		onRegisteredSW(swUrl, registration) {
			if (registration) {
				// Check for updates every hour
				setInterval(
					() => {
						registration.update();
					},
					60 * 60 * 1000
				);
			}
		}
	});

	function close() {
		$needRefresh = false;
	}
</script>

{#if $needRefresh}
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
			<Button size="sm" onclick={() => updateServiceWorker(true)}>Update</Button>
		</div>
	</div>
{/if}
