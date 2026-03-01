<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import type { PageData } from './$types';
	import type { AdminPlan, CreatePlanData } from '$lib/api/admin';
	import { createAdminPlan, updateAdminPlan, archiveAdminPlan } from '$lib/api/admin';

	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Package from '@lucide/svelte/icons/package';

	let { data }: { data: PageData } = $props();

	// Dialog state
	let dialogOpen = $state(false);
	let editingPlan: AdminPlan | null = $state(null);
	let isSubmitting = $state(false);

	// Form state
	let formName = $state('');
	let formSlug = $state('');
	let formDisplayName = $state('');
	let formDescription = $state('');
	let formPriceMonthly = $state(0);
	let formPriceYearly: number | undefined = $state(undefined);
	let formCurrency = $state('INR');
	let formMaxLocations = $state(1);
	let formMaxTeamMembers = $state(5);
	let formMaxOrdersPerMonth = $state(1000);
	let formUnlimitedLocations = $state(false);
	let formUnlimitedTeam = $state(false);
	let formUnlimitedOrders = $state(false);
	let formDodoProductId = $state('');
	let formIsPublic = $state(true);
	let formSortOrder = $state(0);

	// Feature toggles
	let featureKitchenDisplay = $state(false);
	let featureAnalytics = $state(false);
	let featureInventory = $state(false);
	let featureExpenses = $state(false);
	let featureApi = $state(false);
	let featureWhiteLabel = $state(false);

	function slugify(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	function handleNameInput() {
		if (!editingPlan) {
			formSlug = slugify(formName);
		}
	}

	function resetForm() {
		formName = '';
		formSlug = '';
		formDisplayName = '';
		formDescription = '';
		formPriceMonthly = 0;
		formPriceYearly = undefined;
		formCurrency = 'INR';
		formMaxLocations = 1;
		formMaxTeamMembers = 5;
		formMaxOrdersPerMonth = 1000;
		formUnlimitedLocations = false;
		formUnlimitedTeam = false;
		formUnlimitedOrders = false;
		formDodoProductId = '';
		formIsPublic = true;
		formSortOrder = 0;
		featureKitchenDisplay = false;
		featureAnalytics = false;
		featureInventory = false;
		featureExpenses = false;
		featureApi = false;
		featureWhiteLabel = false;
	}

	function openCreateDialog() {
		editingPlan = null;
		resetForm();
		dialogOpen = true;
	}

	function openEditDialog(plan: AdminPlan) {
		editingPlan = plan;
		formName = plan.name;
		formSlug = plan.slug;
		formDisplayName = plan.displayName;
		formDescription = plan.description || '';
		formPriceMonthly = Number(plan.priceMonthly);
		formPriceYearly = plan.priceYearly ? Number(plan.priceYearly) : undefined;
		formCurrency = plan.currency;
		formMaxLocations = plan.maxLocations === -1 ? 1 : plan.maxLocations;
		formMaxTeamMembers = plan.maxTeamMembers === -1 ? 5 : plan.maxTeamMembers;
		formMaxOrdersPerMonth = plan.maxOrdersPerMonth === -1 ? 1000 : plan.maxOrdersPerMonth;
		formUnlimitedLocations = plan.maxLocations === -1;
		formUnlimitedTeam = plan.maxTeamMembers === -1;
		formUnlimitedOrders = plan.maxOrdersPerMonth === -1;
		formDodoProductId = plan.dodoProductId || '';
		formIsPublic = plan.isPublic;
		formSortOrder = plan.sortOrder;
		const features = plan.features || {};
		featureKitchenDisplay = features.kitchenDisplay || false;
		featureAnalytics = features.analytics || false;
		featureInventory = features.inventory || false;
		featureExpenses = features.expenses || false;
		featureApi = features.api || false;
		featureWhiteLabel = features.whiteLabel || false;
		dialogOpen = true;
	}

	function buildFormData(): CreatePlanData {
		return {
			name: formName.trim(),
			slug: formSlug.trim(),
			displayName: formDisplayName.trim(),
			description: formDescription.trim() || undefined,
			priceMonthly: formPriceMonthly,
			priceYearly: formPriceYearly,
			currency: formCurrency,
			maxLocations: formUnlimitedLocations ? -1 : formMaxLocations,
			maxTeamMembers: formUnlimitedTeam ? -1 : formMaxTeamMembers,
			maxOrdersPerMonth: formUnlimitedOrders ? -1 : formMaxOrdersPerMonth,
			features: {
				kitchenDisplay: featureKitchenDisplay,
				analytics: featureAnalytics,
				inventory: featureInventory,
				expenses: featureExpenses,
				api: featureApi,
				whiteLabel: featureWhiteLabel
			},
			dodoProductId: formDodoProductId.trim() || undefined,
			isPublic: formIsPublic,
			sortOrder: formSortOrder
		};
	}

	function validateForm(): string | null {
		if (!formName.trim()) return 'Name is required';
		if (!formSlug.trim()) return 'Slug is required';
		if (!/^[a-z0-9-]+$/.test(formSlug.trim()))
			return 'Slug must contain only lowercase letters, numbers, and hyphens';
		if (!formDisplayName.trim()) return 'Display name is required';
		if (formPriceMonthly < 0) return 'Monthly price must be 0 or greater';
		if (formPriceYearly !== undefined && formPriceYearly < 0)
			return 'Yearly price must be 0 or greater';
		if (!formUnlimitedLocations && formMaxLocations < 1) return 'Max locations must be at least 1';
		if (!formUnlimitedTeam && formMaxTeamMembers < 1) return 'Max team members must be at least 1';
		if (!formUnlimitedOrders && formMaxOrdersPerMonth < 1)
			return 'Max orders per month must be at least 1';
		return null;
	}

	async function handleSubmit() {
		const error = validateForm();
		if (error) {
			toast.error(error);
			return;
		}

		if (isSubmitting) return;
		isSubmitting = true;

		try {
			const formData = buildFormData();
			if (editingPlan) {
				await updateAdminPlan(editingPlan.id, formData);
				toast.success('Plan updated successfully');
			} else {
				await createAdminPlan(formData);
				toast.success('Plan created successfully');
			}
			dialogOpen = false;
			await invalidate('app:plans');
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSubmitting = false;
		}
	}

	async function handleArchive(plan: AdminPlan) {
		try {
			await archiveAdminPlan(plan.id);
			toast.success(
				plan.status === 'active' ? 'Plan archived successfully' : 'Plan restored successfully'
			);
			await invalidate('app:plans');
		} catch (err) {
			toast.error(userFriendlyError(err));
		}
	}

	function formatLimit(value: number): string {
		return value === -1 ? '\u221E' : String(value);
	}

	function formatPrice(value: string | number, currency: string = 'INR'): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(Number(value));
	}

	function getStatusBadgeVariant(
		status: string
	): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (status === 'active') return 'default';
		if (status === 'archived') return 'secondary';
		return 'outline';
	}
