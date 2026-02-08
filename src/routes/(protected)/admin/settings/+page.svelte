<script lang="ts">
	import * as Alert from '$lib/components/ui/alert/index.js';
	import Settings from '@lucide/svelte/icons/settings';
	import Info from '@lucide/svelte/icons/info';
</script>

<svelte:head>
	<title>System Settings | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">System Settings</h1>
		<p class="text-muted-foreground">Configure platform-wide settings</p>
	</div>

	<Alert.Root>
		<Info class="h-4 w-4" />
		<Alert.Title>Coming Soon</Alert.Title>
		<Alert.Description>
			System settings configuration is currently under development. This will include general
			platform settings, security options, notification preferences, and email configuration.
		</Alert.Description>
	</Alert.Root>
</div>
