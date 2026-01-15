<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { useSession } from '$lib/auth';
	import { toast } from 'svelte-sonner';

	import User from '@lucide/svelte/icons/user';
	import Mail from '@lucide/svelte/icons/mail';
	import Camera from '@lucide/svelte/icons/camera';
	import Save from '@lucide/svelte/icons/save';

	const session = useSession();
	const user = $derived($session.data?.user);

	// Form state
	let name = $state(user?.name || '');
	let email = $state(user?.email || '');
	let isSaving = $state(false);

	// Sync form when user loads
	$effect(() => {
		if (user) {
			name = user.name || '';
			email = user.email || '';
		}
	});

	async function handleSave() {
		isSaving = true;
		try {
			// TODO: Implement actual save
			await new Promise((resolve) => setTimeout(resolve, 1000));
			toast.success('Profile updated successfully');
		} catch (error) {
			toast.error('Failed to update profile');
		} finally {
			isSaving = false;
		}
	}

	// Get initials
	const initials = $derived(() => {
		if (!user?.name) return 'U';
		return user.name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
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
					<Button variant="outline" size="sm">
						<Camera class="mr-2 size-4" />
						Change Photo
					</Button>
					<p class="mt-2 text-xs text-muted-foreground">
						JPG, GIF or PNG. Max size 2MB.
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
					Contact support to change your email address.
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
				<Button variant="outline" size="sm">English</Button>
			</div>
			<Separator />
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Timezone</p>
					<p class="text-sm text-muted-foreground">Set your local timezone</p>
				</div>
				<Button variant="outline" size="sm">UTC+0</Button>
			</div>
			<Separator />
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Date Format</p>
					<p class="text-sm text-muted-foreground">Choose how dates are displayed</p>
				</div>
				<Button variant="outline" size="sm">DD/MM/YYYY</Button>
			</div>
		</Card.Content>
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
				<Button variant="destructive" size="sm">Delete Account</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