</script>

<svelte:head>
	<title>Plans | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Subscription Plans</h1>
			<p class="text-muted-foreground">Manage pricing plans and feature tiers</p>
		</div>
		<Button onclick={openCreateDialog}>
			<Plus class="mr-2 h-4 w-4" />
			Create Plan
		</Button>
	</div>

	<!-- Plans Table -->
	<Card.Root>
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Display Name</Table.Head>
						<Table.Head>Price</Table.Head>
						<Table.Head>Limits</Table.Head>
						<Table.Head class="text-center">Subscribers</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="w-[120px]">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.plans as plan (plan.id)}
						<Table.Row>
							<Table.Cell>
								<div>
									<span class="font-medium">{plan.name}</span>
									<p class="text-xs text-muted-foreground font-mono">{plan.slug}</p>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Package class="h-4 w-4 text-muted-foreground" />
									<span>{plan.displayName}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="font-mono text-sm">
									<div>{formatPrice(plan.priceMonthly, plan.currency)}/mo</div>
									{#if plan.priceYearly}
										<div class="text-xs text-muted-foreground">
											{formatPrice(plan.priceYearly, plan.currency)}/yr
										</div>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<span class="text-sm text-muted-foreground">
									{formatLimit(plan.maxLocations)} loc / {formatLimit(plan.maxTeamMembers)} team / {formatLimit(
										plan.maxOrdersPerMonth
									)} orders
								</span>
							</Table.Cell>
							<Table.Cell class="text-center">
								<Badge variant="outline">{plan._count.subscriptions}</Badge>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusBadgeVariant(plan.status)}>
									{plan.status}
								</Badge>
								{#if !plan.isPublic}
									<Badge variant="outline" class="ml-1">Private</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										onclick={() => openEditDialog(plan)}
										aria-label="Edit plan"
									>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => handleArchive(plan)}
										aria-label={plan.status === 'active' ? 'Archive plan' : 'Restore plan'}
									>
										{#if plan.status === 'active'}
											<Archive class="h-4 w-4 text-muted-foreground" />
										{:else}
											<ArchiveRestore class="h-4 w-4 text-muted-foreground" />
										{/if}
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={7} class="py-12 text-center text-muted-foreground">
								No plans found. Create your first plan to get started.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Root>
</div>

<!-- Create / Edit Plan Dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{editingPlan ? 'Edit Plan' : 'Create Plan'}</Dialog.Title>
			<Dialog.Description>
				{editingPlan
					? 'Update the subscription plan details'
					: 'Define a new subscription plan with pricing and features'}
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-6"
		>
			<!-- Basic Info -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Basic Info
				</h3>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="plan-name">Name</Label>
						<Input
							id="plan-name"
							bind:value={formName}
							oninput={handleNameInput}
							placeholder="PRO"
							maxlength={50}
							autofocus
						/>
					</div>
					<div class="space-y-2">
						<Label for="plan-slug">Slug</Label>
						<Input
							id="plan-slug"
							bind:value={formSlug}
							placeholder="pro"
							maxlength={50}
							disabled={!!editingPlan}
						/>
						{#if editingPlan}
							<p class="text-xs text-muted-foreground">Slug cannot be changed after creation</p>
						{/if}
					</div>
				</div>
				<div class="space-y-2">
					<Label for="plan-display-name">Display Name</Label>
					<Input
						id="plan-display-name"
						bind:value={formDisplayName}
						placeholder="Professional"
						maxlength={100}
					/>
				</div>
				<div class="space-y-2">
					<Label for="plan-description">Description</Label>
					<Textarea
						id="plan-description"
						bind:value={formDescription}
						placeholder="Best for growing businesses..."
						rows={2}
					/>
				</div>
			</div>

			<Separator />

			<!-- Pricing -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Pricing
				</h3>
				<div class="grid grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="plan-price-monthly">Monthly Price</Label>
						<Input
							id="plan-price-monthly"
							type="number"
							bind:value={formPriceMonthly}
							min={0}
							max={999999.99}
							step={0.01}
						/>
					</div>
					<div class="space-y-2">
						<Label for="plan-price-yearly">Yearly Price</Label>
						<Input
							id="plan-price-yearly"
							type="number"
							value={formPriceYearly ?? ''}
							oninput={(e) => {
								const val = (e.target as HTMLInputElement).value;
								formPriceYearly = val === '' ? undefined : Number(val);
							}}
							min={0}
							max={999999.99}
							step={0.01}
							placeholder="Optional"
						/>
					</div>
					<div class="space-y-2">
						<Label for="plan-currency">Currency</Label>
						<Input
							id="plan-currency"
							bind:value={formCurrency}
							placeholder="INR"
							maxlength={10}
						/>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Limits -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Limits
				</h3>
				<div class="space-y-4">
					<div class="flex items-center justify-between gap-4">
						<div class="flex-1 space-y-2">
							<Label for="plan-max-locations">Max Locations</Label>
							<Input
								id="plan-max-locations"
								type="number"
								bind:value={formMaxLocations}
								min={1}
								disabled={formUnlimitedLocations}
							/>
						</div>
						<div class="flex items-center gap-2 pt-6">
							<Switch bind:checked={formUnlimitedLocations} id="unlimited-locations" />
							<Label for="unlimited-locations" class="text-sm">Unlimited</Label>
						</div>
					</div>
					<div class="flex items-center justify-between gap-4">
						<div class="flex-1 space-y-2">
							<Label for="plan-max-team">Max Team Members</Label>
							<Input
								id="plan-max-team"
								type="number"
								bind:value={formMaxTeamMembers}
								min={1}
								disabled={formUnlimitedTeam}
							/>
						</div>
						<div class="flex items-center gap-2 pt-6">
							<Switch bind:checked={formUnlimitedTeam} id="unlimited-team" />
							<Label for="unlimited-team" class="text-sm">Unlimited</Label>
						</div>
					</div>
					<div class="flex items-center justify-between gap-4">
						<div class="flex-1 space-y-2">
							<Label for="plan-max-orders">Max Orders / Month</Label>
							<Input
								id="plan-max-orders"
								type="number"
								bind:value={formMaxOrdersPerMonth}
								min={1}
								disabled={formUnlimitedOrders}
							/>
						</div>
						<div class="flex items-center gap-2 pt-6">
							<Switch bind:checked={formUnlimitedOrders} id="unlimited-orders" />
							<Label for="unlimited-orders" class="text-sm">Unlimited</Label>
						</div>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Features -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Features
				</h3>
				<div class="grid grid-cols-2 gap-4">
					<div class="flex items-center justify-between rounded-lg border p-3">
						<Label for="feature-kitchen" class="cursor-pointer">Kitchen Display</Label>
						<Switch bind:checked={featureKitchenDisplay} id="feature-kitchen" />
					</div>
					<div class="flex items-center justify-between rounded-lg border p-3">
						<Label for="feature-analytics" class="cursor-pointer">Analytics</Label>
						<Switch bind:checked={featureAnalytics} id="feature-analytics" />
					</div>
					<div class="flex items-center justify-between rounded-lg border p-3">
						<Label for="feature-inventory" class="cursor-pointer">Inventory</Label>
						<Switch bind:checked={featureInventory} id="feature-inventory" />
					</div>
					<div class="flex items-center justify-between rounded-lg border p-3">
						<Label for="feature-expenses" class="cursor-pointer">Expenses</Label>
						<Switch bind:checked={featureExpenses} id="feature-expenses" />
					</div>
					<div class="flex items-center justify-between rounded-lg border p-3">
						<Label for="feature-api" class="cursor-pointer">API Access</Label>
						<Switch bind:checked={featureApi} id="feature-api" />
					</div>
					<div class="flex items-center justify-between rounded-lg border p-3">
						<Label for="feature-whitelabel" class="cursor-pointer">White Label</Label>
						<Switch bind:checked={featureWhiteLabel} id="feature-whitelabel" />
					</div>
				</div>
			</div>

			<Separator />

			<!-- Integration -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Integration
				</h3>
				<div class="space-y-2">
					<Label for="plan-dodo-id">Dodo Product ID</Label>
					<Input
						id="plan-dodo-id"
						bind:value={formDodoProductId}
						placeholder="Optional - for payment gateway integration"
						maxlength={200}
					/>
				</div>
			</div>

			<Separator />

			<!-- Visibility -->
			<div class="space-y-4">
				<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Visibility
				</h3>
				<div class="grid grid-cols-2 gap-4">
					<div class="flex items-center justify-between rounded-lg border p-3">
						<div>
							<Label for="plan-public" class="cursor-pointer">Public</Label>
							<p class="text-xs text-muted-foreground">Visible on pricing page</p>
						</div>
						<Switch bind:checked={formIsPublic} id="plan-public" />
					</div>
					<div class="space-y-2">
						<Label for="plan-sort-order">Sort Order</Label>
						<Input
							id="plan-sort-order"
							type="number"
							bind:value={formSortOrder}
							min={0}
						/>
					</div>
				</div>
			</div>

			<Dialog.Footer>
				<Button
					variant="outline"
					type="button"
					onclick={() => (dialogOpen = false)}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						Saving...
					{:else}
						{editingPlan ? 'Update Plan' : 'Create Plan'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
