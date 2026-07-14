<script lang="ts">
	import { onMount } from 'svelte';
	import { getAdminSettings, updateAdminSettings } from '$lib/api/admin';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import SaveIcon from '@lucide/svelte/icons/save';
	import LoaderIcon from '@lucide/svelte/icons/loader';

	let settings = $state<Record<string, string>>({});
	let original = $state<Record<string, string>>({});
	let loading = $state(true);
	let saving = $state(false);

	const hasChanges = $derived(JSON.stringify(settings) !== JSON.stringify(original));

	onMount(async () => {
		try {
			const data = await getAdminSettings();
			settings = { ...data };
			original = { ...data };
		} catch (err) {
			toast.error('Failed to load settings');
		} finally {
			loading = false;
		}
	});

	async function save() {
		saving = true;
		try {
			const updated = await updateAdminSettings(settings);
			settings = { ...updated };
			original = { ...updated };
			toast.success('Settings saved');
		} catch (err) {
			toast.error('Failed to save settings');
		} finally {
			saving = false;
		}
	}

	function toggleSetting(key: string) {
		settings[key] = settings[key] === 'true' ? 'false' : 'true';
	}
</script>

<svelte:head>
	<title>System Settings | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">System Settings</h1>
			<p class="text-muted-foreground">Configure platform-wide settings</p>
		</div>
		{#if hasChanges}
			<Button onclick={save} disabled={saving}>
				{#if saving}
					<LoaderIcon class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<SaveIcon class="mr-2 h-4 w-4" />
				{/if}
				Save Changes
			</Button>
		{/if}
	</div>

	{#if loading}
		<div class="grid gap-6">
			{#each [1, 2, 3] as _}
				<Card.Root>
					<Card.Content class="p-6">
						<div class="h-24 animate-pulse rounded bg-muted"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<div class="grid gap-6">
			<!-- General Settings -->
			<Card.Root>
				<Card.Header>
					<Card.Title>General</Card.Title>
					<Card.Description>Basic platform configuration</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<Field.Field>
						<Field.Label for="platform-name">Platform Name</Field.Label>
						<Input
							id="platform-name"
							bind:value={settings['platform.name']}
							placeholder="RestaurantPro"
						/>
					</Field.Field>
					<Field.Field>
						<Field.Label for="support-email">Support Email</Field.Label>
						<Input
							id="support-email"
							type="email"
							bind:value={settings['platform.support_email']}
							placeholder="support@example.com"
						/>
					</Field.Field>
					<Field.Field>
						<Field.Label for="default-plan">Default Plan Slug</Field.Label>
						<Input
							id="default-plan"
							bind:value={settings['platform.default_plan_slug']}
							placeholder="free"
						/>
						<Field.Description>
							The subscription plan assigned to new users by default
						</Field.Description>
					</Field.Field>
					<Field.Field>
						<Field.Label for="max-free">Max Free Businesses Per User</Field.Label>
						<Input
							id="max-free"
							type="number"
							bind:value={settings['platform.max_free_businesses']}
							min="0"
							max="10"
						/>
					</Field.Field>
				</Card.Content>
			</Card.Root>

			<!-- Access Control -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Access Control</Card.Title>
					<Card.Description>Registration and verification settings</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Field.Label>Allow New Registrations</Field.Label>
							<p class="text-sm text-muted-foreground">When disabled, no new users can sign up</p>
						</div>
						<Switch
							checked={settings['platform.registration_enabled'] === 'true'}
							onCheckedChange={() => toggleSetting('platform.registration_enabled')}
						/>
					</div>
					<Separator />
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Field.Label>Require Email Verification</Field.Label>
							<p class="text-sm text-muted-foreground">
								Users must verify their email before accessing the platform
							</p>
						</div>
						<Switch
							checked={settings['platform.require_email_verification'] === 'true'}
							onCheckedChange={() => toggleSetting('platform.require_email_verification')}
						/>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Maintenance -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Maintenance</Card.Title>
					<Card.Description>Platform availability controls</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Field.Label>Maintenance Mode</Field.Label>
							<p class="text-sm text-muted-foreground">
								When enabled, only super admins can access the platform. All other users see a
								maintenance page.
							</p>
						</div>
						<Switch
							checked={settings['platform.maintenance_mode'] === 'true'}
							onCheckedChange={() => toggleSetting('platform.maintenance_mode')}
						/>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
