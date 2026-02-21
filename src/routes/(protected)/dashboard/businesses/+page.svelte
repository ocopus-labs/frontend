<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { deleteBusiness } from '$lib/api';
	import type { PageData } from './$types';

	import Plus from '@lucide/svelte/icons/plus';
	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import Settings from '@lucide/svelte/icons/settings';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Store from '@lucide/svelte/icons/store';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Wine from '@lucide/svelte/icons/wine';
	import Scissors from '@lucide/svelte/icons/scissors';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';

	let { data }: { data: PageData } = $props();

	// Business type icons mapping
	const businessTypeIcons: Record<string, any> = {
		restaurant: UtensilsCrossed,
		cafe: Coffee,
		bar: Wine,
		salon: Scissors,
		spa: Sparkles,
		gym: Dumbbell,
		retail: Store,
		clinic: Stethoscope,
		other: Building2
	};

	function getBusinessIcon(type: string) {
		return businessTypeIcons[type] || Building2;
	}

	function navigateToBusiness(business: any) {
		goto(`/${business.type}/${business.slug}/dashboard`);
	}

	function openBusinessSettings(business: any) {
		goto(`/${business.type}/${business.slug}/settings`);
	}

	let businessToDelete: any = $state(null);
	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);

	function openDeleteDialog(business: any) {
		businessToDelete = business;
		// Defer to next frame so the dropdown fully closes
		// before the AlertDialog opens (avoids Radix dismiss race)
		setTimeout(() => {
			deleteDialogOpen = true;
		}, 0);
	}

	async function confirmDelete() {
		if (!businessToDelete) return;
		isDeleting = true;
		try {
			await deleteBusiness(businessToDelete.id);
			toast.success(`"${businessToDelete.name}" deleted successfully`);
			deleteDialogOpen = false;
			businessToDelete = null;
			await invalidateAll();
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to delete business. Please try again.');
		} finally {
			isDeleting = false;
		}
	}
</script>

<svelte:head>
	<title>My Businesses | POS</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">My Businesses</h1>
			<p class="mt-2 text-muted-foreground">
				Manage all your businesses in one place.
			</p>
		</div>
		<Button href="/business/setup">
			<Plus class="mr-2 size-4" />
			Add Business
		</Button>
	</div>

	{#if data.businesses && data.businesses.length > 0}
		<Card.Root>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[300px]">Business</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Location</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Subscription</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.businesses as business (business.id)}
						{@const Icon = getBusinessIcon(business.type)}
						<Table.Row class="cursor-pointer" onclick={() => navigateToBusiness(business)}>
							<Table.Cell>
								<div class="flex items-center gap-3">
									{#if business.logo}
										<Avatar.Root class="size-10 rounded-lg">
											<Avatar.Image src={business.logo} alt={business.name} class="object-cover" />
											<Avatar.Fallback class="rounded-lg bg-muted">
												<Icon class="size-5 text-muted-foreground" />
											</Avatar.Fallback>
										</Avatar.Root>
									{:else}
										<div class="flex size-10 items-center justify-center rounded-lg bg-muted">
											<Icon class="size-5 text-muted-foreground" />
										</div>
									{/if}
									<div>
										<p class="font-medium">{business.name}</p>
										<p class="text-xs text-muted-foreground">{business.slug}</p>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline" class="capitalize">{business.type}</Badge>
							</Table.Cell>
							<Table.Cell>
								{#if business.address}
									<div class="flex items-center gap-1 text-sm text-muted-foreground">
										<MapPin class="size-3" />
										{[business.address.city, business.address.country].filter(Boolean).join(', ')}
									</div>
								{:else}
									<span class="text-muted-foreground">-</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<Badge variant={business.status === 'active' || !business.status ? 'default' : 'secondary'}>
									{business.status || 'Active'}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline">Free</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										<Button variant="ghost" size="icon" class="size-8" onclick={(e: MouseEvent) => e.stopPropagation()} aria-label="Business options">
											<MoreHorizontal class="size-4" />
										</Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onclick={() => navigateToBusiness(business)}>
											<ExternalLink class="mr-2 size-4" />
											Open Dashboard
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => openBusinessSettings(business)}>
											<Settings class="mr-2 size-4" />
											Settings
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											class="text-destructive focus:text-destructive"
											onclick={() => openDeleteDialog(business)}
										>
											<Trash2 class="mr-2 size-4" />
											Delete
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-12 text-center">
				<div class="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
					<Building2 class="size-8 text-muted-foreground" />
				</div>
				<Card.Title class="mb-2 text-xl">No businesses yet</Card.Title>
				<Card.Description class="mb-6">
					Get started by creating your first business.
				</Card.Description>
				<Button href="/business/setup" size="lg">
					<Plus class="mr-2 size-4" />
					Create Your First Business
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen} onOpenChange={(open) => { if (!open) businessToDelete = null; }}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Business</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete <strong>{businessToDelete?.name}</strong>? This action cannot be
				undone and all associated data will be permanently removed.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isDeleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isDeleting}
				onclick={confirmDelete}
			>
				{isDeleting ? 'Deleting...' : 'Delete Business'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
