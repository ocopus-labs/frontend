<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center"
>
	<div class="text-6xl">😕</div>
	<h1 class="text-2xl font-bold">Oops, something went wrong</h1>
	<p class="max-w-md text-muted-foreground">
		We couldn't load this page. Please try again or ask a staff member for help.
	</p>
	<Button onclick={() => window.location.reload()}>Try Again</Button>
</div>
