<script lang="ts">
	import { Button, type ButtonProps } from "$lib/components/ui/button/index.js";

	let { ref = $bindable(null), ...restProps }: ButtonProps = $props();
	const btnProps = restProps as Record<string, unknown>;
</script>

<Button bind:ref type="submit" {...btnProps} />
