<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { locale, setLocale, SUPPORTED_LOCALES, type LocaleCode } from '$lib/i18n.svelte';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import CheckIcon from '@lucide/svelte/icons/check';

	let { class: className = '' }: { class?: string } = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {className}"
		aria-label="Change language"
	>
		<LanguagesIcon class="h-4 w-4" />
		<span class="hidden sm:inline">{SUPPORTED_LOCALES.find((l) => l.code === locale.current)?.label ?? 'English'}</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-40">
		<DropdownMenu.Label class="text-xs font-normal text-muted-foreground">Language</DropdownMenu.Label>
		<DropdownMenu.Separator />
		{#each SUPPORTED_LOCALES as loc (loc.code)}
			<DropdownMenu.Item
				onclick={() => setLocale(loc.code)}
				class="flex items-center justify-between"
			>
				<span>{loc.label}</span>
				{#if locale.current === loc.code}
					<CheckIcon class="h-4 w-4 text-primary" />
				{/if}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
