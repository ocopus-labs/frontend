<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { toast } from 'svelte-sonner';
	import Info from '@lucide/svelte/icons/info';
	import { browser } from '$app/environment';

	/**
	 * These preferences are stored in localStorage, not on the server — there is
	 * no notification-preferences API yet. That means they are per-browser and
	 * do not follow the user to another device. The banner below says so rather
	 * than letting the UI imply an account-level setting.
	 */
	let emailNotifications = $state(
		browser ? localStorage.getItem('pref:emailNotifications') !== 'false' : true
	);
	let smsNotifications = $state(
		browser ? localStorage.getItem('pref:smsNotifications') === 'true' : false
	);
	let pushNotifications = $state(
		browser ? localStorage.getItem('pref:pushNotifications') === 'true' : false
	);
	let pushPermission = $state<NotificationPermission | 'unsupported'>(
		browser && 'Notification' in window ? Notification.permission : 'unsupported'
	);

	function persist(key: string, value: boolean) {
		if (!browser) return;
		localStorage.setItem(`pref:${key}`, String(value));
	}

	function toggle(key: string, label: string) {
		return (checked: boolean) => {
			persist(key, checked);
			toast.success(`${label} ${checked ? 'enabled' : 'disabled'}.`);
		};
	}

	async function togglePush(enabled: boolean) {
		if (!browser) return;

		if (!enabled) {
			pushNotifications = false;
			persist('pushNotifications', false);
			toast.success('Push notifications disabled.');
			return;
		}

		if (!('Notification' in window)) {
			pushNotifications = false;
			toast.error('Push notifications are not supported in this browser.');
			return;
		}

		const permission = await Notification.requestPermission();
		pushPermission = permission;

		if (permission === 'granted') {
			pushNotifications = true;
			persist('pushNotifications', true);
			toast.success('Push notifications enabled.');
		} else {
			pushNotifications = false;
			persist('pushNotifications', false);
			if (permission === 'denied') {
				toast.error('Permission denied. Enable notifications in your browser settings.');
			}
		}
	}

	const pushDisabled = $derived(pushPermission === 'unsupported' || pushPermission === 'denied');

	const pushHint = $derived(
		pushPermission === 'unsupported'
			? 'Not supported in this browser'
			: pushPermission === 'denied'
				? 'Permission denied — enable it in your browser settings'
				: 'Real-time alerts in this browser'
	);
</script>

<PageShell title="Notifications" description="How this browser alerts you about orders and reports">
	<Alert.Root>
		<Info class="size-4" />
		<Alert.Title>Saved on this device only</Alert.Title>
		<Alert.Description>
			These preferences live in this browser. They won't follow you to another device or apply to
			other people on your team.
		</Alert.Description>
	</Alert.Root>

	<SettingsSection title="Channels" description="Choose how you want to be told about activity.">
		<div class="space-y-6">
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-0.5">
					<Label for="email-notifications" class="text-sm font-medium">Email</Label>
					<p class="text-xs text-muted-foreground">Order updates and scheduled reports</p>
				</div>
				<Switch
					id="email-notifications"
					bind:checked={emailNotifications}
					onCheckedChange={toggle('emailNotifications', 'Email notifications')}
				/>
			</div>

			<div class="flex items-start justify-between gap-4">
				<div class="space-y-0.5">
					<Label for="sms-notifications" class="text-sm font-medium">SMS</Label>
					<p class="text-xs text-muted-foreground">Critical alerts by text message</p>
				</div>
				<Switch
					id="sms-notifications"
					bind:checked={smsNotifications}
					onCheckedChange={toggle('smsNotifications', 'SMS notifications')}
				/>
			</div>

			<div class="flex items-start justify-between gap-4">
				<div class="space-y-0.5">
					<Label for="push-notifications" class="text-sm font-medium">Push</Label>
					<p class="text-xs text-muted-foreground">{pushHint}</p>
				</div>
				<Switch
					id="push-notifications"
					checked={pushNotifications}
					disabled={pushDisabled}
					onCheckedChange={togglePush}
				/>
			</div>
		</div>
	</SettingsSection>
</PageShell>
