<script lang="ts">
	import type { Snippet } from 'svelte';
	import PageHeader from './page-header.svelte';

	type Width = 'full' | 'content' | 'form';

	interface Props {
		/**
		 * Content width:
		 * - `full`    — full-bleed, no max-width (default; POS ops & admin lists)
		 * - `content` — readable column, `max-w-5xl` centered (detail/content pages)
		 * - `form`    — narrow, `max-w-2xl` centered (settings, wizards, single forms)
		 */
		width?: Width;
		/** Render a standard PageHeader at the top. Omit to supply your own header via children. */
		title?: string;
		description?: string;
		actions?: Snippet;
		/** Mobile-only back button on the header (see PageHeader). */
		back?: string | boolean;
		class?: string;
		children: Snippet;
	}

	let {
		width = 'full',
		title,
		description,
		actions,
		back,
		class: className = '',
		children
	}: Props = $props();

	const widthClass: Record<Width, string> = {
		full: '',
		content: 'max-w-5xl',
		form: 'max-w-2xl'
	};
</script>

<!--
	The single page container. Owns the horizontal gutter (px-4 md:px-6), vertical
	rhythm (py + gap), max-width, and centering — so pages stop hand-rolling their
	own `flex flex-1 flex-col gap-… py-… px-…` wrappers (which drifted 6+ ways).
-->
<div
	class="@container/page mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6 {widthClass[
		width
	]} {className}"
>
	{#if title}
		<PageHeader {title} {description} {actions} {back} gutter={false} />
	{/if}
	{@render children()}
</div>
