<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { StarRating } from '$lib/components/reviews';
	import { toast } from 'svelte-sonner';
	import { canModify } from '$lib/utils/permissions';
	import { userFriendlyError } from '$lib/utils/error';
	import { adminDeleteReview, type AdminReview } from '$lib/api';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import StarIcon from '@lucide/svelte/icons/star';

	let { data }: { data: PageData } = $props();

	let reviews = $state<AdminReview[]>(data.reviews || []);
	const canEdit = $derived(canModify(data.userRole));
	let deletingId = $state<string | null>(null);

	const avgRating = $derived(
		reviews.length > 0
			? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
			: null
	);

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function remove(r: AdminReview) {
		if (!confirm(`Delete this review for "${r.menuItemName}"?`)) return;
		deletingId = r.id;
		try {
			await adminDeleteReview(data.businessId, r.id);
			reviews = reviews.filter((x) => x.id !== r.id);
			toast.success('Review deleted');
		} catch (e) {
			toast.error(userFriendlyError(e, 'Failed to delete review'));
		} finally {
			deletingId = null;
		}
	}
</script>

<PageShell title="Reviews" description="Customer ratings and reviews for your menu items">
	{#if reviews.length > 0}
		<div class="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/15">
				<StarIcon class="h-5 w-5 text-warning" />
			</div>
			<div>
				<p class="text-sm text-muted-foreground">Average rating</p>
				<p class="text-lg font-bold">
					{avgRating?.toFixed(1) ?? '—'}
					<span class="text-sm font-normal text-muted-foreground">
						· {reviews.length} review{reviews.length === 1 ? '' : 's'}
					</span>
				</p>
			</div>
		</div>

		<div class="rounded-xl border border-border bg-card">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Item</Table.Head>
						<Table.Head>Rating</Table.Head>
						<Table.Head>Comment</Table.Head>
						<Table.Head>Customer</Table.Head>
						<Table.Head>Date</Table.Head>
						{#if canEdit}
							<Table.Head class="text-right">Actions</Table.Head>
						{/if}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each reviews as r (r.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{r.menuItemName}</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1.5">
									<StarRating value={r.rating} size={14} />
									<span class="text-xs text-muted-foreground">{r.rating}</span>
								</div>
							</Table.Cell>
							<Table.Cell class="max-w-xs">
								{#if r.comment}
									<span class="text-sm">{r.comment}</span>
								{:else}
									<Badge variant="secondary" class="font-normal">Rating only</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">{r.authorName}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{formatDate(r.createdAt)}</Table.Cell>
							{#if canEdit}
								<Table.Cell class="text-right">
									<Button
										variant="ghost"
										size="icon-sm"
										class="text-muted-foreground hover:text-destructive"
										onclick={() => remove(r)}
										disabled={deletingId === r.id}
										aria-label="Delete review"
									>
										{#if deletingId === r.id}
											<Loader2Icon class="animate-spin" />
										{:else}
											<Trash2Icon />
										{/if}
									</Button>
								</Table.Cell>
							{/if}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<EmptyState
			type="empty"
			icon={StarIcon}
			title="No reviews yet"
			description="Customer reviews for your menu items will appear here once orders are completed and rated."
		/>
	{/if}
</PageShell>
