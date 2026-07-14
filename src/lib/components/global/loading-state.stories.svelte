<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LoadingState from './loading-state.svelte';

	const { Story } = defineMeta({
		title: 'Layout/LoadingState',
		component: LoadingState,
		tags: ['autodocs'],
		argTypes: {
			variant: { control: { type: 'select' }, options: ['page', 'list', 'card', 'inline'] },
			rows: { control: { type: 'number' } },
			count: { control: { type: 'number' } }
		}
	});
</script>

<Story name="Page" args={{ variant: 'page' }} />

<Story name="List" args={{ variant: 'list', rows: 5 }} />

<Story name="Card grid" args={{ variant: 'card', count: 3 }} />

<Story name="Inline" args={{ variant: 'inline', label: 'Saving' }} />
