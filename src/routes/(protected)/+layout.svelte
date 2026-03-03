<script lang="ts">
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';

	let { children } = $props();
</script>

<ProgressBar class="text-primary" zIndex={50} />
{@render children()}
