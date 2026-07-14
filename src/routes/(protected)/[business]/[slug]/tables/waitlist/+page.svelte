<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconPlus,
		IconBell,
		IconCheck,
		IconX,
		IconUserOff,
		IconUsers,
		IconClock,
		IconLoader2,
		IconClipboardList
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import {
		addToWaitlist,
		getActiveWaitlist,
		notifyWaitlistEntry,
		seatWaitlistEntry,
		cancelWaitlistEntry,
		markWaitlistNoShow,
		type WaitlistEntry,
		type AddToWaitlistPayload
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { browser } from '$app/environment';
	import { env } from '$env/dynamic/public';

	let { data }: { data: PageData } = $props();

	let queue = $state<WaitlistEntry[]>(data.queue || []);
	let showAddDialog = $state(false);
	let isSubmitting = $state(false);
	let actionLoading = $state<string | null>(null);

	let newEntry = $state({
		customerName: '',
		customerPhone: '',
		partySize: 2,
		notes: ''
	});

	// Stats derived from queue
	const stats = $derived({
		waiting: queue.filter((e) => e.status === 'waiting').length,
		notified: queue.filter((e) => e.status === 'notified').length,
		total: queue.length
	});

	const estimatedWaitNext = $derived(() => {
		const first = queue.find((e) => e.status === 'waiting');
		if (!first) return null;
		return first.estimatedWaitMinutes;
	});

	function getWaitTime(joinedAt: string): string {
		const joined = new Date(joinedAt);
		const now = new Date();
		const diffMs = now.getTime() - joined.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m`;
		const hours = Math.floor(diffMins / 60);
		const mins = diffMins % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}

	function getStatusPill(status: string) {
		switch (status) {
			case 'waiting':
				return { label: 'Waiting', status: 'warning' as const, pulse: true };
			case 'notified':
				return { label: 'Notified', status: 'info' as const, pulse: true };
			case 'seated':
				return { label: 'Seated', status: 'success' as const, pulse: false };
			case 'cancelled':
				return { label: 'Cancelled', status: 'error' as const, pulse: false };
			case 'no_show':
				return { label: 'No Show', status: 'neutral' as const, pulse: false };
			default:
				return { label: status, status: 'neutral' as const, pulse: false };
		}
	}

	function resetForm() {
		newEntry = { customerName: '', customerPhone: '', partySize: 2, notes: '' };
	}

	async function handleAdd() {
		if (!newEntry.customerName.trim()) {
			toast.error('Please enter a customer name');
			return;
		}
		if (newEntry.partySize < 1) {
			toast.error('Party size must be at least 1');
			return;
		}

		isSubmitting = true;
		try {
			const payload: AddToWaitlistPayload = {
				customerName: newEntry.customerName.trim(),
				customerPhone: newEntry.customerPhone.trim() || undefined,
				partySize: newEntry.partySize,
				notes: newEntry.notes.trim() || undefined
			};

			const result = await addToWaitlist(data.businessId, payload);
			queue = [...queue, result.entry];
			toast.success(
				`${result.entry.customerName} added to waitlist (position #${result.entry.position})`
			);
			showAddDialog = false;
			resetForm();
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to add to waitlist'));
		} finally {
			isSubmitting = false;
		}
	}

	async function handleNotify(entry: WaitlistEntry) {
		actionLoading = entry.id;
		try {
			const result = await notifyWaitlistEntry(data.businessId, entry.id);
			queue = queue.map((e) => (e.id === entry.id ? result.entry : e));
			toast.success(`${entry.customerName} has been notified`);
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to notify customer'));
		} finally {
			actionLoading = null;
		}
	}

	async function handleSeat(entry: WaitlistEntry) {
		actionLoading = entry.id;
		try {
			const result = await seatWaitlistEntry(data.businessId, entry.id);
			queue = queue.filter((e) => e.id !== entry.id);
			toast.success(`${entry.customerName} has been seated`);
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to seat customer'));
		} finally {
			actionLoading = null;
		}
	}

	async function handleCancel(entry: WaitlistEntry) {
		actionLoading = entry.id;
		try {
			await cancelWaitlistEntry(data.businessId, entry.id);
			queue = queue.filter((e) => e.id !== entry.id);
			toast.success(`${entry.customerName} removed from waitlist`);
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to cancel entry'));
		} finally {
			actionLoading = null;
		}
	}

	async function handleNoShow(entry: WaitlistEntry) {
		actionLoading = entry.id;
		try {
			await markWaitlistNoShow(data.businessId, entry.id);
			queue = queue.filter((e) => e.id !== entry.id);
			toast.success(`${entry.customerName} marked as no-show`);
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to mark no-show'));
		} finally {
			actionLoading = null;
		}
	}

	async function refreshQueue() {
		try {
			const result = await getActiveWaitlist(data.businessId);
			queue = result.queue;
		} catch {
			// Silently ignore refresh errors
		}
	}

	// WebSocket connection for real-time updates, with polling fallback
	$effect(() => {
		if (!browser) return;

		let cleanup: (() => void) | undefined;
		let pollInterval: ReturnType<typeof setInterval> | undefined;

		(async () => {
			try {
				const { io } = await import('socket.io-client');
				const backendUrl =
					env.PUBLIC_API_BASE?.replace(/\/api(\/v\d+)?$/, '') || 'http://localhost:3000';
				const socket = io(`${backendUrl}/waitlist`, {
					withCredentials: true,
					autoConnect: true,
					transports: ['websocket', 'polling'],
					reconnection: true,
					reconnectionAttempts: 10,
					reconnectionDelay: 1000,
					reconnectionDelayMax: 5000,
					timeout: 10000
				});

				socket.on('connect', () => {
					socket.emit('join:business', data.businessId);
				});

				socket.on('waitlist:updated', (updatedQueue: WaitlistEntry[]) => {
					queue = updatedQueue;
				});

				cleanup = () => {
					socket.emit('leave:business', data.businessId);
					socket.disconnect();
				};
			} catch {
				// socket.io not available -- fall back to polling
				pollInterval = setInterval(refreshQueue, 30000);
				cleanup = () => clearInterval(pollInterval);
			}
		})();

		return () => {
			cleanup?.();
		};
	});
