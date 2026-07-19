<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { toast } from 'svelte-sonner';
	import IconDeviceFloppy from '@lucide/svelte/icons/save';
	import { updateBusinessSettings } from '$lib/api/business';
	import { invalidate } from '$app/navigation';
	import type { Business } from '$lib/api/types';

	let { data } = $props();

	const business = data.business as Partial<Business> & { name: string };
	const settings = business.settings ?? ({} as Partial<Business['settings']>);

	const DAYS = [
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
		'Sunday'
	] as const;

	const DEFAULTS: Record<string, { open: string; close: string; isClosed: boolean }> = {
		Monday: { open: '09:00', close: '22:00', isClosed: false },
		Tuesday: { open: '09:00', close: '22:00', isClosed: false },
		Wednesday: { open: '09:00', close: '22:00', isClosed: false },
		Thursday: { open: '09:00', close: '22:00', isClosed: false },
		Friday: { open: '09:00', close: '23:00', isClosed: false },
		Saturday: { open: '10:00', close: '23:00', isClosed: false },
		Sunday: { open: '10:00', close: '21:00', isClosed: false }
	};

	let hours = $state(
		DAYS.map((day) => {
			const saved = settings.businessHours?.[day];
			const fallback = DEFAULTS[day];
			return {
				day,
				open: saved?.open ?? fallback.open,
				close: saved?.close ?? fallback.close,
				closed: saved?.isClosed ?? fallback.isClosed
			};
		})
	);

	/** A day that closes before it opens is almost always a typo, not an overnight shift. */
	const invalidDays = $derived(
		hours.filter((h) => !h.closed && h.open >= h.close).map((h) => h.day)
	);

	let saving = $state(false);

	async function save() {
		if (invalidDays.length > 0) {
			toast.error(`Closing time must be after opening time: ${invalidDays.join(', ')}.`);
			return;
		}

		saving = true;
		try {
			const businessHours: Record<string, { open: string; close: string; isClosed: boolean }> = {};
			for (const h of hours) {
				businessHours[h.day] = { open: h.open, close: h.close, isClosed: h.closed };
			}

			await updateBusinessSettings(data.businessId, { businessHours });
			await invalidate('app:settings');
			await invalidate('app:business-data');
			toast.success('Business hours saved.');
		} catch (err: unknown) {
			console.error('Failed to save business hours:', err);
			const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
			toast.error(`Failed to save business hours: ${message}`);
		} finally {
			saving = false;
		}
	}

	function copyMondayToAll() {
		const monday = hours[0];
		hours = hours.map((h) => ({ ...h, open: monday.open, close: monday.close }));
		toast.success("Monday's hours applied to every day.");
	}
</script>

<PageShell
	title="Business hours"
	description="When this outlet is open. Used for online ordering availability and reports."
>
	<SettingsSection
		title="Opening hours"
		description="Times are in your business timezone. Used for online ordering availability."
	>
		{#snippet action()}
			<Button variant="outline" size="sm" onclick={copyMondayToAll}>Copy Monday to all</Button>
		{/snippet}

		<div class="-mx-2">
			{#each hours as hour, index (hour.day)}
				<div
					class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-2 py-2.5 hover:bg-muted/40"
				>
					<div class="w-24 text-sm font-medium">{hour.day}</div>

					<div class="flex items-center gap-2">
						<Checkbox id="closed-{index}" bind:checked={hours[index].closed} />
						<Label for="closed-{index}" class="text-sm font-normal">Closed</Label>
					</div>

					{#if !hour.closed}
						<div class="flex items-center gap-2">
							<Input
								type="time"
								aria-label="{hour.day} opening time"
								bind:value={hours[index].open}
								class="w-32"
							/>
							<span class="text-sm text-muted-foreground">to</span>
							<Input
								type="time"
								aria-label="{hour.day} closing time"
								bind:value={hours[index].close}
								class="w-32"
							/>
						</div>
					{:else}
						<span class="text-sm text-muted-foreground">Closed all day</span>
					{/if}
				</div>
			{/each}
		</div>
	</SettingsSection>

	<div class="flex items-center justify-end gap-3">
		{#if invalidDays.length > 0}
			<p class="text-sm text-destructive">
				Closing time must be after opening time: {invalidDays.join(', ')}.
			</p>
		{/if}
		<Button onclick={save} disabled={saving || invalidDays.length > 0}>
			<IconDeviceFloppy class="mr-2 size-4" />
			{saving ? 'Saving…' : 'Save hours'}
		</Button>
	</div>
</PageShell>
