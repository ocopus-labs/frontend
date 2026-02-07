<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { getPreferences, updatePreferences, type NotificationPreferences } from '$lib/api/user';

	import Mail from '@lucide/svelte/icons/mail';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	let isLoading = $state(true);
	let isSaving = $state(false);

	// Notification preferences
	let emailNotifications = $state(true);
	let orderAlerts = $state(true);
	let securityAlerts = $state(true);
	let weeklyDigest = $state(true);
	let marketingEmails = $state(false);
	let pushNotifications = $state(false);

	onMount(async () => {
		try {
			const result = await getPreferences();
			if (result.preferences) {
				emailNotifications = result.preferences.emailNotifications;
				orderAlerts = result.preferences.orderAlerts;
				securityAlerts = result.preferences.securityAlerts;
				weeklyDigest = result.preferences.weeklyDigest;
				marketingEmails = result.preferences.marketingEmails;
				pushNotifications = result.preferences.pushNotifications;
			}
		} catch (err) {
			console.error('Failed to load preferences:', err);
		} finally {
			isLoading = false;
		}
	});

	async function handleSave() {
		isSaving = true;
		try {
			const result = await updatePreferences({
				emailNotifications,
				orderAlerts,
				securityAlerts,
				weeklyDigest,
				marketingEmails,
				pushNotifications
			});
			toast.success('Preferences saved');
		} catch (err: any) {
			toast.error(err.message || 'Failed to save preferences');
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Notifications | POS</title>
</svelte:head>

<div class="max-w-2xl space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Notifications</h1>
		<p class="mt-2 text-muted-foreground">
			Manage how you receive notifications and updates.
		</p>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
		</div>
	{:else}
		<!-- Email Notifications -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<Mail class="size-5 text-muted-foreground" />
					<div>
						<Card.Title>Email Notifications</Card.Title>
						<Card.Description>Configure email preferences</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<Label for="email-notifications" class="font-medium">Email Notifications</Label>
						<p class="text-sm text-muted-foreground">Receive notifications via email</p>
					</div>
					<Switch id="email-notifications" bind:checked={emailNotifications} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="order-alerts" class="font-medium">Order Alerts</Label>
						<p class="text-sm text-muted-foreground">Get notified about new orders</p>
					</div>
					<Switch id="order-alerts" bind:checked={orderAlerts} disabled={!emailNotifications} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="security-alerts" class="font-medium">Security Alerts</Label>
						<p class="text-sm text-muted-foreground">Important security notifications</p>
					</div>
					<Switch id="security-alerts" bind:checked={securityAlerts} disabled={!emailNotifications} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="weekly-digest" class="font-medium">Weekly Digest</Label>
						<p class="text-sm text-muted-foreground">Weekly summary of your business activity</p>
					</div>
					<Switch id="weekly-digest" bind:checked={weeklyDigest} disabled={!emailNotifications} />
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<div>
						<Label for="marketing" class="font-medium">Marketing Emails</Label>
						<p class="text-sm text-muted-foreground">Tips, offers, and product updates</p>
					</div>
					<Switch id="marketing" bind:checked={marketingEmails} disabled={!emailNotifications} />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Push Notifications -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<Smartphone class="size-5 text-muted-foreground" />
					<div>
						<Card.Title>Push Notifications</Card.Title>
						<Card.Description>Browser and mobile notifications</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between">
					<div>
						<Label for="push" class="font-medium">Enable Push Notifications</Label>
						<p class="text-sm text-muted-foreground">Get real-time alerts in your browser</p>
					</div>
					<Switch id="push" bind:checked={pushNotifications} />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Save Button -->
		<div class="flex justify-end">
			<Button onclick={handleSave} disabled={isSaving}>
				{#if isSaving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					Save Preferences
				{/if}
			</Button>
		</div>
	{/if}
</div>
