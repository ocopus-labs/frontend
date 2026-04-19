<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { customerSignOut } from '$lib/customer-auth';
	import {
		getProfile,
		getLoyalty,
		getSessions,
		type CustomerProfile,
		type LoyaltyEntry,
		type CustomerSession
	} from '$lib/api/customer-me';
	import { LoyaltyCard, OrderHistoryList, SessionList } from '$lib/components/customer-auth';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import UserIcon from '@lucide/svelte/icons/user';
	import StarIcon from '@lucide/svelte/icons/star';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	const slug = $derived(page.params.slug ?? '');

	// ── Profile data ──
	let profile = $state<CustomerProfile | null>(null);
	let profileLoading = $state(true);
	let profileError = $state('');

	// ── Loyalty data ──
	let loyalty = $state<LoyaltyEntry[]>([]);
	let loyaltyLoading = $state(true);
	let loyaltyError = $state('');

	// ── Sessions data ──
	let sessions = $state<CustomerSession[]>([]);
	let sessionsLoading = $state(true);
	let sessionsError = $state('');

	let signingOut = $state(false);

	$effect(() => {
		// Profile
		profileLoading = true;
		getProfile()
			.then((p) => {
				profile = p;
			})
			.catch((e: unknown) => {
				profileError = e instanceof Error ? e.message : 'Failed to load profile.';
			})
			.finally(() => {
				profileLoading = false;
			});

		// Loyalty
		loyaltyLoading = true;
		getLoyalty()
			.then((r) => {
				loyalty = r.loyalty;
			})
			.catch((e: unknown) => {
				loyaltyError = e instanceof Error ? e.message : 'Failed to load loyalty.';
			})
			.finally(() => {
				loyaltyLoading = false;
			});

		// Sessions
		loadSessions();
	});

	function loadSessions() {
		sessionsLoading = true;
		sessionsError = '';
		getSessions()
			.then((r) => {
				sessions = r.sessions;
			})
			.catch((e: unknown) => {
				sessionsError = e instanceof Error ? e.message : 'Failed to load sessions.';
			})
			.finally(() => {
				sessionsLoading = false;
			});
	}

	async function handleSignOut() {
		signingOut = true;
		try {
			await customerSignOut();
		} finally {
			signingOut = false;
		}
		goto(`/order-online/${slug}`);
	}

	function maskPhone(phone: string | null): string {
		if (!phone) return '--';
		const digits = phone.replace(/\D/g, '');
		if (digits.length < 4) return phone;
		return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
	}
</script>

<div class="flex min-h-svh flex-col bg-gray-50 dark:bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-20 border-b bg-white/95 backdrop-blur dark:bg-background/95">
		<div class="flex items-center gap-3 px-4 py-3">
			<button
				onclick={() => goto(`/order-online/${slug}`)}
				class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-muted"
				aria-label="Go back"
			>
				<ArrowLeftIcon class="h-4 w-4" />
			</button>
			<h1 class="text-base font-bold">My Account</h1>
		</div>
	</header>

	<div class="flex-1 space-y-4 px-4 py-4">
		<!-- Profile section -->
		<div
			class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card"
		>
			<div class="mb-4 flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
					<UserIcon class="h-4 w-4 text-primary" />
				</div>
				<h2 class="text-sm font-bold">Profile</h2>
			</div>

			{#if profileLoading}
				<div class="space-y-3">
					{#each [1, 2, 3] as _}
						<div class="h-5 animate-pulse rounded bg-gray-100 dark:bg-muted"></div>
					{/each}
				</div>
			{:else if profileError}
				<p class="text-sm text-destructive">{profileError}</p>
			{:else if profile}
				<div class="space-y-3">
					{#if profile.name}
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Name</span>
							<span class="font-medium">{profile.name}</span>
						</div>
					{/if}
					{#if profile.email}
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Email</span>
							<span class="font-medium">{profile.email}</span>
						</div>
					{/if}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Phone</span>
						<span class="font-medium">{maskPhone(profile.phone)}</span>
					</div>
					{#if profile.phoneVerified}
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Phone verified</span>
							<span
								class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300"
							>
								Verified
							</span>
						</div>
					{/if}
				</div>
			{/if}

			<div class="mt-5 border-t pt-4">
				<button
					class="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10 active:scale-[0.98] disabled:opacity-60"
					onclick={handleSignOut}
					disabled={signingOut}
				>
					{#if signingOut}
						<Loader2Icon class="h-4 w-4 animate-spin" />
						Signing out...
					{:else}
						<LogOutIcon class="h-4 w-4" />
						Sign out
					{/if}
				</button>
			</div>
		</div>

		<!-- Loyalty section -->
		<div
			class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card"
		>
			<div class="mb-4 flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30"
				>
					<StarIcon class="h-4 w-4 text-amber-600 dark:text-amber-400" />
				</div>
				<h2 class="text-sm font-bold">Loyalty Points</h2>
			</div>

			{#if loyaltyError}
				<p class="text-sm text-destructive">{loyaltyError}</p>
			{:else}
				<LoyaltyCard {loyalty} loading={loyaltyLoading} />
			{/if}
		</div>

		<!-- Orders section -->
		<div
			class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card"
		>
			<div class="mb-4 flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30"
				>
					<ReceiptIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
				</div>
				<h2 class="text-sm font-bold">Order History</h2>
			</div>
			<OrderHistoryList {slug} />
		</div>

		<!-- Sessions section -->
		<div
			class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card"
		>
			<div class="mb-4 flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-muted">
					<ShieldIcon class="h-4 w-4 text-gray-600 dark:text-muted-foreground" />
				</div>
				<h2 class="text-sm font-bold">Active Sessions</h2>
			</div>

			{#if sessionsError}
				<p class="text-sm text-destructive">{sessionsError}</p>
			{:else}
				<SessionList {sessions} loading={sessionsLoading} onRevoked={loadSessions} />
			{/if}
		</div>
	</div>

	<footer class="border-t bg-white px-4 py-3 text-center dark:bg-card">
		<p class="text-[11px] text-muted-foreground">Powered by RestaurantPro</p>
	</footer>
</div>
