<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Field from '$lib/components/ui/field';
	import * as Alert from '$lib/components/ui/alert';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import { toast } from 'svelte-sonner';
	import { createFranchise } from '$lib/api/franchise';

	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Loader2 from '@lucide/svelte/icons/loader-circle';

	let name = $state('');
	let description = $state('');
	let logo = $state('');
	let submitting = $state(false);
	let error = $state('');
	let nameError = $state('');
	let logoError = $state('');

	function isValidUrl(value: string) {
		try {
			const url = new URL(value);
			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	}

	function validate() {
		nameError = '';
		logoError = '';

		if (!name.trim()) {
			nameError = 'Franchise name is required';
		} else if (name.trim().length < 2) {
			nameError = 'Franchise name must be at least 2 characters';
		}

		if (logo.trim() && !isValidUrl(logo.trim())) {
			logoError = 'Enter a valid http(s) URL';
		}

		return !nameError && !logoError;
	}

	async function handleSubmit() {
		if (submitting) return;
		if (!validate()) return;

		submitting = true;
		error = '';

		try {
			const { franchise } = await createFranchise({
				name: name.trim(),
				description: description.trim() || undefined,
				logo: logo.trim() || undefined
			});
			toast.success(`"${franchise.name}" created`);
			goto(`/franchise/${franchise.slug}`);
		} catch (err: any) {
			error = err?.message || 'Failed to create franchise';
			toast.error(error);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Franchise | POS</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-5">
	<PageHeader
		title="Create franchise"
		description="Set up a new franchise to manage multiple locations under one brand."
		back="/franchise"
		gutter={false}
	>
		{#snippet actions()}
			<Button variant="outline" href="/franchise" class="hidden sm:inline-flex">
				<ArrowLeft class="mr-1.5 size-4" />
				Back to franchises
			</Button>
		{/snippet}
	</PageHeader>

	<Card.Root class="w-full max-w-2xl">
		<Card.Header>
			<Card.Title class="text-section-title">Franchise details</Card.Title>
			<Card.Description>
				You can change any of this later from the franchise settings.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-6"
			>
				{#if error}
					<Alert.Root variant="destructive">
						<AlertTriangle class="size-4" />
						<Alert.Title>Couldn't create franchise</Alert.Title>
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}

				<Field.Group>
					<Field.Field>
						<Field.Label for="franchise-name">Franchise name *</Field.Label>
						<Input
							id="franchise-name"
							type="text"
							placeholder="e.g. Spice Chain"
							bind:value={name}
							aria-required={true}
							aria-invalid={!!nameError || undefined}
							aria-describedby={nameError ? 'franchise-name-error' : 'franchise-name-desc'}
						/>
						{#if nameError}
							<Field.Error id="franchise-name-error">{nameError}</Field.Error>
						{:else}
							<Field.Description id="franchise-name-desc">
								This is how the network appears across all its locations.
							</Field.Description>
						{/if}
					</Field.Field>
				</Field.Group>

				<Field.Group>
					<Field.Field>
						<Field.Label for="franchise-description">Description (optional)</Field.Label>
						<Textarea
							id="franchise-description"
							placeholder="Brief description of your franchise"
							bind:value={description}
							rows={3}
							aria-describedby="franchise-description-desc"
						/>
						<Field.Description id="franchise-description-desc">
							A short summary of what this franchise network is about.
						</Field.Description>
					</Field.Field>
				</Field.Group>

				<Field.Group>
					<Field.Field>
						<Field.Label for="franchise-logo">Logo URL (optional)</Field.Label>
						<Input
							id="franchise-logo"
							type="url"
							placeholder="https://example.com/logo.png"
							bind:value={logo}
							aria-invalid={!!logoError || undefined}
							aria-describedby={logoError ? 'franchise-logo-error' : 'franchise-logo-desc'}
						/>
						{#if logoError}
							<Field.Error id="franchise-logo-error">{logoError}</Field.Error>
						{:else}
							<Field.Description id="franchise-logo-desc">
								Shown on the franchise card and network dashboards.
							</Field.Description>
						{/if}
					</Field.Field>
				</Field.Group>

				<div class="flex justify-end gap-3 border-t border-border pt-4">
					<Button variant="outline" href="/franchise" disabled={submitting}>Cancel</Button>
					<Button type="submit" disabled={submitting || !name.trim()}>
						{#if submitting}
							<Loader2 class="mr-1.5 size-4 animate-spin" />
							Creating…
						{:else}
							Create franchise
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
