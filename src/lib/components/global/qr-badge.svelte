<script lang="ts">
	// Small marker for orders placed via customer QR. Violet is a deliberate
	// categorical hue (distinct from the brand primary/status colors) — kept in
	// ONE place here so it's no longer copy-pasted across the order pages, and can
	// be promoted to a theme token later if we add a categorical palette.
	let { label = 'QR', class: className = '' }: { label?: string; class?: string } = $props();
</script>

<span
	class="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900 dark:text-violet-200 {className}"
>
	{label}
</span>
