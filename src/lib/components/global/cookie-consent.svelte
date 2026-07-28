<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { browser } from '$app/environment';

	const STORAGE_KEY = 'cookie-consent';

	let showBanner = $state(false);

	if (browser) {
		showBanner = !localStorage.getItem(STORAGE_KEY);
	}

	function accept(analytics: boolean) {
		const consent = {
			essential: true,
			analytics,
			acceptedAt: new Date().toISOString()
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
		showBanner = false;

		// Fire-and-forget to backend
		fetch('/api/v1/users/consent', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				consents: [
					{ type: 'essential', granted: true },
					{ type: 'analytics', granted: analytics }
				]
			})
		}).catch(() => {});
	}
</script>

{#if showBanner}
	<div
		class="fixed inset-x-0 bottom-0 z-[100] border-t bg-background/95 p-4 shadow-lg backdrop-blur md:p-6"
	>
		<div
			class="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-sm text-muted-foreground">
				We use essential cookies for the app to function. Optional analytics cookies help us
				improve.
				<a href="/privacy" class="underline hover:text-foreground">Privacy Policy</a>
			</p>
			<div class="flex shrink-0 gap-2">
				<Button variant="outline" size="sm" onclick={() => accept(false)}>Essential Only</Button>
				<Button size="sm" onclick={() => accept(true)}>Accept All</Button>
			</div>
		</div>
	</div>
{/if}
