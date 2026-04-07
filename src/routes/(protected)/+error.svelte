<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
	<h1 class="text-4xl font-bold">{$page.status}</h1>
	<p class="text-lg text-muted-foreground">{$page.error?.message || 'Something went wrong'}</p>
	<div class="flex gap-2">
		<Button variant="outline" onclick={() => window.location.reload()}>Try Again</Button>
		<Button onclick={() => goto('/dashboard')}>Go to Dashboard</Button>
	</div>
</div>
