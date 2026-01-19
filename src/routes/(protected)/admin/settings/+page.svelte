<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	import Settings from '@lucide/svelte/icons/settings';
	import Bell from '@lucide/svelte/icons/bell';
	import Shield from '@lucide/svelte/icons/shield';
	import Database from '@lucide/svelte/icons/database';
	import Mail from '@lucide/svelte/icons/mail';

	// Placeholder settings - would be loaded from backend in production
	let maintenanceMode = $state(false);
	let allowNewRegistrations = $state(true);
	let requireEmailVerification = $state(true);
	let enableNotifications = $state(true);
</script>

<svelte:head>
	<title>System Settings | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">System Settings</h1>
		<p class="text-muted-foreground">Configure platform-wide settings</p>
	</div>

	<!-- General Settings -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Settings class="h-4 w-4" />
				General Settings
			</Card.Title>
			<Card.Description>Basic platform configuration</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Maintenance Mode</Label>
					<p class="text-sm text-muted-foreground">
						When enabled, only admins can access the platform
					</p>
				</div>
				<Switch bind:checked={maintenanceMode} />
			</div>
			<Separator />
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Allow New Registrations</Label>
					<p class="text-sm text-muted-foreground">Enable or disable new user sign-ups</p>
				</div>
				<Switch bind:checked={allowNewRegistrations} />
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Security Settings -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Shield class="h-4 w-4" />
				Security Settings
			</Card.Title>
			<Card.Description>Authentication and security options</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Require Email Verification</Label>
					<p class="text-sm text-muted-foreground">
						Users must verify email before accessing features
					</p>
				</div>
				<Switch bind:checked={requireEmailVerification} />
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Notification Settings -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Bell class="h-4 w-4" />
				Notification Settings
			</Card.Title>
			<Card.Description>Email and notification preferences</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Enable System Notifications</Label>
					<p class="text-sm text-muted-foreground">
						Send notifications for important system events
					</p>
				</div>
				<Switch bind:checked={enableNotifications} />
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Email Configuration -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Mail class="h-4 w-4" />
				Email Configuration
			</Card.Title>
			<Card.Description>SMTP and email delivery settings</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="smtp-host">SMTP Host</Label>
					<Input id="smtp-host" placeholder="smtp.example.com" disabled />
				</div>
				<div class="space-y-2">
					<Label for="smtp-port">SMTP Port</Label>
					<Input id="smtp-port" placeholder="587" disabled />
				</div>
				<div class="space-y-2">
					<Label for="from-email">From Email</Label>
					<Input id="from-email" placeholder="noreply@example.com" disabled />
				</div>
				<div class="space-y-2">
					<Label for="from-name">From Name</Label>
					<Input id="from-name" placeholder="POS Platform" disabled />
				</div>
			</div>
			<p class="text-sm text-muted-foreground">
				Email configuration is managed via environment variables. Contact system administrator
				to update.
			</p>
		</Card.Content>
	</Card.Root>

	<!-- Database Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Database class="h-4 w-4" />
				Database Information
			</Card.Title>
			<Card.Description>Database status and information</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="rounded-lg border p-4">
					<p class="text-sm text-muted-foreground">Database Type</p>
					<p class="font-medium">PostgreSQL</p>
				</div>
				<div class="rounded-lg border p-4">
					<p class="text-sm text-muted-foreground">ORM</p>
					<p class="font-medium">Prisma</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="flex justify-end">
		<Button>Save Changes</Button>
	</div>
</div>
