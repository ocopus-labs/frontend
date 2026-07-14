<script lang="ts">
	import type { PageData } from './$types';
	import { trackWaitlistPosition, type WaitlistTrackingEntry } from '$lib/api';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();

	let entry = $state<WaitlistTrackingEntry>(data.entry);
	const token = data.token;

	// Auto-refresh every 15 seconds
	$effect(() => {
		if (!browser) return;

		const interval = setInterval(async () => {
			try {
				const result = await trackWaitlistPosition(token);
				entry = result.entry;
			} catch {
				// Silently ignore polling errors
			}
		}, 15000);

		return () => clearInterval(interval);
	});

	const isNext = $derived(entry.position === 1 && entry.status === 'waiting');
	const isActive = $derived(entry.status === 'waiting' || entry.status === 'notified');

	function getWaitTime(joinedAt: string): string {
		const joined = new Date(joinedAt);
		const now = new Date();
		const diffMs = now.getTime() - joined.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return 'Less than a minute';
		if (diffMins === 1) return '1 minute';
		if (diffMins < 60) return `${diffMins} minutes`;
		const hours = Math.floor(diffMins / 60);
		const mins = diffMins % 60;
		if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
		return `${hours}h ${mins}m`;
	}

	const statusSteps = [
		{ key: 'waiting', label: 'Waiting', sublabel: 'You are in the queue' },
		{ key: 'notified', label: 'Notified', sublabel: 'Your table is almost ready' },
		{ key: 'seated', label: 'Seated', sublabel: 'Enjoy your visit!' }
	];

	const currentStepIndex = $derived(() => {
		switch (entry.status) {
			case 'notified':
				return 1;
			case 'seated':
				return 2;
			default:
				return 0;
		}
	});
</script>

<svelte:head>
	<title>Waitlist Status</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-8">
	<div class="w-full max-w-sm space-y-6">
		<!-- Header -->
		<div class="text-center">
			<h1 class="text-lg font-semibold text-muted-foreground">Waitlist</h1>
			<p class="text-sm text-muted-foreground">{entry.customerName}</p>
		</div>

		<!-- Main position card -->
		{#if entry.status === 'seated'}
			<!-- Seated state -->
			<div class="rounded-2xl border border-success/30 bg-success/10 p-8 text-center shadow-sm">
				<div
					class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground"
				>
					<svg
						class="h-8 w-8"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<p class="text-xl font-bold text-success">You've Been Seated</p>
				<p class="mt-1 text-sm text-success">Enjoy your visit!</p>
			</div>
		{:else if entry.status === 'cancelled' || entry.status === 'no_show'}
			<!-- Removed state -->
			<div class="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
				<div
					class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground"
				>
					<svg
						class="h-8 w-8"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</div>
				<p class="text-xl font-bold text-foreground">No Longer in Queue</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{entry.status === 'cancelled'
						? 'This entry has been cancelled.'
						: 'This entry was marked as a no-show.'}
				</p>
			</div>
		{:else}
			<!-- Active waiting / notified state -->
			{#if isNext}
				<div
					class="rounded-2xl border-2 border-primary bg-primary/5 p-8 text-center shadow-lg dark:bg-primary/10"
				>
					<div class="mb-2 text-sm font-semibold tracking-wider text-primary uppercase">
						You're Next!
					</div>
					<div class="text-7xl font-black text-primary tabular-nums">
						{entry.position}
					</div>
					<p class="mt-2 text-sm text-muted-foreground">Get ready - your table is almost here</p>
				</div>
			{:else if entry.status === 'notified'}
				<div
					class="rounded-2xl border-2 border-blue-400 bg-blue-50 p-8 text-center shadow-lg dark:border-blue-600 dark:bg-blue-900/10"
				>
					<div class="mb-3 flex items-center justify-center gap-2">
						<span class="relative flex h-3 w-3">
							<span
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"
							></span>
							<span class="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
						</span>
						<span
							class="text-sm font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400"
							>Table Ready</span
						>
					</div>
					<p class="text-lg font-bold text-blue-800 dark:text-blue-200">
						Please head to the host stand
					</p>
					<p class="mt-1 text-sm text-blue-600 dark:text-blue-400">Your table is being prepared</p>
				</div>
			{:else}
				<div class="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
					<div class="mb-1 text-sm font-medium text-muted-foreground">Your position</div>
					<div class="text-7xl font-black text-foreground tabular-nums">
						{entry.position}
					</div>
					{#if entry.estimatedWaitMinutes}
						<div
							class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground"
						>
							<svg
								class="h-4 w-4"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
							~{entry.estimatedWaitMinutes} min wait
						</div>
					{/if}
				</div>
			{/if}
		{/if}

		<!-- Details card -->
		<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
			<div class="space-y-3 text-sm">
				<div class="flex justify-between">
					<span class="text-muted-foreground">Party size</span>
					<span class="font-medium"
						>{entry.partySize} {entry.partySize === 1 ? 'guest' : 'guests'}</span
					>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">Wait time</span>
					<span class="font-medium">{getWaitTime(entry.joinedAt)}</span>
				</div>
				{#if entry.notes}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Notes</span>
						<span class="max-w-[180px] text-right font-medium">{entry.notes}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Progress tracker -->
		{#if isActive || entry.status === 'seated'}
			<div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
				<div class="space-y-0">
					{#each statusSteps as step, i}
						{@const stepIdx = currentStepIndex()}
						{@const isCompleted = i < stepIdx}
						{@const isCurrent = i === stepIdx}
						<div class="flex gap-3">
							<div class="flex flex-col items-center">
								<div
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all {isCompleted
										? 'bg-primary text-primary-foreground'
										: isCurrent
											? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
											: 'bg-muted text-muted-foreground'}"
								>
									{#if isCompleted}
										<svg
											class="h-3.5 w-3.5"
											fill="none"
											stroke="currentColor"
											stroke-width="2.5"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									{:else}
										<span class="text-xs font-bold">{i + 1}</span>
									{/if}
								</div>
								{#if i < statusSteps.length - 1}
									<div
										class="my-1 min-h-[20px] w-0.5 flex-1 rounded-full {isCompleted
											? 'bg-primary'
											: 'bg-muted'}"
									></div>
								{/if}
							</div>
							<div class="pb-3">
								<p
									class="text-sm font-semibold {isCurrent || isCompleted
										? 'text-foreground'
										: 'text-muted-foreground'}"
								>
									{step.label}
								</p>
								<p class="text-xs text-muted-foreground">{step.sublabel}</p>
								{#if isCurrent}
									<div class="mt-1 flex items-center gap-1">
										<span class="relative flex h-1.5 w-1.5">
											<span
												class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
											></span>
											<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
										</span>
										<span class="text-[10px] font-medium text-primary">Current</span>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Auto-refresh notice -->
		{#if isActive}
			<div class="flex items-center justify-center gap-1.5 pt-2">
				<span class="relative flex h-2 w-2">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
				</span>
				<p class="text-[11px] text-muted-foreground">Updates automatically every 15 seconds</p>
			</div>
		{/if}
	</div>
</div>
