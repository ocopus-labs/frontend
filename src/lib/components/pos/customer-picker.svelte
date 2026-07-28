<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { IconSearch, IconX, IconPlus, IconLoader2, IconUser } from '@tabler/icons-svelte';
	import {
		findCustomerByPhone,
		createCustomer,
		type Customer,
		type CreateCustomerPayload
	} from '$lib/api';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';

	interface Props {
		businessId: string;
		selectedCustomer?: Customer | null;
		onSelect?: (customer: Customer | null) => void;
	}

	let { businessId, selectedCustomer = $bindable(null), onSelect }: Props = $props();

	let phoneQuery = $state('');
	let isSearching = $state(false);
	let searchResult = $state<Customer | null>(null);
	let searchPerformed = $state(false);
	let showQuickAdd = $state(false);
	let quickAddName = $state('');
	let isAdding = $state(false);

	async function handleSearch() {
		if (!phoneQuery.trim()) {
			toast.error('Enter a phone number');
			return;
		}

		isSearching = true;
		searchPerformed = true;
		searchResult = null;
		showQuickAdd = false;

		try {
			const result = await findCustomerByPhone(businessId, phoneQuery.trim());
			searchResult = result.customer;
		} catch {
			// Not found — show quick-add option
			searchResult = null;
		} finally {
			isSearching = false;
		}
	}

	function selectCustomer(customer: Customer) {
		selectedCustomer = customer;
		onSelect?.(customer);
		// Reset search state
		searchResult = null;
		searchPerformed = false;
		phoneQuery = '';
		showQuickAdd = false;
	}

	function clearCustomer() {
		selectedCustomer = null;
		onSelect?.(null);
	}

	async function handleQuickAdd() {
		if (!quickAddName.trim()) {
			toast.error('Name is required');
			return;
		}

		isAdding = true;
		try {
			const payload: CreateCustomerPayload = {
				name: quickAddName.trim(),
				phone: phoneQuery.trim()
			};
			const result = await createCustomer(businessId, payload);
			toast.success('Customer created');
			selectCustomer(result.customer);
			quickAddName = '';
			showQuickAdd = false;
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isAdding = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSearch();
		}
	}
</script>

<div class="flex flex-col gap-2">
	<label class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Customer</label>

	{#if selectedCustomer}
		<!-- Selected customer chip -->
		<div class="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
			<IconUser class="h-4 w-4 text-muted-foreground" />
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium">{selectedCustomer.name}</p>
				<p class="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
			</div>
			<Button variant="ghost" size="icon" class="h-6 w-6 shrink-0" onclick={clearCustomer}>
				<IconX class="h-3.5 w-3.5" />
			</Button>
		</div>
	{:else}
		<!-- Phone search -->
		<div class="flex gap-1.5">
			<Input
				bind:value={phoneQuery}
				placeholder="Customer phone..."
				class="h-8 text-sm"
				onkeydown={handleKeydown}
			/>
			<Button
				variant="outline"
				size="icon"
				class="h-8 w-8 shrink-0"
				onclick={handleSearch}
				disabled={isSearching}
			>
				{#if isSearching}
					<IconLoader2 class="h-3.5 w-3.5 animate-spin" />
				{:else}
					<IconSearch class="h-3.5 w-3.5" />
				{/if}
			</Button>
		</div>

		{#if searchPerformed && !isSearching}
			{#if searchResult}
				<!-- Found customer -->
				<button
					class="flex items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-muted/50"
					onclick={() => selectCustomer(searchResult!)}
				>
					<IconUser class="h-4 w-4 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium">{searchResult.name}</p>
						<p class="text-xs text-muted-foreground">{searchResult.phone}</p>
					</div>
					<Badge variant="outline" class="shrink-0 text-xs">Select</Badge>
				</button>
			{:else}
				<!-- Not found — Quick Add -->
				<div class="rounded-md border border-dashed p-2">
					<p class="mb-2 text-xs text-muted-foreground">No customer found</p>
					{#if showQuickAdd}
						<div class="flex gap-1.5">
							<Input bind:value={quickAddName} placeholder="Customer name" class="h-8 text-sm" />
							<Button size="sm" class="h-8 shrink-0" onclick={handleQuickAdd} disabled={isAdding}>
								{#if isAdding}
									<IconLoader2 class="h-3.5 w-3.5 animate-spin" />
								{:else}
									Add
								{/if}
							</Button>
						</div>
					{:else}
						<Button
							variant="outline"
							size="sm"
							class="h-7 w-full text-xs"
							onclick={() => (showQuickAdd = true)}
						>
							<IconPlus class="mr-1 h-3 w-3" />
							Quick Add
						</Button>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
</div>
