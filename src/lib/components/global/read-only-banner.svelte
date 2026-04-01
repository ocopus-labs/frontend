<script lang="ts">
	interface Props {
		role: string;
	}
	let { role }: Props = $props();

	const isReadOnly = $derived(role === 'viewer' || role === 'accountant');
</script>

{#if isReadOnly}
	<div class="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-1.5 text-center text-xs font-medium text-amber-700 dark:text-amber-300">
		READ ONLY — You have view-only access to this business
	</div>
{/if}
