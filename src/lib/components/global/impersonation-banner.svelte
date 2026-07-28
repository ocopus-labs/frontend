<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { stopImpersonation } from '$lib/api/admin';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import LogOut from '@lucide/svelte/icons/log-out';

	let isImpersonating = $state(false);
	let stopping = $state(false);

	// Check for impersonation cookie on mount
	onMount(() => {
		isImpersonating = document.cookie.includes('admin_session_token');
	});

	async function handleStopImpersonation() {
		if (stopping) return;
		stopping = true;
		try {
			await stopImpersonation();
			toast.success('Impersonation session ended');
			// Hard redirect to pick up restored admin cookies
			window.location.href = '/admin/users';
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to stop impersonation'));
			stopping = false;
		}
	}
</script>

{#if isImpersonating}
	<div
		class="fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-black shadow-md"
		role="alert"
		aria-live="assertive"
	>
		<ShieldAlert class="h-4 w-4 shrink-0" />
		<span class="text-sm font-medium">
			You are currently impersonating a user. Actions will be performed as this user.
		</span>
		<Button
			variant="outline"
			size="sm"
			class="ml-2 border-black/30 bg-amber-600 text-black hover:bg-amber-700"
			onclick={handleStopImpersonation}
			disabled={stopping}
			aria-label="Stop impersonation"
		>
			<LogOut class="mr-1 h-3 w-3" />
			{stopping ? 'Stopping...' : 'Stop Impersonation'}
		</Button>
	</div>
{/if}
