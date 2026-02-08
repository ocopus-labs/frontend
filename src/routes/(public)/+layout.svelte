<script>
	import PublicHeader from '$lib/components/public/public-header.svelte';
	import PublicFooter from '$lib/components/public/public-footer.svelte';

	let { children, data } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<PublicHeader user={data.user} />
	<main class="flex-1">
		{@render children()}
	</main>
	<PublicFooter />
</div>
