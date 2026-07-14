<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import StarRating from './StarRating.svelte';
	import { submitReview, getMyReviews } from '$lib/api';
	import { toast } from 'svelte-sonner';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	interface Props {
		open: boolean;
		slug: string;
		orderId: string;
		/** Distinct items in the order to rate. */
		items: Array<{ menuItemId: string; name: string }>;
	}

	let { open = $bindable(), slug, orderId, items }: Props = $props();

	type Draft = { rating: number; comment: string };
	let drafts = $state<Record<string, Draft>>({});
	let saving = $state(false);
	let loadingExisting = $state(false);

	// Seed drafts from any reviews the customer already left, so re-opening the
	// dialog shows and edits their existing ratings rather than starting blank.
	$effect(() => {
		if (!open) return;
		const seed: Record<string, Draft> = {};
		for (const it of items) seed[it.menuItemId] = { rating: 0, comment: '' };
		drafts = seed;
		loadingExisting = true;
		getMyReviews(slug)
			.then((res) => {
				const byItem = new Map(res.reviews.map((r) => [r.menuItemId, r]));
				const next = { ...drafts };
				for (const it of items) {
					const existing = byItem.get(it.menuItemId);
					if (existing) {
						next[it.menuItemId] = {
							rating: existing.rating,
							comment: existing.comment ?? ''
						};
					}
				}
				drafts = next;
			})
			.catch(() => {
				/* non-blocking — start blank */
			})
			.finally(() => (loadingExisting = false));
	});

	const ratedCount = $derived(Object.values(drafts).filter((d) => d.rating > 0).length);

	async function save() {
		const toSubmit = items.filter((it) => (drafts[it.menuItemId]?.rating ?? 0) > 0);
		if (toSubmit.length === 0) {
			toast.error('Tap a star to rate at least one item.');
			return;
		}
		saving = true;
		try {
			for (const it of toSubmit) {
				const d = drafts[it.menuItemId];
				await submitReview(slug, {
					menuItemId: it.menuItemId,
					orderId,
					rating: d.rating,
					comment: d.comment.trim() || undefined
				});
			}
			toast.success(toSubmit.length === 1 ? 'Review submitted' : 'Reviews submitted');
			open = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to submit review');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Rate your order</Dialog.Title>
			<Dialog.Description>Tap the stars to rate the items you ordered.</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[60vh] space-y-4 overflow-y-auto py-1">
			{#each items as it (it.menuItemId)}
				<div class="rounded-xl border border-border p-3">
					<div class="flex items-center justify-between gap-3">
						<span class="text-sm font-semibold">{it.name}</span>
						{#if drafts[it.menuItemId]}
							<StarRating bind:value={drafts[it.menuItemId].rating} interactive size={22} />
						{/if}
					</div>
					{#if drafts[it.menuItemId]?.rating > 0}
						<Textarea
							class="mt-2"
							rows={2}
							maxlength={1000}
							placeholder="Add a comment (optional)"
							bind:value={drafts[it.menuItemId].comment}
						/>
					{/if}
				</div>
			{/each}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Cancel</Button>
			<Button onclick={save} disabled={saving || loadingExisting || ratedCount === 0}>
				{#if saving}
					<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Submit {ratedCount > 0 ? `(${ratedCount})` : ''}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
