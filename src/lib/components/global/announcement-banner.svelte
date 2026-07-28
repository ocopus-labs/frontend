<script lang="ts">
	import { getActiveAnnouncements, dismissAnnouncement } from '$lib/api/announcement';
	import type { Announcement } from '$lib/api/announcement';
	import X from '@lucide/svelte/icons/x';
	import Info from '@lucide/svelte/icons/info';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Wrench from '@lucide/svelte/icons/wrench';

	let announcements: Announcement[] = $state([]);

	const DISMISSED_KEY = 'dismissed-announcements';

	function getDismissedIds(): Set<string> {
		try {
			const raw = localStorage.getItem(DISMISSED_KEY);
			if (raw) return new Set(JSON.parse(raw));
		} catch {
			// ignore
		}
		return new Set();
	}

	function saveDismissedId(id: string) {
		const ids = getDismissedIds();
		ids.add(id);
		try {
			localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
		} catch {
			// ignore
		}
	}

	$effect(() => {
		let cancelled = false;
		getActiveAnnouncements()
			.then((result) => {
				if (cancelled) return;
				const dismissedIds = getDismissedIds();
				announcements = result.announcements.filter((a) => !dismissedIds.has(a.id));
			})
			.catch(() => {
				// Silently fail - announcements are non-critical
			});
		return () => {
			cancelled = true;
		};
	});

	async function handleDismiss(id: string) {
		saveDismissedId(id);
		announcements = announcements.filter((a) => a.id !== id);
		try {
			await dismissAnnouncement(id);
		} catch {
			// Silently fail - already removed from UI
		}
	}

	function getTypeStyles(type: string): string {
		switch (type) {
			case 'critical':
				return 'bg-destructive/10 border-destructive/30 text-destructive';
			case 'warning':
				return 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200';
			case 'maintenance':
				return 'bg-orange-50 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200';
			default:
				return 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200';
		}
	}

	function getIcon(type: string) {
		switch (type) {
			case 'critical':
				return AlertCircle;
			case 'warning':
				return AlertTriangle;
			case 'maintenance':
				return Wrench;
			default:
				return Info;
		}
	}
</script>

{#if announcements.length > 0}
	<div class="space-y-0" aria-live="polite">
		{#each announcements as announcement (announcement.id)}
			{@const Icon = getIcon(announcement.type)}
			<div
				class="flex items-start gap-3 border-b px-4 py-2.5 text-sm {getTypeStyles(
					announcement.type
				)}"
				role="alert"
			>
				<Icon class="mt-0.5 h-4 w-4 shrink-0" />
				<div class="min-w-0 flex-1">
					<span class="font-medium">{announcement.title}</span>
					{#if announcement.content}
						<span class="ml-1 opacity-90">{announcement.content}</span>
					{/if}
				</div>
				{#if !announcement.isPinned}
					<button
						onclick={() => handleDismiss(announcement.id)}
						class="shrink-0 rounded-sm p-0.5 opacity-70 transition-opacity hover:opacity-100"
						aria-label="Dismiss announcement"
					>
						<X class="h-4 w-4" />
					</button>
				{/if}
			</div>
		{/each}
	</div>
{/if}
