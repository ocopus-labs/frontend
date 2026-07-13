<!--
	Installed from @ieedan/shadcn-svelte-extras
-->

<script lang="ts">
	import {
		type ButtonSize,
		type ButtonVariant,
		Button,
	} from '$lib/components/ui/button';
	import type { WithElementRef } from '$lib/utils.js';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { useImageCropperCancel } from './image-cropper.svelte.js';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	// Button-only props (see image-cropper-crop.svelte): avoids the button|anchor
	// intersection that rejects a button-specific onclick handler.
	let {
		ref = $bindable(null),
		variant = 'outline',
		size = 'sm',
		onclick,
		...rest
	}: WithElementRef<HTMLButtonAttributes> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
	} = $props();

	const cancelState = useImageCropperCancel();
</script>

<Button
	{...(rest as Record<string, unknown>)}
	bind:ref
	{size}
	{variant}
	onclick={(e: any) => {
		onclick?.(e);

		cancelState.onclick();
	}}
>
	<Trash2Icon />
	<span>Cancel</span>
</Button>
