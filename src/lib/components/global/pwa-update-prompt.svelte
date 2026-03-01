<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';

	let showRefresh = $state(false);
	let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined = $state();

	if (browser) {
		import('virtual:pwa-register').then(({ registerSW }) => {
			updateSW = registerSW({
				onNeedRefresh() {
					showRefresh = true;
				},
				onRegisteredSW(_swUrl, registration) {
					if (registration) {
						setInterval(
							() => {
								registration.update();
							},
							60 * 60 * 1000
						);
					}
				}
			});
		});
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
			<Button size="sm" onclick={() => updateSW?.(true)}>Update</Button>
		</div>
	</div>
{/if}
