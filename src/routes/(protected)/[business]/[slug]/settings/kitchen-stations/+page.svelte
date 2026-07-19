<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconLoader2,
		IconAlertTriangle
	} from '@tabler/icons-svelte';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import {
		createKitchenStation,
		updateKitchenStation,
		deleteKitchenStation,
		getUnassignedCategories,
		type KitchenStation
	} from '$lib/api/kitchen-station';
	import { getCategories } from '$lib/api/menu';

	let { data }: { data: PageData } = $props();

	// ---- reactive state ----
	let stations = $state<KitchenStation[]>((data as any).stations ?? []);
	let unassignedCategories = $state<{ id: string; name: string }[]>(
		(data as any).unassignedCategories ?? []
	);

	// All categories across all stations (for the edit dialog)
	// We build this from stations + unassigned
	let allKnownCategories = $derived(() => {
		const map = new Map<string, string>();
		for (const cat of unassignedCategories) {
			map.set(cat.id, cat.name);
		}
		for (const station of stations) {
			for (const id of station.categoryIds) {
				if (!map.has(id)) map.set(id, id); // fallback to id if name unknown
			}
		}
		return map;
	});

	// Per-station category names helper
	function stationCategoryNames(station: KitchenStation): string[] {
		return station.categoryIds.map((id) => allKnownCategories().get(id) ?? id);
	}

	// ---- dialog state ----
	let showDialog = $state(false);
	let editingStation = $state<KitchenStation | null>(null);
	let isSubmitting = $state(false);

	// form fields
	let formName = $state('');
	let formColor = $state('#6366f1');
	let formCategoryIds = $state<string[]>([]);

	// delete confirm
	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state('');

	// preset colors
	const PRESET_COLORS = [
		'#6366f1', // indigo
		'#f59e0b', // amber
		'#10b981', // emerald
		'#ef4444', // red
		'#3b82f6', // blue
		'#8b5cf6', // violet
		'#ec4899', // pink
		'#14b8a6' // teal
	];

	// Categories visible in the dialog = station's own categories + unassigned
	const dialogCategories = $derived(() => {
		if (!editingStation) return unassignedCategories;
		// merge: unassigned + this station's categories (already assigned to it)
		const unassignedIds = new Set(unassignedCategories.map((c) => c.id));
		const stationOwned = editingStation.categoryIds
			.filter((id) => !unassignedIds.has(id))
			.map((id) => ({ id, name: allKnownCategories().get(id) ?? id }));
		return [...stationOwned, ...unassignedCategories];
	});

	function openAdd() {
		editingStation = null;
		formName = '';
		formColor = '#6366f1';
		formCategoryIds = [];
		showDialog = true;
	}

	function openEdit(station: KitchenStation) {
		editingStation = station;
		formName = station.name;
		formColor = station.displayColor || '#6366f1';
		formCategoryIds = [...station.categoryIds];
		showDialog = true;
	}

	function toggleCategory(id: string) {
		if (formCategoryIds.includes(id)) {
			formCategoryIds = formCategoryIds.filter((c) => c !== id);
		} else {
			formCategoryIds = [...formCategoryIds, id];
		}
	}

	async function refreshUnassigned() {
		try {
			const res = await getUnassignedCategories((data as any).businessId);
			unassignedCategories = res.categories;
		} catch {
			// non-critical
		}
	}

	async function handleSave() {
		if (!formName.trim()) {
			toast.error('Station name is required');
			return;
		}
		isSubmitting = true;
		const businessId = (data as any).businessId;
		try {
			if (editingStation) {
				const res = await updateKitchenStation(businessId, editingStation.id, {
					name: formName.trim(),
					displayColor: formColor,
					categoryIds: formCategoryIds
				});
				stations = stations.map((s) => (s.id === editingStation!.id ? res.station : s));
				toast.success('Station updated');
			} else {
				const res = await createKitchenStation(businessId, {
					name: formName.trim(),
					displayColor: formColor,
					categoryIds: formCategoryIds
				});
				stations = [...stations, res.station];
				toast.success('Station created');
			}
			showDialog = false;
			await refreshUnassigned();
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSubmitting = false;
		}
	}

	function handleDelete(id: string) {
		deleteTargetId = id;
		deleteDialogOpen = true;
	}

	async function confirmDelete() {
		const businessId = (data as any).businessId;
		try {
			await deleteKitchenStation(businessId, deleteTargetId);
			stations = stations.filter((s) => s.id !== deleteTargetId);
			toast.success('Station deleted');
			await refreshUnassigned();
		} catch (err) {
			toast.error(userFriendlyError(err));
		}
	}
</script>

<PageShell
	back
	title="Kitchen Stations"
	description="Assign menu categories to kitchen stations for targeted order routing"
