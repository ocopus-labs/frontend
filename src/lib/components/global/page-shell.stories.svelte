<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PageShell from './page-shell.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';

	const { Story } = defineMeta({
		title: 'Layout/PageShell',
		component: PageShell,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet demo()}
	<Card.Root>
		<Card.Header>
			<Card.Title>Section card</Card.Title>
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-muted-foreground">
				Page content sits inside the shell's gutter and rhythm — no per-page wrappers.
			</p>
		</Card.Content>
	</Card.Root>
{/snippet}

<Story name="Full width (default)">
	<PageShell title="Orders" description="Manage incoming and completed orders">
		{@render demo()}
	</PageShell>
</Story>

<Story name="Content width">
	<PageShell width="content" title="Customer detail" description="max-w-5xl, centered">
		{@render demo()}
	</PageShell>
</Story>

<Story name="Form width">
	<PageShell width="form" title="Settings" description="max-w-2xl for forms and wizards">
		{@render demo()}
	</PageShell>
</Story>

<Story name="With header actions">
	<PageShell title="Menu items" description="With a primary action in the header">
		{#snippet actions()}
			<Button>New item</Button>
		{/snippet}
		{@render demo()}
	</PageShell>
</Story>
