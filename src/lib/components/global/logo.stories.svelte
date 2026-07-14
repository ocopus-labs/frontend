<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Logo from './logo.svelte';

	const { Story } = defineMeta({
		title: 'Brand/Logo',
		component: Logo,
		tags: ['autodocs'],
		argTypes: {
			size: { control: 'select', options: ['sm', 'md', 'lg'] },
			showWordmark: { control: 'boolean' }
		},
		args: { size: 'md', showWordmark: true }
	});
</script>

<!-- The shared brand mark. Same component used in the public header, auth layout, and ordering surfaces. -->
<Story name="Default" />

<Story name="Sizes">
	<div class="flex flex-col gap-4">
		<Logo href={null} size="sm" />
		<Logo href={null} size="md" />
		<Logo href={null} size="lg" />
	</div>
</Story>

<Story name="Mark only" args={{ showWordmark: false, href: null }} />

<Story name="Non-interactive (footer use)" args={{ href: null, size: 'sm' }} />
