<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { createFranchise } from '$lib/api/franchise';

	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let name = $state('');
	let description = $state('');
	let submitting = $state(false);
	let error = $state('');

	async function handleSubmit() {
		if (!name.trim()) return;
		submitting = true;
		error = '';

		try {
			const { franchise } = await createFranchise({
				name: name.trim(),
				description: description.trim() || undefined,
			});
			goto(`/franchise/${franchise.slug}`);
		} catch (err: any) {
			error = err?.message || 'Failed to create franchise';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Franchise | POS</title>
</svelte:head>

<div class="mx-auto max-w-lg space-y-6">
	<div class="flex items-center gap-3">
		<Button variant="ghost" size="icon" href="/franchise">
			<ArrowLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Create Franchise</h1>
			<p class="text-sm text-muted-foreground">
				Set up a new franchise to manage multiple locations.
			</p>
		</div>
	</div>

	<Card.Root>
		<Card.Content class="pt-6">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-4"
			>
				<div class="space-y-2">
					<Label for="name">Franchise Name</Label>
					<Input
						id="name"
						placeholder="e.g. Spice Chain"
						bind:value={name}
						required
					/>
				</div>

				<div class="space-y-2">
					<Label for="description">Description (optional)</Label>
					<Textarea
						id="description"
						placeholder="Brief description of your franchise"
						bind:value={description}
						rows={3}
					/>
				</div>

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}

				<div class="flex justify-end gap-3 pt-2">
					<Button variant="outline" href="/franchise">Cancel</Button>
					<Button type="submit" disabled={submitting || !name.trim()}>
						{submitting ? 'Creating...' : 'Create Franchise'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
