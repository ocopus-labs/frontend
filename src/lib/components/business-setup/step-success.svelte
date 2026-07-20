<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import Check from '@lucide/svelte/icons/check';

	/**
	 * Confirmation shown once a wizard step has saved.
	 *
	 * Replaces a hand-rolled `border-green-200 bg-green-50 dark:…` block that was
	 * copy-pasted verbatim into three step components. Hardcoded palette colours
	 * are a review-blocking violation; `text-success` is the semantic token and
	 * stays correct in both themes.
	 */
	let { message }: { message: string } = $props();
</script>

<Alert.Root>
	<Check class="size-4 text-success" />
	<Alert.Description>{message}</Alert.Description>
</Alert.Root>
