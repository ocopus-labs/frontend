<script lang="ts">
	import type { PageData } from './$types';
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import {
		IconPlus,
		IconKey,
		IconTrash,
		IconRefresh,
		IconCopy,
		IconLoader2,
		IconEye,
		IconEyeOff,
		IconAlertTriangle
	} from '@tabler/icons-svelte';
	import {
		createApiKey,
		revokeApiKey,
		rotateApiKey,
		AVAILABLE_SCOPES,
		AVAILABLE_PERMISSIONS,
		type ApiKey,
		type CreateApiKeyPayload
	} from '$lib/api';

	let { data }: { data: PageData } = $props();

	let apiKeys = $state<ApiKey[]>(data.apiKeys || []);
	let showCreateDialog = $state(false);
	let isSubmitting = $state(false);

	// Create form state
	let newKeyName = $state('');
	let selectedScopes = $state<string[]>([]);
	let selectedPermissions = $state<string[]>([]);
	let expiresIn = $state('never');

	// Generated key display
	let generatedKey = $state('');
	let showKeyDialog = $state(false);
	let showKeyValue = $state(false);

	// Confirm dialogs
	let revokeDialogOpen = $state(false);
	let revokeTargetId = $state('');
	let rotateDialogOpen = $state(false);
	let rotateTargetId = $state('');

	const activeKeys = $derived(apiKeys.filter((k) => k.isActive));
	const revokedKeys = $derived(apiKeys.filter((k) => !k.isActive));

	const filteredPermissions = $derived(
		AVAILABLE_PERMISSIONS.filter((p) => selectedScopes.includes(p.scope))
	);

	function resetForm() {
		newKeyName = '';
		selectedScopes = [];
		selectedPermissions = [];
		expiresIn = 'never';
	}

	function toggleScope(scope: string) {
		if (selectedScopes.includes(scope)) {
			selectedScopes = selectedScopes.filter((s) => s !== scope);
			// Remove permissions that belong to this scope
			const scopePerms: string[] = AVAILABLE_PERMISSIONS.filter((p) => p.scope === scope).map((p) => p.value as string);
			selectedPermissions = selectedPermissions.filter((p) => !scopePerms.includes(p));
		} else {
			selectedScopes = [...selectedScopes, scope];
		}
	}

	function togglePermission(perm: string) {
		if (selectedPermissions.includes(perm)) {
			selectedPermissions = selectedPermissions.filter((p) => p !== perm);
		} else {
			selectedPermissions = [...selectedPermissions, perm];
		}
	}

	function getExpiresAt(): string | undefined {
		if (expiresIn === 'never') return undefined;
		const now = new Date();
		const days = parseInt(expiresIn);
		now.setDate(now.getDate() + days);
		return now.toISOString();
	}

	async function handleCreate() {
		if (!newKeyName.trim()) {
			toast.error('Name is required');
			return;
		}
		if (selectedScopes.length === 0) {
			toast.error('Select at least one scope');
			return;
		}
		if (selectedPermissions.length === 0) {
			toast.error('Select at least one permission');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateApiKeyPayload = {
				name: newKeyName.trim(),
				scopes: selectedScopes,
				permissions: selectedPermissions,
				expiresAt: getExpiresAt()
			};
			const result = await createApiKey(data.businessId, payload);
			generatedKey = result.key;
			apiKeys = [result.apiKey, ...apiKeys];
			showCreateDialog = false;
			showKeyDialog = true;
			showKeyValue = false;
			resetForm();
			toast.success('API key created');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to create API key'));
		} finally {
			isSubmitting = false;
		}
	}

	function handleRevoke(keyId: string) {
		revokeTargetId = keyId;
		revokeDialogOpen = true;
	}

	async function confirmRevoke() {
		try {
			await revokeApiKey(data.businessId, revokeTargetId);
			apiKeys = apiKeys.map((k) =>
				k.id === revokeTargetId ? { ...k, isActive: false } : k
			);
			toast.success('API key revoked');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to revoke API key'));
		}
	}

	function handleRotate(keyId: string) {
		rotateTargetId = keyId;
		rotateDialogOpen = true;
	}

	async function confirmRotate() {
		try {
			const result = await rotateApiKey(data.businessId, rotateTargetId);
			// Replace old key with new one, mark old as inactive
			apiKeys = apiKeys.map((k) =>
				k.id === rotateTargetId ? { ...k, isActive: false } : k
			);
			apiKeys = [result.apiKey, ...apiKeys];
			generatedKey = result.key;
			showKeyDialog = true;
			showKeyValue = false;
			toast.success('API key rotated');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to rotate API key'));
		}
	}

	async function copyKey() {
		try {
			await navigator.clipboard.writeText(generatedKey);
			toast.success('API key copied to clipboard');
		} catch {
			toast.error('Failed to copy');
		}
	}

	function formatDate(dateString?: string | null): string {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatRelativeTime(dateString?: string | null): string {
		if (!dateString) return 'Never';
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHrs = Math.floor(diffMins / 60);
		if (diffHrs < 24) return `${diffHrs}h ago`;
		const diffDays = Math.floor(diffHrs / 24);
		if (diffDays < 30) return `${diffDays}d ago`;
		return formatDate(dateString);
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="API Keys" description="Manage API keys for MCP integrations and AI agents">
				{#snippet actions()}
					<Button onclick={() => (showCreateDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						Create API Key
					</Button>
				{/snippet}
			</PageHeader>

			<!-- Stats -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-3">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Active Keys</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconKey class="h-5 w-5 text-muted-foreground" />
							<span class="text-2xl font-bold">{activeKeys.length}</span>
						</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Revoked</Card.Title>
					</Card.Header>
					<Card.Content>
						<span class="text-2xl font-bold text-muted-foreground">{revokedKeys.length}</span>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Max Keys</Card.Title>
					</Card.Header>
					<Card.Content>
						<span class="text-2xl font-bold">{activeKeys.length} / 5</span>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Active Keys Table -->
			{#if activeKeys.length > 0}
				<div class="px-6">
					<h3 class="mb-3 text-sm font-medium text-muted-foreground">Active Keys</h3>
					<div class="overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head>Key</Table.Head>
									<Table.Head>Scopes</Table.Head>
									<Table.Head>Last Used</Table.Head>
									<Table.Head>Expires</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each activeKeys as key (key.id)}
									<Table.Row>
										<Table.Cell>
											<div class="flex items-center gap-2">
												<IconKey class="h-4 w-4 text-muted-foreground" />
												<span class="font-medium">{key.name}</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											<code class="rounded bg-muted px-2 py-0.5 text-xs">
												{key.keyPrefix}...
											</code>
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-wrap gap-1">
												{#each key.scopes.slice(0, 3) as scope}
													<Badge variant="secondary" class="text-xs">{scope}</Badge>
												{/each}
												{#if key.scopes.length > 3}
													<Badge variant="outline" class="text-xs">+{key.scopes.length - 3}</Badge>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell class="text-muted-foreground text-sm">
											{formatRelativeTime(key.lastUsedAt)}
										</Table.Cell>
										<Table.Cell class="text-sm">
											{#if key.expiresAt}
												{#if new Date(key.expiresAt) < new Date()}
													<Badge variant="destructive" class="text-xs">Expired</Badge>
												{:else}
													{formatDate(key.expiresAt)}
												{/if}
											{:else}
												<span class="text-muted-foreground">Never</span>
											{/if}
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon"
													onclick={() => handleRotate(key.id)}
													aria-label="Rotate key"
												>
													<IconRefresh class="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													class="text-destructive hover:text-destructive"
													onclick={() => handleRevoke(key.id)}
													aria-label="Revoke key"
												>
													<IconTrash class="h-4 w-4" />
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{:else}
				<EmptyState
					type="empty"
					title="No API keys yet"
					description="Create an API key to connect AI agents to your business via MCP."
					actionLabel="Create API Key"
					onAction={() => (showCreateDialog = true)}
				/>
			{/if}

			<!-- Revoked Keys (collapsed) -->
			{#if revokedKeys.length > 0}
				<div class="px-6">
					<h3 class="mb-3 text-sm font-medium text-muted-foreground">Revoked Keys</h3>
					<div class="overflow-x-auto rounded-md border opacity-60">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head>Key</Table.Head>
									<Table.Head>Created</Table.Head>
									<Table.Head>Status</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each revokedKeys as key (key.id)}
									<Table.Row>
										<Table.Cell class="font-medium">{key.name}</Table.Cell>
										<Table.Cell>
											<code class="rounded bg-muted px-2 py-0.5 text-xs">{key.keyPrefix}...</code>
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">{formatDate(key.createdAt)}</Table.Cell>
										<Table.Cell>
											<Badge variant="secondary" class="text-xs">Revoked</Badge>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{/if}

			<!-- Usage Info -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-sm font-medium">How to Use</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2 text-sm text-muted-foreground">
						<p>Connect any MCP-compatible AI agent (Claude, etc.) using your API key:</p>
						<div class="rounded-md bg-muted p-3">
							<code class="text-xs">
								POST /api/mcp<br />
								Authorization: Bearer pos_k_...
							</code>
						</div>
						<p>The agent can then call tools like <code class="rounded bg-muted px-1 text-xs">list-orders</code>, <code class="rounded bg-muted px-1 text-xs">get-menu</code>, <code class="rounded bg-muted px-1 text-xs">create-order</code>, etc. based on the key's scopes and permissions.</p>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</div>

<!-- Create API Key Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Create API Key</Dialog.Title>
			<Dialog.Description>Generate a new API key for AI agent access</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<!-- Name -->
			<div class="grid gap-2">
				<label for="key-name" class="text-sm font-medium">Name *</label>
				<Input
					id="key-name"
					autofocus
					bind:value={newKeyName}
					placeholder="e.g. Inventory Bot, Order Agent"
					maxlength={100}
				/>
			</div>

			<!-- Expiration -->
			<div class="grid gap-2">
				<label for="expires" class="text-sm font-medium">Expiration</label>
				<select
					id="expires"
					bind:value={expiresIn}
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					<option value="never">No expiration</option>
					<option value="7">7 days</option>
					<option value="30">30 days</option>
					<option value="90">90 days</option>
					<option value="365">1 year</option>
				</select>
			</div>

			<!-- Scopes -->
			<div class="grid gap-2">
				<label class="text-sm font-medium">Scopes * <span class="font-normal text-muted-foreground">(what the key can access)</span></label>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each AVAILABLE_SCOPES as scope}
						<button
							type="button"
							class="flex items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:bg-accent {selectedScopes.includes(scope.value) ? 'border-primary bg-primary/5' : ''}"
							onclick={() => toggleScope(scope.value)}
						>
							<Checkbox checked={selectedScopes.includes(scope.value)} />
							<div>
								<p class="font-medium">{scope.label}</p>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Permissions -->
			{#if filteredPermissions.length > 0}
				<div class="grid gap-2">
					<label class="text-sm font-medium">Permissions * <span class="font-normal text-muted-foreground">(what actions are allowed)</span></label>
					<div class="grid gap-1.5">
						{#each filteredPermissions as perm}
							<button
								type="button"
								class="flex items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:bg-accent {selectedPermissions.includes(perm.value) ? 'border-primary bg-primary/5' : ''}"
								onclick={() => togglePermission(perm.value)}
							>
								<Checkbox checked={selectedPermissions.includes(perm.value)} />
								<span>{perm.label}</span>
								<Badge variant="outline" class="ml-auto text-xs">{perm.scope}</Badge>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => { showCreateDialog = false; resetForm(); }} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={handleCreate} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Key
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Generated Key Display Dialog -->
<Dialog.Root bind:open={showKeyDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>API Key Created</Dialog.Title>
			<Dialog.Description>
				Copy your API key now. You won't be able to see it again.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 p-3">
				<IconAlertTriangle class="h-5 w-5 shrink-0 text-warning" />
				<p class="text-sm text-warning">This is the only time you'll see this key. Copy it and store it securely.</p>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex-1 overflow-hidden rounded-md bg-muted p-3">
					<code class="break-all text-sm">
						{#if showKeyValue}
							{generatedKey}
						{:else}
							{'*'.repeat(38)}
						{/if}
					</code>
				</div>
				<div class="flex flex-col gap-1">
					<Button variant="outline" size="icon" onclick={() => (showKeyValue = !showKeyValue)} aria-label={showKeyValue ? 'Hide key' : 'Show key'}>
						{#if showKeyValue}
							<IconEyeOff class="h-4 w-4" />
						{:else}
							<IconEye class="h-4 w-4" />
						{/if}
					</Button>
					<Button variant="outline" size="icon" onclick={copyKey} aria-label="Copy key">
						<IconCopy class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button onclick={() => (showKeyDialog = false)}>Done</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Confirm Dialogs -->
<ConfirmDialog
	bind:open={revokeDialogOpen}
	title="Revoke API Key"
	description="This will immediately invalidate this API key. Any agents using it will lose access. This action cannot be undone."
	confirmLabel="Revoke Key"
	variant="destructive"
	onConfirm={confirmRevoke}
/>

<ConfirmDialog
	bind:open={rotateDialogOpen}
	title="Rotate API Key"
	description="This will revoke the current key and generate a new one with the same configuration. You'll need to update the key in all agents using it."
	confirmLabel="Rotate Key"
	variant="destructive"
	onConfirm={confirmRotate}
/>