</script>

<PageShell title="Waitlist" description="Manage your walk-in queue">
	{#snippet actions()}
		<Button onclick={() => (showAddDialog = true)}>
			<IconPlus class="mr-2 h-4 w-4" />
			Add to Waitlist
		</Button>
	{/snippet}

	<!-- Stats -->
	<div class="grid grid-cols-3 gap-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">Waiting</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-warning">{stats.waiting}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">Notified</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-info text-2xl font-bold">{stats.notified}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium">Est. Wait (Next)</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{#if estimatedWaitNext() !== null}
						{estimatedWaitNext()}m
					{:else}
						--
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Queue List -->
	{#if queue.length > 0}
		<div class="flex flex-col gap-3">
			{#each queue as entry (entry.id)}
				{@const pill = getStatusPill(entry.status)}
				<Card.Root
					class="transition-shadow hover:shadow-md {entry.position === 1
						? 'border-primary/50 bg-primary/5'
						: ''}"
				>
					<Card.Content class="flex items-center gap-4 p-4">
						<!-- Position number -->
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold {entry.position ===
							1
								? 'bg-primary text-primary-foreground'
								: ''}"
						>
							{entry.position}
						</div>

						<!-- Customer info -->
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="truncate font-semibold">{entry.customerName}</span>
								<StatusPill label={pill.label} status={pill.status} pulse={pill.pulse} size="sm" />
							</div>
							<div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
								<span class="flex items-center gap-1">
									<IconUsers class="h-3.5 w-3.5" />
									{entry.partySize}
								</span>
								<span class="flex items-center gap-1">
									<IconClock class="h-3.5 w-3.5" />
									{getWaitTime(entry.joinedAt)}
								</span>
								{#if entry.customerPhone}
									<span class="text-xs">{entry.customerPhone}</span>
								{/if}
								{#if entry.notes}
									<span class="truncate text-xs italic">{entry.notes}</span>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						<div class="flex shrink-0 items-center gap-1">
							{#if actionLoading === entry.id}
								<IconLoader2 class="h-5 w-5 animate-spin text-muted-foreground" />
							{:else}
								{#if entry.status === 'waiting'}
									<Button
										variant="ghost"
										size="icon"
										class="text-info h-8 w-8"
										onclick={() => handleNotify(entry)}
										aria-label="Notify customer"
										title="Notify"
									>
										<IconBell class="h-4 w-4" />
									</Button>
								{/if}
								{#if entry.status === 'waiting' || entry.status === 'notified'}
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-success"
										onclick={() => handleSeat(entry)}
										aria-label="Seat customer"
										title="Seat"
									>
										<IconCheck class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive"
										onclick={() => handleCancel(entry)}
										aria-label="Cancel entry"
										title="Cancel"
									>
										<IconX class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-muted-foreground"
										onclick={() => handleNoShow(entry)}
										aria-label="Mark no-show"
										title="No Show"
									>
										<IconUserOff class="h-4 w-4" />
									</Button>
								{/if}
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<EmptyState
			type="empty"
			title="No one on the waitlist"
			description="Add customers to the waitlist as they arrive."
			actionLabel="Add to Waitlist"
			onAction={() => (showAddDialog = true)}
		/>
	{/if}

	<!-- Live indicator -->
	{#if queue.length > 0}
		<div class="flex items-center justify-center gap-1.5 pb-4">
			<span class="relative flex h-2 w-2">
				<span
					class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"
				></span>
				<span class="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
			</span>
			<p class="text-xs text-muted-foreground">Live updates</p>
		</div>
	{/if}
</PageShell>

<!-- Add to Waitlist Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add to Waitlist</Dialog.Title>
			<Dialog.Description>Add a walk-in customer to the queue</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="wl-name" class="text-sm font-medium">Customer Name *</label>
				<Input id="wl-name" autofocus bind:value={newEntry.customerName} placeholder="Name" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="wl-phone" class="text-sm font-medium">Phone</label>
					<Input id="wl-phone" bind:value={newEntry.customerPhone} placeholder="+1 555-0123" />
				</div>
				<div class="grid gap-2">
					<label for="wl-party" class="text-sm font-medium">Party Size *</label>
					<Input id="wl-party" type="number" min="1" max="50" bind:value={newEntry.partySize} />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="wl-notes" class="text-sm font-medium">Notes</label>
				<Textarea
					id="wl-notes"
					bind:value={newEntry.notes}
					placeholder="High chair needed, birthday, etc."
					rows={2}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					showAddDialog = false;
					resetForm();
				}}
				disabled={isSubmitting}>Cancel</Button
			>
			<Button onclick={handleAdd} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add to Queue
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
