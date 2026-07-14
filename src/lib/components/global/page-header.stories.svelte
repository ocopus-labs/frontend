<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PageHeader from './page-header.svelte';
	import { Button } from '$lib/components/ui/button';

	const { Story } = defineMeta({
		title: 'Layout/PageHeader',
		component: PageHeader,
		tags: ['autodocs'],
		args: { title: 'Orders', description: 'Manage incoming and completed orders' }
	});
</script>

<Story name="Default" />

<Story name="Title only" args={{ title: 'Dashboard', description: undefined }} />

<Story name="With actions">
	<PageHeader title="Menu items" description="Everything on your menu">
		{#snippet actions()}
			<Button variant="outline">Import</Button>
			<Button>New item</Button>
		{/snippet}
	</PageHeader>
</Story>

<Story name="With mobile back button" args={{ title: 'Order #1042', back: true }} />
