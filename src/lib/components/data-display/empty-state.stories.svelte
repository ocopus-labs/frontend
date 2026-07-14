<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import EmptyState from './empty-state.svelte';

	const { Story } = defineMeta({
		title: 'Layout/EmptyState',
		component: EmptyState,
		tags: ['autodocs'],
		argTypes: {
			type: {
				control: { type: 'select' },
				options: ['empty', 'no-results', 'no-data', 'offline', 'error']
			},
			size: { control: { type: 'select' }, options: ['sm', 'default', 'lg'] }
		},
		args: { title: 'No orders yet', description: 'New orders will appear here as they come in.' }
	});
</script>

<Story name="Empty" args={{ type: 'empty' }} />

<Story
	name="No results"
	args={{ type: 'no-results', title: 'No matches', description: 'Try a different search term.' }}
/>

<Story
	name="Offline"
	args={{ type: 'offline', title: "You're offline", description: 'Reconnect to see live data.' }}
/>

<Story
	name="Error"
	args={{ type: 'error', title: 'Something went wrong', description: 'Please try again.' }}
/>

<Story name="With action" args={{ type: 'empty', actionLabel: 'Create order' }} />
