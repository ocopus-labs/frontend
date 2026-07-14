<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { openDrawer, closeDrawer, type CashDrawerSession } from '$lib/api/cash-drawer';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const businessId = $derived(data.businessId);
	let currentSession = $state<CashDrawerSession | null>(data.currentSession);
	let history = $state(data.history);

	// Open drawer state
	let showOpenDialog = $state(false);
	let openingAmount = $state(0);
	let isOpening = $state(false);

	// Close drawer state
	let showCloseDialog = $state(false);
	let actualAmount = $state(0);
	let closeNotes = $state('');
	let isClosing = $state(false);

	// Denomination counter
	const denominations = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
	let denomCounts = $state<Record<number, number>>({});

	$effect(() => {
		if (showOpenDialog) {
			openingAmount = 0;
		}
	});

	$effect(() => {
		if (showCloseDialog) {
			actualAmount = expectedAmount;
			closeNotes = '';
			denomCounts = {};
		}
	});

	const denomTotal = $derived(denominations.reduce((sum, d) => sum + d * (denomCounts[d] || 0), 0));

	// Sync denom total to actual amount
	$effect(() => {
		if (denomTotal > 0) {
			actualAmount = denomTotal;
		}
	});

	const cashInTotal = $derived(currentSession?.cashIn?.reduce((sum, t) => sum + t.amount, 0) ?? 0);
	const cashOutTotal = $derived(
		currentSession?.cashOut?.reduce((sum, t) => sum + t.amount, 0) ?? 0
	);
	const expectedAmount = $derived(
		currentSession ? Number(currentSession.openingAmount) + cashInTotal - cashOutTotal : 0
	);

	async function handleOpenDrawer() {
		if (openingAmount < 0) return;
		isOpening = true;
		try {
			const result = await openDrawer(businessId, openingAmount);
			currentSession = result.session;
			showOpenDialog = false;
			toast.success('Cash drawer opened');
			await invalidateAll();
		} catch (err: any) {
			toast.error(err.message || 'Failed to open drawer');
		} finally {
			isOpening = false;
		}
	}

	async function handleCloseDrawer() {
		if (actualAmount < 0) return;
		isClosing = true;
		try {
			const denomData: Record<string, number> = {};
			for (const d of denominations) {
				if (denomCounts[d] && denomCounts[d] > 0) {
					denomData[String(d)] = denomCounts[d];
				}
			}
			const result = await closeDrawer(businessId, {
				actualAmount,
				denominations: Object.keys(denomData).length > 0 ? denomData : undefined,
				notes: closeNotes || undefined
			});
			currentSession = null;
			showCloseDialog = false;
			toast.success('Cash drawer closed');
			await invalidateAll();
		} catch (err: any) {
			toast.error(err.message || 'Failed to close drawer');
		} finally {
			isClosing = false;
		}
	}

	function formatCurrency(amount: number | string) {
		return `₹${Number(amount).toFixed(2)}`;
	}

	function formatTime(dateStr: string) {
		return new Date(dateStr).toLocaleString();
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Cash Drawer</h1>
			<p class="text-muted-foreground">Manage shift cash and reconciliation</p>
		</div>
		{#if currentSession}
			<Button variant="destructive" onclick={() => (showCloseDialog = true)}>Close Drawer</Button>
		{:else}
			<Button onclick={() => (showOpenDialog = true)}>Open Drawer</Button>
		{/if}
	</div>

	<!-- Current Session -->
	{#if currentSession}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>Current Session</Card.Title>
					<Badge variant="default">Open</Badge>
				</div>
				<Card.Description>
					Opened by {currentSession.openedBy?.name ?? 'Unknown'} at {formatTime(
						currentSession.openedAt
					)}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div>
						<p class="text-sm text-muted-foreground">Opening Amount</p>
						<p class="text-lg font-semibold">{formatCurrency(currentSession.openingAmount)}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Cash In</p>
						<p class="text-lg font-semibold text-success">{formatCurrency(cashInTotal)}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Cash Out</p>
						<p class="text-lg font-semibold text-destructive">{formatCurrency(cashOutTotal)}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Expected</p>
						<p class="text-lg font-semibold">{formatCurrency(expectedAmount)}</p>
					</div>
				</div>

				{#if currentSession.cashIn.length > 0 || currentSession.cashOut.length > 0}
					<Separator class="my-4" />
					<div>
						<h3 class="mb-2 text-sm font-medium">Transactions</h3>
						<div class="max-h-60 space-y-1 overflow-y-auto">
							{#each [...currentSession.cashIn, ...currentSession.cashOut].sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()) as txn}
								<div
									class="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted"
								>
									<div>
										<span class="font-medium">{txn.description || txn.type}</span>
										{#if txn.orderNumber}
											<span class="ml-1 text-muted-foreground">#{txn.orderNumber}</span>
										{/if}
									</div>
									<span
										class={txn.type === 'refund' || txn.type === 'payout'
											? 'text-destructive'
											: 'text-success'}
									>
										{txn.type === 'refund' || txn.type === 'payout' ? '-' : '+'}{formatCurrency(
											txn.amount
										)}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-muted-foreground">No cash drawer session is currently open.</p>
				<Button class="mt-4" onclick={() => (showOpenDialog = true)}>Open Drawer</Button>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- History -->
	{#if history.length > 0}
		<div>
			<h2 class="mb-3 text-lg font-semibold">Session History</h2>
			<div class="overflow-hidden rounded-lg border">
				<table class="w-full text-sm">
					<thead class="bg-muted/50">
						<tr>
							<th class="p-3 text-left font-medium">Opened</th>
							<th class="p-3 text-left font-medium">Closed</th>
							<th class="p-3 text-left font-medium">Staff</th>
							<th class="p-3 text-right font-medium">Opening</th>
							<th class="p-3 text-right font-medium">Expected</th>
							<th class="p-3 text-right font-medium">Actual</th>
							<th class="p-3 text-right font-medium">Difference</th>
						</tr>
					</thead>
					<tbody>
						{#each history as session}
							<tr class="border-t hover:bg-muted/30">
								<td class="p-3">{formatTime(session.openedAt)}</td>
								<td class="p-3">{session.closedAt ? formatTime(session.closedAt) : '—'}</td>
								<td class="p-3">{session.openedBy?.name ?? 'Unknown'}</td>
								<td class="p-3 text-right">{formatCurrency(session.openingAmount)}</td>
								<td class="p-3 text-right"
									>{session.expectedAmount != null
										? formatCurrency(session.expectedAmount)
										: '—'}</td
								>
								<td class="p-3 text-right"
									>{session.actualAmount != null ? formatCurrency(session.actualAmount) : '—'}</td
								>
								<td class="p-3 text-right">
									{#if session.difference != null}
										<span
											class={Number(session.difference) >= 0 ? 'text-success' : 'text-destructive'}
										>
											{Number(session.difference) >= 0 ? '+' : ''}{formatCurrency(
												session.difference
											)}
										</span>
									{:else}
										—
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Open Drawer Dialog -->
<Dialog.Root bind:open={showOpenDialog}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Open Cash Drawer</Dialog.Title>
			<Dialog.Description>Enter the starting cash amount</Dialog.Description>
		</Dialog.Header>
		<Field.Field class="py-4">
			<Field.Label for="opening-amount">Opening Amount</Field.Label>
			<Input
				id="opening-amount"
				type="number"
				bind:value={openingAmount}
				min="0"
				step="0.01"
				placeholder="0.00"
			/>
		</Field.Field>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showOpenDialog = false)} disabled={isOpening}
				>Cancel</Button
			>
			<Button onclick={handleOpenDrawer} disabled={isOpening}>
				{isOpening ? 'Opening...' : 'Open Drawer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Close Drawer Dialog -->
<Dialog.Root bind:open={showCloseDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Close Cash Drawer</Dialog.Title>
			<Dialog.Description>Count cash and reconcile</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<Field.Field>
				<Field.Label>Denomination Count</Field.Label>
				<div class="grid grid-cols-2 gap-2">
					{#each denominations as denom}
						<div class="flex items-center gap-2">
							<span class="w-12 text-right text-sm font-medium">₹{denom}</span>
							<span class="text-muted-foreground">×</span>
							<Input
								type="number"
								min="0"
								value={denomCounts[denom] || 0}
								oninput={(e) => {
									const val = parseInt(e.currentTarget.value) || 0;
									denomCounts = { ...denomCounts, [denom]: val };
								}}
								class="h-8 w-20"
							/>
							<span class="w-16 text-right text-xs text-muted-foreground">
								= ₹{(denom * (denomCounts[denom] || 0)).toLocaleString()}
							</span>
						</div>
					{/each}
				</div>
				<p class="mt-2 text-sm font-medium">Denomination Total: {formatCurrency(denomTotal)}</p>
			</Field.Field>

			<Separator />

			<Field.Field>
				<Field.Label for="actual-amount">Actual Cash Amount</Field.Label>
				<Input id="actual-amount" type="number" bind:value={actualAmount} min="0" step="0.01" />
				<Field.Description>Expected: {formatCurrency(expectedAmount)}</Field.Description>
				{#if actualAmount === 0 && expectedAmount > 0}
					<p class="mt-1 text-sm font-medium text-warning">
						Did you count the cash? Expected amount is {formatCurrency(expectedAmount)}
					</p>
				{/if}
				{#if actualAmount > 0}
					{@const diff = actualAmount - expectedAmount}
					<p class="mt-1 text-sm {diff >= 0 ? 'text-success' : 'text-destructive'}">
						Difference: {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
					</p>
				{/if}
			</Field.Field>

			<Field.Field>
				<Field.Label for="close-notes">Notes (optional)</Field.Label>
				<Textarea
					id="close-notes"
					bind:value={closeNotes}
					placeholder="Any discrepancies or notes..."
					rows={2}
				/>
			</Field.Field>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCloseDialog = false)} disabled={isClosing}
				>Cancel</Button
			>
			<Button variant="destructive" onclick={handleCloseDrawer} disabled={isClosing}>
				{isClosing ? 'Closing...' : 'Close Drawer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
