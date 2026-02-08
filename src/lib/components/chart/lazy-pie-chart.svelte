<script lang="ts">
	let props: Record<string, any> = $props();
	let Component: any = $state(null);
	import('$lib/components/chart/pie-chart.svelte').then((m) => (Component = m.default));
</script>

{#if Component}
	<Component {...props} />
{:else}
	<div class="flex items-center justify-center py-10">
		<div
			class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
		></div>
	</div>
{/if}
