<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
	<h1 class="text-4xl font-bold">{$page.status}</h1>
	<p class="text-lg text-muted-foreground">{$page.error?.message || 'Authentication error'}</p>
	<Button onclick={() => goto('/login')}>Back to Login</Button>
</div>
