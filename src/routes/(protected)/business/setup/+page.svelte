<script>
	import SearchSelect from '$lib/components/global/search-select.svelte';

	let value = $state('');

	let options = $state([
		{ label: 'Option 1', value: 'option1' },
		{ label: 'Option 2', value: 'option2' },
		{ label: 'Option 3', value: 'option3' }
	]);
</script>

<SearchSelect
	bind:value
	{options}
	placeholder="Select an awards"
	emptyPlaceholder="No awards found"
/>
