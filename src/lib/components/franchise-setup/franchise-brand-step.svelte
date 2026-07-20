<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Field from '$lib/components/ui/field';
	import * as ImageCropper from '$lib/components/ui/image-cropper';
	import { toast } from 'svelte-sonner';
	import { z } from 'zod';

	let {
		franchiseName = $bindable(''),
		franchiseDescription = $bindable(''),
		franchiseLogo = $bindable(''),
		errors = $bindable({})
	}: {
		franchiseName: string;
		franchiseDescription: string;
		franchiseLogo: string;
		errors: Record<string, string>;
	} = $props();

	const brandSchema = z.object({
		franchiseName: z
			.string()
			.min(2, 'Franchise name must be at least 2 characters')
			.max(100, 'Franchise name must be less than 100 characters'),
		franchiseDescription: z
			.string()
			.max(500, 'Description must be less than 500 characters')
			.optional()
	});

	export function validate(): boolean {
		const result = brandSchema.safeParse({
			franchiseName,
			franchiseDescription: franchiseDescription || undefined
		});

		errors = {};
		if (!result.success) {
			for (const issue of result.error.issues) {
				errors[String(issue.path[0])] = issue.message;
			}
			return false;
		}
		return true;
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">Your franchise brand</h1>
		<p class="mt-2 text-muted-foreground">
			This is the brand every location shares. You'll add your first location next.
		</p>
	</div>

	<Field.Group>
		<Field.Field>
			<Field.Label for="franchise-name">Franchise name</Field.Label>
			<Input
				id="franchise-name"
				placeholder="Acme Restaurants"
				bind:value={franchiseName}
				aria-invalid={errors.franchiseName ? 'true' : undefined}
			/>
			{#if errors.franchiseName}
				<Field.Error>{errors.franchiseName}</Field.Error>
			{:else}
				<Field.Description>The parent brand, not an individual outlet.</Field.Description>
			{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="franchise-description">Description</Field.Label>
			<Textarea
				id="franchise-description"
				placeholder="What your franchise is known for"
				rows={3}
				bind:value={franchiseDescription}
				aria-invalid={errors.franchiseDescription ? 'true' : undefined}
			/>
			{#if errors.franchiseDescription}
				<Field.Error>{errors.franchiseDescription}</Field.Error>
			{:else}
				<Field.Description>Optional.</Field.Description>
			{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="franchise-logo">Logo</Field.Label>
			<ImageCropper.Root
				bind:src={franchiseLogo}
				onCropped={(src: string) => (franchiseLogo = src)}
				onUnsupportedFile={() => toast.error('Unsupported file type. Please upload an image.')}
			>
				<ImageCropper.UploadTrigger>
					<ImageCropper.Preview class="rounded-md" />
				</ImageCropper.UploadTrigger>
				<ImageCropper.Dialog>
					<ImageCropper.Cropper cropShape="rect" />
					<ImageCropper.Controls>
						<ImageCropper.Crop />
						<ImageCropper.Cancel />
					</ImageCropper.Controls>
				</ImageCropper.Dialog>
			</ImageCropper.Root>
			<Field.Description>Optional. Shown across every location.</Field.Description>
		</Field.Field>
	</Field.Group>
</div>
