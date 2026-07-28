<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Field from '$lib/components/ui/field';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { toast } from 'svelte-sonner';
	import {
		seedMenuTemplate,
		bulkImportMenuItems,
		createMenuItem,
		seedDefaultCategories
	} from '$lib/api';
	import { getMenu } from '$lib/api/menu';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Check from '@lucide/svelte/icons/check';
	import StepSuccess from './step-success.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Upload from '@lucide/svelte/icons/upload';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import FileUp from '@lucide/svelte/icons/file-up';
	import X from '@lucide/svelte/icons/x';

	let {
		businessId,
		businessType,
		completed = $bindable(false),
		summary = $bindable('')
	}: {
		businessId: string;
		businessType: string;
		completed: boolean;
		summary?: string;
	} = $props();

	type Mode = 'template' | 'manual' | 'import';
	let mode = $state<Mode>('template');
	let isLoading = $state(false);

	// Template state
	const templates: Record<string, { label: string; icon: string }> = {
		indian: { label: 'Indian', icon: '🍛' },
		italian: { label: 'Italian', icon: '🍝' },
		cafe: { label: 'Cafe', icon: '☕' },
		bar: { label: 'Bar', icon: '🍹' },
		bakery: { label: 'Bakery', icon: '🧁' },
		'fast-food': { label: 'Fast Food', icon: '🍔' },
		salon: { label: 'Salon', icon: '💇' },
		gym: { label: 'Gym', icon: '🏋️' }
	};

	// Filter templates by business type
	const relevantTemplates = $derived(() => {
		const typeMap: Record<string, string[]> = {
			restaurant: ['indian', 'italian', 'fast-food'],
			cafe: ['cafe', 'bakery'],
			bar: ['bar'],
			salon: ['salon'],
			gym: ['gym'],
			bakery: ['bakery']
		};
		const keys = typeMap[businessType] || Object.keys(templates);
		return keys.filter((k) => k in templates);
	});
	let selectedTemplate = $state('');

	// Manual add state
	let itemName = $state('');
	let itemPrice = $state('');
	let itemCategory = $state('');
	let addedItems = $state<{ name: string; price: number; category: string }[]>([]);
	let categories = $state<string[]>([]);

	// Import state
	let csvText = $state('');

	// Result tracking
	let resultMessage = $state('');

	async function handleTemplateSeed() {
		if (!selectedTemplate) {
			toast.error('Select a template first');
			return;
		}
		isLoading = true;
		try {
			const result = await seedMenuTemplate(businessId, selectedTemplate);
			resultMessage = `Created ${result.itemsCreated} items across ${result.categoriesCreated} categories`;
			completed = true;
			summary = resultMessage;
			toast.success(resultMessage);
		} catch (e: any) {
			toast.error(e.message || 'Failed to seed template');
		} finally {
			isLoading = false;
		}
	}

	async function handleAddItem() {
		if (!itemName.trim() || !itemPrice) return;
		const price = Number(itemPrice);
		if (isNaN(price) || price <= 0) {
			toast.error('Enter a valid price');
			return;
		}
		const category = itemCategory.trim() || 'General';

		isLoading = true;
		try {
			// Ensure categories exist
			if (!categories.length) {
				await seedDefaultCategories(businessId);
				const menu = await getMenu(businessId);
				categories = menu.categories.map((c) => c.name);
			}

			// Find or use first category
			const menu = await getMenu(businessId);
			let cat = menu.categories.find((c) => c.name.toLowerCase() === category.toLowerCase());
			if (!cat && menu.categories.length > 0) {
				cat = menu.categories[0];
			}

			await createMenuItem(businessId, {
				name: itemName.trim(),
				price,
				categoryId: cat?.id || '',
				isAvailable: true
			});

			addedItems = [
				...addedItems,
				{ name: itemName.trim(), price, category: cat?.name || category }
			];
			itemName = '';
			itemPrice = '';
			completed = true;
			summary = `${addedItems.length} item${addedItems.length === 1 ? '' : 's'} added manually`;
			toast.success(`Added "${addedItems[addedItems.length - 1].name}"`);
		} catch (e: any) {
			toast.error(e.message || 'Failed to add item');
		} finally {
			isLoading = false;
		}
	}

	async function handleCsvImport() {
		const lines = csvText
			.trim()
			.split('\n')
			.filter((l) => l.trim());
		if (!lines.length) {
			toast.error('Paste some CSV data first');
			return;
		}

		const items = lines
			.map((line) => {
				const [name, priceStr, category, description] = line.split(',').map((s) => s.trim());
				return {
					name: name || 'Unnamed',
					price: Number(priceStr) || 0,
					category: category || 'General',
					description: description || undefined
				};
			})
			.filter((i) => i.name && i.price > 0);

		if (!items.length) {
			toast.error('No valid items found. Format: name, price, category, description');
			return;
		}

		isLoading = true;
		try {
			const result = await bulkImportMenuItems(businessId, items);
			resultMessage = `Imported ${result.itemsCreated} items across ${result.categoriesCreated} categories`;
			completed = true;
			summary = resultMessage;
			toast.success(resultMessage);
		} catch (e: any) {
			toast.error(e.message || 'Import failed');
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">Set up your menu</h1>
		<p class="mt-2 text-muted-foreground">Add the items your customers can order.</p>
	</div>

	{#if completed && resultMessage}
		<StepSuccess message={resultMessage} />
	{/if}

	<!-- Tabs primitive rather than three hand-rolled <button>s: it provides the
	     tablist/tab/tabpanel roles and arrow-key navigation the old markup had
	     no way to express. -->
	<Tabs.Root bind:value={mode}>
		<Tabs.List class="w-full">
			<Tabs.Trigger value="template" class="flex-1 gap-2">
				<Sparkles class="size-4" />
				Use a template
			</Tabs.Trigger>
			<Tabs.Trigger value="manual" class="flex-1 gap-2">
				<PenLine class="size-4" />
				Add manually
			</Tabs.Trigger>
			<Tabs.Trigger value="import" class="flex-1 gap-2">
				<FileUp class="size-4" />
				Import CSV
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="template">
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Choose a template to pre-populate your menu with sample items. You can edit everything
					later.
				</p>
				<ToggleGroup.Root
					type="single"
					bind:value={selectedTemplate}
					class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
				>
					{#each relevantTemplates() as key (key)}
						{@const tmpl = templates[key]}
						<ToggleGroup.Item
							value={key}
							aria-label={tmpl.label}
							class="h-auto flex-col gap-2 rounded-lg border-2 p-4 text-center data-[state=on]:border-primary data-[state=on]:bg-primary/5"
						>
							<span class="text-2xl">{tmpl.icon}</span>
							<span class="text-sm font-medium">{tmpl.label}</span>
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
				<Button onclick={handleTemplateSeed} disabled={!selectedTemplate || isLoading || completed}>
					{#if isLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Seeding menu...
					{:else if completed}
						<Check class="mr-2 size-4" />
						Menu created
					{:else}
						Use this template
					{/if}
				</Button>
			</div>
		</Tabs.Content>

		<Tabs.Content value="manual">
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Add items one by one. Categories will be created automatically.
				</p>
				<div class="flex gap-3">
					<Field.Group class="flex-1">
						<Field.Field>
							<Input placeholder="Item name" bind:value={itemName} />
						</Field.Field>
					</Field.Group>
					<Field.Group class="w-28">
						<Field.Field>
							<Input type="number" placeholder="Price" bind:value={itemPrice} />
						</Field.Field>
					</Field.Group>
					<Button
						onclick={handleAddItem}
						disabled={!itemName.trim() || !itemPrice || isLoading}
						size="default"
					>
						{#if isLoading}
							<Loader2 class="size-4 animate-spin" />
						{:else}
							<Plus class="size-4" />
						{/if}
					</Button>
				</div>

				{#if addedItems.length > 0}
					<div class="space-y-1">
						<p class="text-sm font-medium">
							{addedItems.length} item{addedItems.length !== 1 ? 's' : ''} added
						</p>
						<div class="max-h-48 space-y-1 overflow-auto rounded-lg border p-2">
							{#each addedItems as item}
								<div class="flex items-center justify-between rounded px-2 py-1 text-sm">
									<span>{item.name}</span>
									<span class="text-muted-foreground">{item.price}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</Tabs.Content>

		<Tabs.Content value="import">
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Paste CSV data below. Format: <code class="rounded bg-muted px-1 py-0.5 text-xs"
						>name, price, category, description</code
					>
				</p>
				<Textarea
					placeholder={'Butter Chicken, 350, Main Course, Creamy tomato curry\nNaan, 60, Breads, Soft leavened bread\nMango Lassi, 120, Beverages, Sweet yogurt drink'}
					bind:value={csvText}
					rows={6}
					class="font-mono text-sm"
				/>
				<Button onclick={handleCsvImport} disabled={!csvText.trim() || isLoading || completed}>
					{#if isLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Importing...
					{:else if completed}
						<Check class="mr-2 size-4" />
						Imported
					{:else}
						<Upload class="mr-2 size-4" />
						Import items
					{/if}
				</Button>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
