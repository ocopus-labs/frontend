<script lang="ts">
	let { password = '' }: { password: string } = $props();

	let score = $derived.by(() => {
		if (!password) return 0;
		let s = 0;
		if (password.length >= 8) s++;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
		if (/\d/.test(password)) s++;
		if (/[^a-zA-Z0-9]/.test(password)) s++;
		return s;
	});

	let label = $derived(
		score === 0 ? '' : score === 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong'
	);

	let color = $derived(
		score === 0
			? 'bg-muted'
			: score === 1
				? 'bg-red-500'
				: score === 2
					? 'bg-orange-500'
					: score === 3
						? 'bg-yellow-500'
						: 'bg-green-500'
	);

	let textColor = $derived(
		score === 1
			? 'text-red-600'
			: score === 2
				? 'text-orange-600'
				: score === 3
					? 'text-yellow-600'
					: score === 4
						? 'text-green-600'
						: 'text-muted-foreground'
	);
</script>

{#if password}
	<div class="mt-1.5 space-y-1">
		<div class="flex gap-1">
			{#each [1, 2, 3, 4] as bar}
				<div
					class="h-1.5 flex-1 rounded-full transition-colors {score >= bar ? color : 'bg-muted'}"
				></div>
			{/each}
		</div>
		{#if label}
			<p class="text-xs {textColor}">{label}</p>
		{/if}
	</div>
{/if}
