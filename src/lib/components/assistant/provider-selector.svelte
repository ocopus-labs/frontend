<script lang="ts" module>
	export interface ProviderSelectorProps {
		/** Enabled providers from `/status`. Fewer than two hides the control. */
		providers: { slug: string; label: string }[];
		/** The server's own first choice, shown when nothing is overridden. */
		defaultSlug?: string | null;
		/** Current override; `null` means "whatever the server picks". */
		value: string | null;
		onSelect: (slug: string | null) => void;
		disabled?: boolean;
	}
</script>

<script lang="ts">
	import * as ModelSelector from '$lib/components/ai-elements/model-selector/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronIcon from '@lucide/svelte/icons/chevrons-up-down';

	let {
		providers,
		defaultSlug = null,
		value,
		onSelect,
		disabled
	}: ProviderSelectorProps = $props();

	let open = $state(false);

	const label = $derived(
		value
			? (providers.find((p) => p.slug === value)?.label ?? value)
			: (providers.find((p) => p.slug === defaultSlug)?.label ?? 'Automatic')
	);

	function choose(slug: string | null) {
		onSelect(slug);
		open = false;
	}
</script>

<!--
	Hidden below two providers rather than shown disabled: a picker with one
	option is a control that teaches the operator nothing and costs a tap to
	discover that.
-->
{#if providers.length > 1}
	<ModelSelector.Root bind:open>
		<ModelSelector.Trigger>
			<Button variant="ghost" size="sm" class="gap-1.5 text-muted-foreground" {disabled}>
				<span class="max-w-32 truncate">{label}</span>
				<ChevronIcon class="size-3.5 shrink-0" aria-hidden="true" />
			</Button>
		</ModelSelector.Trigger>

		<ModelSelector.Content>
			<ModelSelector.Input placeholder="Search providers…" />
			<ModelSelector.List>
				<ModelSelector.Empty>No provider matches that.</ModelSelector.Empty>
				<ModelSelector.Group>
					<Command.Item value="automatic" onSelect={() => choose(null)}>
						<CheckIcon class={value === null ? 'size-4' : 'size-4 opacity-0'} aria-hidden="true" />
						<span>Automatic</span>
						<span class="ml-auto text-xs text-muted-foreground">
							{providers.find((p) => p.slug === defaultSlug)?.label ?? 'Server default'}
						</span>
					</Command.Item>
					{#each providers as provider (provider.slug)}
						<Command.Item value={provider.label} onSelect={() => choose(provider.slug)}>
							<CheckIcon
								class={value === provider.slug ? 'size-4' : 'size-4 opacity-0'}
								aria-hidden="true"
							/>
							<ModelSelector.Name>{provider.label}</ModelSelector.Name>
						</Command.Item>
					{/each}
				</ModelSelector.Group>
			</ModelSelector.List>
		</ModelSelector.Content>
	</ModelSelector.Root>
{/if}
