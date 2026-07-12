<script lang="ts">
	import type { CustomerSession } from '$lib/api/customer-me';
	import { revokeSession } from '$lib/api/customer-me';
	import { toast } from 'svelte-sonner';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	interface Props {
		sessions: CustomerSession[];
		loading: boolean;
		onRevoked?: () => void;
	}

	let { sessions, loading, onRevoked }: Props = $props();

	let revoking = $state<Record<string, boolean>>({});

	function formatDate(iso: string) {
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function deviceLabel(ua: string | null): string {
		if (!ua) return 'Unknown device';
		if (/mobile|android|iphone/i.test(ua)) return 'Mobile';
		if (/tablet|ipad/i.test(ua)) return 'Tablet';
		return 'Desktop';
	}

	function browserLabel(ua: string | null): string {
		if (!ua) return '';
		if (/firefox/i.test(ua)) return 'Firefox';
		if (/edg/i.test(ua)) return 'Edge';
		if (/chrome/i.test(ua)) return 'Chrome';
		if (/safari/i.test(ua)) return 'Safari';
		return '';
	}

	async function handleRevoke(id: string) {
		revoking = { ...revoking, [id]: true };
		try {
			await revokeSession(id);
			toast.success('Session revoked');
			onRevoked?.();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to revoke session');
		} finally {
			revoking = { ...revoking, [id]: false };
		}
	}
</script>

{#if loading}
	<div class="space-y-3">
		{#each [1, 2] as _}
			<div class="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-muted"></div>
		{/each}
	</div>
{:else if sessions.length === 0}
	<p class="text-sm text-muted-foreground">No active sessions.</p>
{:else}
	<div class="space-y-3">
		{#each sessions as s (s.id)}
			{@const isMobile = s.userAgent ? /mobile|android|iphone/i.test(s.userAgent) : false}
			<div
				class="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-border dark:bg-muted/40"
			>
				<div class="flex min-w-0 flex-1 items-start gap-3">
					<div class="mt-0.5 shrink-0 text-muted-foreground">
						{#if isMobile}
							<SmartphoneIcon class="h-4 w-4" />
						{:else}
							<MonitorIcon class="h-4 w-4" />
						{/if}
					</div>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-1.5">
							<span class="text-sm font-medium">{deviceLabel(s.userAgent)}</span>
							{#if browserLabel(s.userAgent)}
								<span class="text-xs text-muted-foreground">· {browserLabel(s.userAgent)}</span>
							{/if}
							{#if s.current}
								<span
									class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300"
								>
									This device
								</span>
							{/if}
						</div>
						<p class="mt-0.5 text-xs text-muted-foreground">
							{#if s.ipAddress}
								{s.ipAddress} ·
							{/if}
							Last active {formatDate(s.updatedAt)}
						</p>
					</div>
				</div>
				<button
					class="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card dark:text-muted-foreground"
					onclick={() => handleRevoke(s.id)}
					disabled={s.current || revoking[s.id]}
					title={s.current ? 'Cannot revoke current session' : 'Revoke this session'}
				>
					{#if revoking[s.id]}
						<Loader2Icon class="h-3 w-3 animate-spin" />
					{:else}
						Revoke
					{/if}
				</button>
			</div>
		{/each}
	</div>
{/if}
