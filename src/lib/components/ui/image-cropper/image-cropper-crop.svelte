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
	import { useImageCropperCrop } from './image-cropper.svelte.js';
	import CropIcon from '@lucide/svelte/icons/crop';

	// Button-only props: the exported ButtonProps is a button|anchor intersection
	// whose combined onclick/attribute union is too complex here and rejects a
	// button-specific handler. This cropper only ever renders a <button>.
	let {
		ref = $bindable(null),
		variant = 'default',
		size = 'sm',
		onclick,
		...rest
	}: WithElementRef<HTMLButtonAttributes> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
	} = $props();

	const cropState = useImageCropperCrop();
</script>

<Button
	{...(rest as Record<string, unknown>)}
	bind:ref
	{size}
	{variant}
	onclick={(e: any) => {
		onclick?.(e);

		cropState.onclick();
	}}
>
	<CropIcon />
	<span>Crop</span>
</Button>
