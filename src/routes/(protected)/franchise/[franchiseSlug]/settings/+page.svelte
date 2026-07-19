<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Field from '$lib/components/ui/field';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import { toast } from 'svelte-sonner';
	import { updateFranchise, syncFranchiseSettings } from '$lib/api/franchise';

	import Save from '@lucide/svelte/icons/save';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Info from '@lucide/svelte/icons/info';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);
	const userRole = $derived(data.userRole);
	const isOwner = $derived(userRole === 'franchise_owner');

	// The server-side values. These are `$derived` so they track `data.franchise`
	// across navigations instead of freezing on whatever the first load returned.
	const franchiseName = $derived(franchise?.name ?? '');
	const franchiseDescription = $derived(franchise?.description ?? '');

	// Editable copies. Seeded (and re-seeded) from the derived server values.
	let name = $state('');
	let description = $state('');
	let saving = $state(false);
	let syncing = $state(false);

	$effect(() => {
		name = franchiseName;
		description = franchiseDescription;
	});

	async function handleSave() {
		if (!franchise?.id || !isOwner) return;
		saving = true;
		try {
			await updateFranchise(franchise.id, { name, description });
			toast.success('Franchise updated');
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update franchise');
		} finally {
			saving = false;
		}
	}

	async function handleSync() {
		if (!franchise?.id || !isOwner) return;
		syncing = true;
		try {
			const result = await syncFranchiseSettings(franchise.id);
			toast.success(
				result.synced === 1
					? 'Settings pushed to 1 location'
					: `Settings pushed to ${result.synced} locations`
			);
		} catch (err: any) {
			toast.error(err?.message || 'Failed to sync settings');
		} finally {
			syncing = false;
		}
	}

	interface DetailRow {
		label: string;
		value: string;
		mono?: boolean;
		capitalize?: boolean;
		numeric?: boolean;
	}

	const detailRows = $derived<DetailRow[]>([
		{ label: 'Slug', value: franchise?.slug ?? '—', mono: true },
		{ label: 'Status', value: franchise?.status ?? '—', capitalize: true },
		{
			label: 'Created',
			value: franchise?.createdAt ? new Date(franchise.createdAt).toLocaleDateString() : '—',
			numeric: true
		},
		{
			label: 'Locations',
			value: String(franchise?._count?.businesses ?? 0),
			numeric: true
		}
	]);
</script>

<svelte:head>
	<title>Settings - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<SectionHeader
	title="Franchise settings"
	description="Franchise details and the defaults you push down to locations."
>
	{#snippet actions()}
		{#if !isOwner}
			<Badge variant="outline">Read-only</Badge>
		{/if}
	{/snippet}
</SectionHeader>

{#if !isOwner}
	<Alert.Root>
		<Info class="size-4" />
		<Alert.Title>You can view but not change these settings</Alert.Title>
		<Alert.Description>
			Only the franchise owner can edit franchise details or push settings to locations.
		</Alert.Description>
	</Alert.Root>
{/if}

<!-- ── Franchise details ─────────────────────────────────────────────────── -->
<Card.Root>
	<Card.Header>
		<Card.Title class="text-section-title">Franchise details</Card.Title>
		<Card.Description>
			The name and description shown across the franchise dashboard and to your team.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
			class="space-y-6"
		>
			<Field.Group>
				<Field.Field>
					<Field.Label for="franchise-name">Franchise name</Field.Label>
					<Input
						id="franchise-name"
						type="text"
						bind:value={name}
						disabled={!isOwner}
						placeholder="e.g. Bella Vista Group"
						aria-describedby="franchise-name-desc"
					/>
					<Field.Description id="franchise-name-desc">
						Appears in the franchise header and in every location's franchise switcher.
					</Field.Description>
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="franchise-desc">Description</Field.Label>
					<Textarea
						id="franchise-desc"
						bind:value={description}
						disabled={!isOwner}
						placeholder="What this franchise is, in a sentence or two."
						rows={3}
						aria-describedby="franchise-desc-desc"
					/>
					<Field.Description id="franchise-desc-desc">
						Optional. Internal context for franchise staff — customers never see this.
					</Field.Description>
				</Field.Field>
			</Field.Group>

			{#if isOwner}
				<Button type="submit" disabled={saving || !name.trim()}>
					<Save class="mr-2 size-4" />
					{saving ? 'Saving…' : 'Save changes'}
				</Button>
			{/if}
		</form>
	</Card.Content>
</Card.Root>

<!-- ── Settings sync ─────────────────────────────────────────────────────── -->
{#if isOwner}
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-section-title">Settings sync</Card.Title>
			<Card.Description>
				Pushes the franchise default settings down to your locations. Only locations set to the
				<span class="font-medium text-foreground">franchise</span> config source are updated —
				locations on
				<span class="font-medium text-foreground">hybrid</span> or
				<span class="font-medium text-foreground">local</span> keep their own settings and are skipped.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			<p class="text-sm text-muted-foreground">
				This overwrites the synced locations' settings with the franchise defaults, so any local
				edits made there will be replaced.
			</p>
			<Button variant="outline" onclick={handleSync} disabled={syncing}>
				<RefreshCw class="mr-2 size-4 {syncing ? 'animate-spin' : ''}" />
				{syncing ? 'Syncing…' : 'Sync now'}
			</Button>
		</Card.Content>
	</Card.Root>
{/if}

<!-- ── Read-only details ─────────────────────────────────────────────────── -->
<Card.Root>
	<Card.Header>
		<Card.Title class="text-section-title">Details</Card.Title>
		<Card.Description>Identifiers and metadata for this franchise.</Card.Description>
	</Card.Header>
	<Card.Content class="p-0">
		<dl class="divide-y divide-border border-t border-border">
			{#each detailRows as row (row.label)}
				<div class="flex items-center justify-between gap-4 px-6 py-3">
					<dt class="text-sm text-muted-foreground">{row.label}</dt>
					<dd
						class="text-sm font-medium {row.mono ? 'font-mono text-xs' : ''} {row.capitalize
							? 'capitalize'
							: ''} {row.numeric ? 'tabular-nums' : ''}"
					>
						{row.value}
					</dd>
				</div>
			{/each}
		</dl>
	</Card.Content>
</Card.Root>
