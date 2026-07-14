<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SectionHeader from './section-header.svelte';
	import { Button } from '$lib/components/ui/button';

	const { Story } = defineMeta({
		title: 'Layout/SectionHeader',
		component: SectionHeader,
		tags: ['autodocs'],
		args: { title: 'Recent activity', description: 'Last 30 days' }
	});
</script>

<Story name="Default" />

<Story name="Title only" args={{ title: 'Payment methods', description: undefined }} />

<Story name="With actions">
	<SectionHeader title="Team members" description="People with access">
		{#snippet actions()}
			<Button size="sm">Invite</Button>
		{/snippet}
	</SectionHeader>
</Story>