>
	<div>
		<SettingsSection
			title="Routing coverage"
			description="Every menu category should belong to a station so its items only show on that station's KDS screen."
		>
			{#snippet action()}
				<Button onclick={openAdd}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Station
				</Button>
			{/snippet}

			<!-- Unassigned categories warning -->
			{#if unassignedCategories.length > 0}
				<div
					class="flex items-center gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
				>
					<IconAlertTriangle class="h-4 w-4 shrink-0" />
					<span>
						{unassignedCategories.length}
						{unassignedCategories.length === 1 ? 'category is' : 'categories are'} not assigned to any
						station — items in these categories will appear on all KDS screens.
					</span>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">All menu categories are assigned to a station.</p>
			{/if}
		</SettingsSection>
	</div>

	<!-- Station cards -->
	{#if stations.length === 0}
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<p class="text-muted-foreground">
					No kitchen stations yet. Add one to start routing orders.
				</p>
				<Button class="mt-4" onclick={openAdd}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Station
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each stations as station (station.id)}
				<Card.Root class="relative">
					<Card.Header class="pb-3">
						<div class="flex items-center gap-3">
							<!-- Color dot -->
							<span
								class="h-4 w-4 shrink-0 rounded-full ring-1 ring-border"
								style="background-color: {station.displayColor || '#6366f1'};"
							></span>
							<Card.Title class="text-base">{station.name}</Card.Title>
							{#if !station.isActive}
								<Badge variant="secondary" class="ml-auto text-xs">Inactive</Badge>
							{/if}
						</div>
					</Card.Header>
					<Card.Content class="pb-3">
						<p class="text-sm text-muted-foreground">
							{station.categoryIds.length}
							{station.categoryIds.length === 1 ? 'category' : 'categories'}
						</p>
						{#if station.categoryIds.length > 0}
							<div class="mt-2 flex flex-wrap gap-1">
								{#each stationCategoryNames(station).slice(0, 4) as name}
									<Badge variant="outline" class="text-xs">{name}</Badge>
								{/each}
								{#if station.categoryIds.length > 4}
									<Badge variant="outline" class="text-xs">
										+{station.categoryIds.length - 4} more
									</Badge>
								{/if}
							</div>
						{/if}
					</Card.Content>
					<Card.Footer class="flex justify-end gap-2 pt-0">
						<Button variant="ghost" size="sm" onclick={() => openEdit(station)}>
							<IconPencil class="mr-1 h-3.5 w-3.5" />
							Edit
						</Button>
						<Button
							variant="ghost"
							size="sm"
							class="text-destructive hover:text-destructive"
							onclick={() => handleDelete(station.id)}
						>
							<IconTrash class="mr-1 h-3.5 w-3.5" />
							Delete
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</PageShell>

<!-- Add / Edit Station Dialog -->
<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingStation ? 'Edit Station' : 'Add Station'}</Dialog.Title>
			<Dialog.Description>
				{editingStation
					? 'Update this kitchen station name, color, and category assignments.'
					: 'Create a new kitchen station and assign menu categories to it.'}
			</Dialog.Description>
		</Dialog.Header>

		<Field.Group class="py-4">
			<!-- Name -->
			<Field.Field>
				<Field.Label for="station-name">Station Name</Field.Label>
				<Input
					id="station-name"
					bind:value={formName}
					placeholder="e.g. Grill, Fryer, Pastry"
					autofocus
				/>
			</Field.Field>

			<!-- Color -->
			<Field.Field>
				<Field.Label>Display Color</Field.Label>
				<div class="flex flex-wrap items-center gap-2">
					{#each PRESET_COLORS as color}
						<Button
							variant="ghost"
							size="icon"
							class="size-7 rounded-full ring-offset-2 transition-all hover:bg-transparent {formColor ===
							color
								? 'ring-2 ring-primary'
								: 'hover:ring-2 hover:ring-muted-foreground'}"
							style="background-color: {color};"
							onclick={() => (formColor = color)}
							aria-label="Select color {color}"
						/>
					{/each}
					<Input
						type="color"
						bind:value={formColor}
						class="size-7 cursor-pointer rounded border-input bg-transparent p-0.5"
						aria-label="Custom color picker"
					/>
					<span class="ml-1 text-xs text-muted-foreground">{formColor}</span>
				</div>
			</Field.Field>

			<!-- Categories -->
			<Field.Field>
				<Field.Label>
					Assign Categories
					<span class="ml-1 text-xs font-normal text-muted-foreground">
						({formCategoryIds.length} selected)
					</span>
				</Field.Label>
				{#if dialogCategories().length === 0}
					<p class="text-sm text-muted-foreground">
						All categories are already assigned to other stations.
					</p>
				{:else}
					<div class="max-h-52 overflow-y-auto rounded-md border p-1">
						{#each dialogCategories() as cat (cat.id)}
							{@const checked = formCategoryIds.includes(cat.id)}
							<!--
								Not a <button> wrapper: Checkbox renders its own <button>, and
								nesting one inside another is invalid HTML that the parser
								splits apart during hydration. The Label carries the click
								target instead.
							-->
							<div
								class="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent {checked
									? 'bg-accent'
									: ''}"
							>
								<Checkbox
									id="cat-{cat.id}"
									{checked}
									onCheckedChange={() => toggleCategory(cat.id)}
								/>
								<Label for="cat-{cat.id}" class="flex-1 cursor-pointer font-normal">
									{cat.name}
								</Label>
							</div>
						{/each}
					</div>
				{/if}
			</Field.Field>
		</Field.Group>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={handleSave} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{editingStation ? 'Save Changes' : 'Create Station'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirm Dialog -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Station"
	description="This will permanently delete the station. Its categories will become unassigned. This action cannot be undone."
	confirmLabel="Delete Station"
	variant="destructive"
	onConfirm={confirmDelete}
/>
