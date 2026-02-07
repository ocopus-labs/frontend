<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { authClient, useSession } from '$lib/auth';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { SUPPORT_EMAIL } from '$lib/constants/config';
	import { userFriendlyError } from '$lib/utils/error';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { updatePreferences } from '$lib/api/user';

	import Camera from '@lucide/svelte/icons/camera';
	import Save from '@lucide/svelte/icons/save';

	const session = useSession();
	const user = $derived($session.data?.user);

	// Form state
	let name = $state(user?.name || '');
	let email = $state(user?.email || '');
	let isSaving = $state(false);

	// Photo URL dialog
	let photoDialogOpen = $state(false);
	let photoUrl = $state('');
	let isSavingPhoto = $state(false);

	// Preferences state
	let language = $state('en');
	let timezone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);
	let dateFormat = $state('DD/MM/YYYY');
	let isSavingPreferences = $state(false);

	// Delete account
	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);

	// Sync form when user loads
	$effect(() => {
		if (user) {
			name = user.name || '';
			email = user.email || '';
		}
	});

	async function handleSave() {
		if (isSaving) return;
		try {
			isSaving = true;
			await authClient.updateUser({ name } as any);
			toast.success('Profile updated successfully');
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSaving = false;
		}
	}

	async function handlePhotoSave() {
		if (isSavingPhoto || !photoUrl.trim()) return;
		try {
			new URL(photoUrl);
		} catch {
			toast.error('Please enter a valid URL');
			return;
		}
		try {
			isSavingPhoto = true;
			await authClient.updateUser({ image: photoUrl } as any);
			toast.success('Photo updated successfully');
			photoDialogOpen = false;
			photoUrl = '';
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSavingPhoto = false;
		}
	}

	async function handleSavePreferences() {
		if (isSavingPreferences) return;
		try {
			isSavingPreferences = true;
			await updatePreferences({
				language,
				timezone,
				dateFormat
			} as any);
			toast.success('Preferences saved');
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSavingPreferences = false;
		}
	}

	async function handleDeleteAccount() {
		if (isDeleting) return;
		try {
			isDeleting = true;
			await (authClient as any).deleteUser();
			toast.success('Account deleted');
			goto('/');
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isDeleting = false;
		}
	}

	// Get initials
	const initials = $derived(() => {
		if (!user?.name) return 'U';
		return user.name
			.split(' ')
			.map((n: string) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	});

	const commonTimezones = [
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'America/Anchorage',
		'Pacific/Honolulu',
		'Europe/London',
		'Europe/Paris',
		'Europe/Berlin',
		'Asia/Tokyo',
		'Asia/Shanghai',
		'Asia/Kolkata',
		'Asia/Dubai',
		'Australia/Sydney',
		'Pacific/Auckland'
	];

	// Ensure current timezone is in the list
	const timezoneOptions = $derived(() => {
		const set = new Set(commonTimezones);
		set.add(timezone);
		return [...set].sort();
	});
</script>

<svelte:head>
	<title>Account Settings | POS</title>
</svelte:head>

<div class="max-w-2xl space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Account Settings</h1>
		<p class="mt-2 text-muted-foreground">
			Manage your account information and preferences.
		</p>
	</div>

	<!-- Profile Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Profile</Card.Title>
			<Card.Description>Your personal information</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<!-- Avatar -->
			<div class="flex items-center gap-6">
				<Avatar.Root class="size-20">
					<Avatar.Image src={user?.image} alt={user?.name} />
					<Avatar.Fallback class="text-2xl">{initials()}</Avatar.Fallback>
				</Avatar.Root>
				<div>
					<Button variant="outline" size="sm" onclick={() => { photoUrl = ''; photoDialogOpen = true; }}>
						<Camera class="mr-2 size-4" />
						Change Photo
					</Button>
					<p class="mt-2 text-xs text-muted-foreground">
						Provide a URL to your profile image.
					</p>
				</div>
			</div>

			<Separator />

			<!-- Name -->
			<div class="grid gap-2">
				<Label for="name">Full Name</Label>
				<Input id="name" bind:value={name} placeholder="Your name" />
			</div>

			<!-- Email -->
			<div class="grid gap-2">
				<Label for="email">Email Address</Label>
				<Input id="email" type="email" bind:value={email} placeholder="your@email.com" disabled />
				<p class="text-xs text-muted-foreground">
					Contact <a href="mailto:{SUPPORT_EMAIL}" class="underline">{SUPPORT_EMAIL}</a> to change your email address.
				</p>
			</div>
		</Card.Content>
		<Card.Footer>
			<Button onclick={handleSave} disabled={isSaving}>
				<Save class="mr-2 size-4" />
				{isSaving ? 'Saving...' : 'Save Changes'}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Preferences -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Preferences</Card.Title>
			<Card.Description>Customize your experience</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Language</p>
					<p class="text-sm text-muted-foreground">Select your preferred language</p>
				</div>
				<select
					bind:value={language}
					class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					<option value="en">English</option>
				</select>
			</div>
			<Separator />
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Timezone</p>
					<p class="text-sm text-muted-foreground">Set your local timezone</p>
				</div>
				<select
					bind:value={timezone}
					class="h-9 max-w-[220px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					{#each timezoneOptions() as tz}
						<option value={tz}>{tz.replace(/_/g, ' ')}</option>
					{/each}
				</select>
			</div>
			<Separator />
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Date Format</p>
					<p class="text-sm text-muted-foreground">Choose how dates are displayed</p>
				</div>
				<select
					bind:value={dateFormat}
					class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					<option value="DD/MM/YYYY">DD/MM/YYYY</option>
					<option value="MM/DD/YYYY">MM/DD/YYYY</option>
					<option value="YYYY-MM-DD">YYYY-MM-DD</option>
				</select>
			</div>
		</Card.Content>
		<Card.Footer>
			<Button onclick={handleSavePreferences} disabled={isSavingPreferences}>
				<Save class="mr-2 size-4" />
				{isSavingPreferences ? 'Saving...' : 'Save Preferences'}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Danger Zone -->
	<Card.Root class="border-destructive/50">
		<Card.Header>
			<Card.Title class="text-destructive">Danger Zone</Card.Title>
			<Card.Description>Irreversible actions</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Delete Account</p>
					<p class="text-sm text-muted-foreground">
						Permanently delete your account and all data
					</p>
				</div>
				<Button variant="destructive" size="sm" onclick={() => (deleteDialogOpen = true)}>
					Delete Account
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- Photo URL Dialog -->
<Dialog.Root bind:open={photoDialogOpen}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Change Profile Photo</Dialog.Title>
			<Dialog.Description>Enter the URL of your new profile image.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="grid gap-2">
				<Label for="photoUrl">Image URL</Label>
				<Input
					id="photoUrl"
					type="url"
					bind:value={photoUrl}
					placeholder="https://example.com/photo.jpg"
					autofocus
				/>
			</div>
			{#if photoUrl}
				<img
					src={photoUrl}
					alt="Preview"
					class="h-20 w-20 rounded-full object-cover"
					onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
					onload={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'block'; }}
				/>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (photoDialogOpen = false)}>Cancel</Button>
			<Button onclick={handlePhotoSave} disabled={!photoUrl.trim() || isSavingPhoto}>
				{isSavingPhoto ? 'Saving...' : 'Save'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Account Confirmation -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Account"
	description="This action is permanent and cannot be undone. All your data, businesses, and settings will be permanently deleted."
	confirmLabel={isDeleting ? 'Deleting...' : 'Delete Account'}
	variant="destructive"
	showInput={true}
	inputLabel="Type DELETE to confirm"
	inputPlaceholder="DELETE"
	inputRequired={true}
	onConfirm={handleDeleteAccount}
/>
