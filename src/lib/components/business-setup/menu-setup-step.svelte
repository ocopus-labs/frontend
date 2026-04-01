<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Field from '$lib/components/ui/field';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { seedMenuTemplate, bulkImportMenuItems, createMenuItem, seedDefaultCategories } from '$lib/api';
	import { getMenu } from '$lib/api/menu';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Check from '@lucide/svelte/icons/check';
	import Plus from '@lucide/svelte/icons/plus';
	import Upload from '@lucide/svelte/icons/upload';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import FileUp from '@lucide/svelte/icons/file-up';
	import X from '@lucide/svelte/icons/x';

	let {
		businessId,
		businessType,
		completed = $bindable(false)
	}: {
		businessId: string;
		businessType: string;
		completed: boolean;
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
		gym: { label: 'Gym', icon: '🏋️' },
	};

	// Filter templates by business type
	const relevantTemplates = $derived(() => {
		const typeMap: Record<string, string[]> = {
			restaurant: ['indian', 'italian', 'fast-food'],
			cafe: ['cafe', 'bakery'],
			bar: ['bar'],
			salon: ['salon'],
			gym: ['gym'],
			bakery: ['bakery'],
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
			let cat = menu.categories.find(
				(c) => c.name.toLowerCase() === category.toLowerCase()
			);
			if (!cat && menu.categories.length > 0) {
				cat = menu.categories[0];
			}

			await createMenuItem(businessId, {
				name: itemName.trim(),
				price,
				categoryId: cat?.id || '',
				isAvailable: true,
			});

			addedItems = [...addedItems, { name: itemName.trim(), price, category: cat?.name || category }];
			itemName = '';
			itemPrice = '';
			completed = true;
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

		const items = lines.map((line) => {
			const [name, priceStr, category, description] = line.split(',').map((s) => s.trim());
			return {
				name: name || 'Unnamed',
				price: Number(priceStr) || 0,
				category: category || 'General',
				description: description || undefined,
			};
		}).filter((i) => i.name && i.price > 0);

		if (!items.length) {
			toast.error('No valid items found. Format: name, price, category, description');
			return;
		}

		isLoading = true;
		try {
			const result = await bulkImportMenuItems(businessId, items);
			resultMessage = `Imported ${result.itemsCreated} items across ${result.categoriesCreated} categories`;
			completed = true;
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
		<div class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
			<Check class="size-5 text-green-600" />
			<p class="text-sm font-medium text-green-800 dark:text-green-200">{resultMessage}</p>
		</div>
	{/if}

	<!-- Mode selector -->
	<div class="flex gap-2 rounded-lg border bg-muted/50 p-1">
		<button
			class="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {mode === 'template' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (mode = 'template')}
		>
			<Sparkles class="size-4" />
			Use a template
		</button>
		<button
			class="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {mode === 'manual' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (mode = 'manual')}
		>
			<PenLine class="size-4" />
			Add manually
		</button>
		<button
			class="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {mode === 'import' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (mode = 'import')}
		>
			<FileUp class="size-4" />
			Import CSV
		</button>
	</div>

	<!-- Template mode -->
	{#if mode === 'template'}
		<div class="space-y-4">
			<p class="text-sm text-muted-foreground">Choose a template to pre-populate your menu with sample items. You can edit everything later.</p>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{#each relevantTemplates() as key}
					{@const tmpl = templates[key]}
					<button
						class="flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors {selectedTemplate === key ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'}"
						onclick={() => (selectedTemplate = key)}
					>
						<span class="text-2xl">{tmpl.icon}</span>
						<span class="text-sm font-medium">{tmpl.label}</span>
						{#if selectedTemplate === key}
							<Check class="size-4 text-primary" />
						{/if}
					</button>
				{/each}
			</div>
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
	{/if}

	<!-- Manual mode -->
	{#if mode === 'manual'}
		<div class="space-y-4">
			<p class="text-sm text-muted-foreground">Add items one by one. Categories will be created automatically.</p>
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
				<Button onclick={handleAddItem} disabled={!itemName.trim() || !itemPrice || isLoading} size="default">
					{#if isLoading}
						<Loader2 class="size-4 animate-spin" />
					{:else}
						<Plus class="size-4" />
					{/if}
				</Button>
			</div>

			{#if addedItems.length > 0}
				<div class="space-y-1">
					<p class="text-sm font-medium">{addedItems.length} item{addedItems.length !== 1 ? 's' : ''} added</p>
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
	{/if}

	<!-- Import mode -->
	{#if mode === 'import'}
		<div class="space-y-4">
			<p class="text-sm text-muted-foreground">
				Paste CSV data below. Format: <code class="rounded bg-muted px-1 py-0.5 text-xs">name, price, category, description</code>
			</p>
			<Textarea
				placeholder={"Butter Chicken, 350, Main Course, Creamy tomato curry\nNaan, 60, Breads, Soft leavened bread\nMango Lassi, 120, Beverages, Sweet yogurt drink"}
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
	{/if}
</div>
