<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { updateFranchise, syncFranchiseSettings } from '$lib/api/franchise';

	import Save from '@lucide/svelte/icons/save';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);
	const userRole = $derived(data.userRole);
	const isOwner = $derived(userRole === 'franchise_owner');

	let name = $state(franchise?.name ?? '');
	let description = $state(franchise?.description ?? '');
	let saving = $state(false);
	let syncing = $state(false);
	let message = $state('');

	$effect(() => {
		if (franchise) {
			name = franchise.name;
			description = franchise.description ?? '';
		}
	});

	async function handleSave() {
		if (!franchise?.id || !isOwner) return;
		saving = true;
		message = '';
		try {
			await updateFranchise(franchise.id, { name, description });
			message = 'Franchise updated successfully';
		} catch (err: any) {
			message = err?.message || 'Failed to update franchise';
		} finally {
			saving = false;
		}
	}

	async function handleSync() {
		if (!franchise?.id || !isOwner) return;
		syncing = true;
		message = '';
		try {
			const result = await syncFranchiseSettings(franchise.id);
			message = `Settings synced to ${result.synced} locations`;
		} catch (err: any) {
			message = err?.message || 'Failed to sync settings';
		} finally {
			syncing = false;
		}
	}
</script>

<svelte:head>
	<title>Settings - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Franchise Settings</h1>
		<p class="mt-1 text-muted-foreground">
			Configure franchise details and default settings for all locations.
		</p>
	</div>

	{#if message}
		<div
			class="rounded-lg border px-4 py-3 text-sm {message.includes('Failed')
				? 'border-destructive/50 bg-destructive/10 text-destructive'
				: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'}"
		>
			{message}
		</div>
	{/if}

	<!-- General Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title>General Information</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
				class="space-y-4"
			>
				<div>
					<label for="franchise-name" class="mb-1 block text-sm font-medium">
						Franchise Name
					</label>
					<Input
						id="franchise-name"
						bind:value={name}
						disabled={!isOwner}
						placeholder="Enter franchise name"
					/>
				</div>

				<div>
					<label for="franchise-desc" class="mb-1 block text-sm font-medium">
						Description
					</label>
					<Textarea
						id="franchise-desc"
						bind:value={description}
						disabled={!isOwner}
						placeholder="Describe your franchise"
						rows={3}
					/>
				</div>

				{#if isOwner}
					<Button type="submit" disabled={saving}>
						<Save class="mr-2 h-4 w-4" />
						{saving ? 'Saving...' : 'Save Changes'}
					</Button>
				{/if}
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Sync Settings -->
	{#if isOwner}
		<Card.Root>
			<Card.Header>
				<Card.Title>Sync Settings to Locations</Card.Title>
				<p class="text-sm text-muted-foreground">
					Push franchise default settings to all locations that use "franchise" config
					source. Locations using "hybrid" or "local" mode won't be affected.
				</p>
			</Card.Header>
			<Card.Content>
				<Button variant="outline" onclick={handleSync} disabled={syncing}>
					<RefreshCw class="mr-2 h-4 w-4 {syncing ? 'animate-spin' : ''}" />
					{syncing ? 'Syncing...' : 'Sync Now'}
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Franchise Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Franchise Details</Card.Title>
		</Card.Header>
		<Card.Content>
			<dl class="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt class="font-medium text-muted-foreground">Slug</dt>
					<dd class="mt-1 font-mono text-xs">{franchise?.slug}</dd>
				</div>
				<div>
					<dt class="font-medium text-muted-foreground">Status</dt>
					<dd class="mt-1 capitalize">{franchise?.status}</dd>
				</div>
				<div>
					<dt class="font-medium text-muted-foreground">Created</dt>
					<dd class="mt-1">
						{franchise?.createdAt
							? new Date(franchise.createdAt).toLocaleDateString()
							: '-'}
					</dd>
				</div>
				<div>
					<dt class="font-medium text-muted-foreground">Locations</dt>
					<dd class="mt-1">{franchise?._count?.businesses ?? 0}</dd>
				</div>
			</dl>
		</Card.Content>
	</Card.Root>
</div>
