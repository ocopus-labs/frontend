<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Field from '$lib/components/ui/field';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatDate } from '$lib/utils/formatting';
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
	import { env } from '$env/dynamic/public';

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

	// MCP connection guide data
	const mcpEndpoint = `${env.PUBLIC_API_BASE ?? ''}/mcp`;

	interface McpGuide {
		name: string;
		configPaths: string[];
		config: string;
		notes?: string;
	}

	const guides = $derived<McpGuide[]>([
		{
			name: 'Claude Desktop',
			configPaths: [
				'macOS: ~/Library/Application Support/Claude/claude_desktop_config.json',
				'Windows: %APPDATA%\\Claude\\claude_desktop_config.json'
			],
			config: JSON.stringify(
				{
					mcpServers: {
						'business-pos': {
							url: mcpEndpoint,
							headers: { Authorization: 'Bearer YOUR_API_KEY' }
						}
					}
				},
				null,
				2
			)
		},
		{
			name: 'VS Code',
			configPaths: ['.vscode/mcp.json in your project root'],
			config: JSON.stringify(
				{
					servers: {
						'business-pos': {
							type: 'http',
							url: mcpEndpoint,
							headers: { Authorization: 'Bearer YOUR_API_KEY' }
						}
					}
				},
				null,
				2
			),
			notes: 'Works with the Claude Code extension and GitHub Copilot.'
		},
		{
			name: 'Cursor',
			configPaths: ['.cursor/mcp.json in your project root'],
			config: JSON.stringify(
				{
					mcpServers: {
						'business-pos': {
							url: mcpEndpoint,
							headers: { Authorization: 'Bearer YOUR_API_KEY' }
						}
					}
				},
				null,
				2
			)
		},
		{
			name: 'Windsurf',
			configPaths: ['~/.codeium/windsurf/mcp_config.json'],
			config: JSON.stringify(
				{
					mcpServers: {
						'business-pos': {
							url: mcpEndpoint,
							headers: { Authorization: 'Bearer YOUR_API_KEY' }
						}
					}
				},
				null,
				2
			)
		}
	]);

	const claudeCliCommand = $derived(
		`claude mcp add --transport streamable-http business-pos ${mcpEndpoint} --header "Authorization: Bearer YOUR_API_KEY"`
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
			const scopePerms: string[] = AVAILABLE_PERMISSIONS.filter((p) => p.scope === scope).map(
				(p) => p.value as string
			);
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
			apiKeys = apiKeys.map((k) => (k.id === revokeTargetId ? { ...k, isActive: false } : k));
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
			apiKeys = apiKeys.map((k) => (k.id === rotateTargetId ? { ...k, isActive: false } : k));
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

	async function copyText(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Copied to clipboard');
		} catch {
			toast.error('Failed to copy');
		}
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

<PageShell back title="API Keys" description="Manage API keys for MCP integrations and AI agents">
	{#snippet actions()}
		<Button onclick={() => (showCreateDialog = true)}>
			<IconPlus class="mr-2 h-4 w-4" />
			Create API Key
		</Button>
	{/snippet}

	<Tabs.Root value="keys">
		<Tabs.List>
			<Tabs.Trigger value="keys">API Keys</Tabs.Trigger>
			<Tabs.Trigger value="guide">Setup Guide</Tabs.Trigger>
		</Tabs.List>

		<!-- Keys Tab -->
		<Tabs.Content value="keys" class="space-y-4 pt-4">
			<!-- Usage -->
			<div>
				<SettingsSection
					title="Usage"
					description="Active keys count towards this business's limit."
				>
					<div class="grid grid-cols-3 gap-4">
						<div>
							<p class="text-xs text-muted-foreground">Active</p>
							<div class="mt-1 flex items-center gap-2">
								<IconKey class="h-4 w-4 text-muted-foreground" />
								<span class="text-2xl font-semibold">{activeKeys.length}</span>
							</div>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Revoked</p>
							<p class="mt-1 text-2xl font-semibold text-muted-foreground">{revokedKeys.length}</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Limit</p>
							<p class="mt-1 text-2xl font-semibold">{activeKeys.length} / 5</p>
						</div>
					</div>
				</SettingsSection>
			</div>

			<!-- Active Keys Table -->
			{#if activeKeys.length > 0}
				<div>
					<h3 class="mb-3 text-sm font-medium text-muted-foreground">Active Keys</h3>
					<div class="overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head class="hidden sm:table-cell">Key</Table.Head>
									<Table.Head class="hidden md:table-cell">Scopes</Table.Head>
									<Table.Head class="hidden lg:table-cell">Last Used</Table.Head>
									<Table.Head class="hidden lg:table-cell">Expires</Table.Head>
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
										<Table.Cell class="hidden sm:table-cell">
											<code class="rounded bg-muted px-2 py-0.5 text-xs">
												{key.keyPrefix}...
											</code>
										</Table.Cell>
										<Table.Cell class="hidden md:table-cell">
											<div class="flex flex-wrap gap-1">
												{#each key.scopes.slice(0, 3) as scope}
													<Badge variant="secondary" class="text-xs">{scope}</Badge>
												{/each}
												{#if key.scopes.length > 3}
													<Badge variant="outline" class="text-xs">+{key.scopes.length - 3}</Badge>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell class="hidden text-sm text-muted-foreground lg:table-cell">
											{formatRelativeTime(key.lastUsedAt)}
										</Table.Cell>
										<Table.Cell class="hidden text-sm lg:table-cell">
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

			<!-- Revoked Keys -->
			{#if revokedKeys.length > 0}
				<div>
					<h3 class="mb-3 text-sm font-medium text-muted-foreground">Revoked Keys</h3>
					<div class="overflow-x-auto rounded-md border opacity-60">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head class="hidden sm:table-cell">Key</Table.Head>
									<Table.Head class="hidden lg:table-cell">Created</Table.Head>
									<Table.Head>Status</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each revokedKeys as key (key.id)}
									<Table.Row>
										<Table.Cell class="font-medium">{key.name}</Table.Cell>
										<Table.Cell class="hidden sm:table-cell">
											<code class="rounded bg-muted px-2 py-0.5 text-xs">{key.keyPrefix}...</code>
										</Table.Cell>
										<Table.Cell class="hidden text-muted-foreground lg:table-cell"
											>{formatDate(key.createdAt)}</Table.Cell
										>
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
		</Tabs.Content>

		<!-- Setup Guide Tab -->
		<Tabs.Content value="guide" class="space-y-6 pt-4">
			<div class="space-y-2">
				<p class="text-sm text-muted-foreground">
					Connect any MCP-compatible AI application to your business. Create an API key in the
					<strong>API Keys</strong> tab, then add the configuration below to your preferred app.
				</p>
				<div class="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
					<span class="text-xs text-muted-foreground">MCP Endpoint:</span>
					<code class="text-xs font-medium">{mcpEndpoint}</code>
					<Button
						variant="ghost"
						size="icon"
						class="ml-auto h-6 w-6"
						onclick={() => copyText(mcpEndpoint)}
						aria-label="Copy endpoint URL"
					>
						<IconCopy class="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			<!-- App-specific guides -->
			<div>
				{#each guides as guide (guide.name)}
					<SettingsSection title={guide.name} description={guide.notes}>
						<div class="flex flex-col gap-0.5">
							{#each guide.configPaths as configPath}
								<code class="text-xs break-all text-muted-foreground">{configPath}</code>
							{/each}
						</div>
						<div class="relative">
							<pre
								class="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{guide.config}</pre>
							<Button
								variant="ghost"
								size="icon"
								class="absolute top-2 right-2 h-7 w-7 bg-muted hover:bg-accent"
								onclick={() => copyText(guide.config)}
								aria-label="Copy {guide.name} configuration"
							>
								<IconCopy class="h-3.5 w-3.5" />
							</Button>
						</div>
					</SettingsSection>
				{/each}

				<!-- Claude Code CLI -->
				<SettingsSection title="Claude Code (CLI)" description="Run this in your terminal.">
					<div class="relative">
						<pre
							class="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{claudeCliCommand}</pre>
						<Button
							variant="ghost"
							size="icon"
							class="absolute top-2 right-2 h-7 w-7 bg-muted hover:bg-accent"
							onclick={() => copyText(claudeCliCommand)}
							aria-label="Copy CLI command"
						>
							<IconCopy class="h-3.5 w-3.5" />
						</Button>
					</div>
				</SettingsSection>
			</div>

			<p class="text-xs text-muted-foreground">
				Replace <code class="rounded bg-muted px-1 font-medium">YOUR_API_KEY</code> with an active
				API key from the API Keys tab. The agent can then call tools like
				<code class="rounded bg-muted px-1">list-orders</code>,
				<code class="rounded bg-muted px-1">get-menu</code>,
				<code class="rounded bg-muted px-1">create-order</code>, etc. based on the key's scopes and
				permissions.
			</p>
		</Tabs.Content>
	</Tabs.Root>
</PageShell>

<!-- Create API Key Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Create API Key</Dialog.Title>
			<Dialog.Description>Generate a new API key for AI agent access</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<!-- Name -->
			<Field.Field>
				<Field.Label for="key-name">Name *</Field.Label>
				<Input
					id="key-name"
					autofocus
					bind:value={newKeyName}
					placeholder="e.g. Inventory Bot, Order Agent"
					maxlength={100}
					class="max-w-sm"
				/>
			</Field.Field>

			<!-- Expiration -->
			<Field.Field>
				<Field.Label for="expires">Expiration</Field.Label>
				<NativeSelect id="expires" bind:value={expiresIn} class="w-full sm:max-w-xs">
					<NativeSelectOption value="never">No expiration</NativeSelectOption>
					<NativeSelectOption value="7">7 days</NativeSelectOption>
					<NativeSelectOption value="30">30 days</NativeSelectOption>
					<NativeSelectOption value="90">90 days</NativeSelectOption>
					<NativeSelectOption value="365">1 year</NativeSelectOption>
				</NativeSelect>
			</Field.Field>

			<!-- Scopes -->
			<Field.Field>
				<Field.Label>Scopes *</Field.Label>
				<Field.Description>What the key can access.</Field.Description>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each AVAILABLE_SCOPES as scope}
						{@const scopeChecked = selectedScopes.includes(scope.value)}
						<div
							class="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent {scopeChecked
								? 'border-primary bg-primary/5'
								: ''}"
						>
							<Checkbox
								id="scope-{scope.value}"
								checked={scopeChecked}
								onCheckedChange={() => toggleScope(scope.value)}
							/>
							<Label for="scope-{scope.value}" class="flex-1 cursor-pointer text-sm">
								{scope.label}
							</Label>
						</div>
					{/each}
				</div>
			</Field.Field>

			<!-- Permissions -->
			{#if filteredPermissions.length > 0}
				<Field.Field>
					<Field.Label>Permissions *</Field.Label>
					<Field.Description>What actions are allowed.</Field.Description>
					<div class="grid gap-1.5">
						{#each filteredPermissions as perm}
							{@const permChecked = selectedPermissions.includes(perm.value)}
							<div
								class="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent {permChecked
									? 'border-primary bg-primary/5'
									: ''}"
							>
								<Checkbox
									id="perm-{perm.value}"
									checked={permChecked}
									onCheckedChange={() => togglePermission(perm.value)}
								/>
								<Label for="perm-{perm.value}" class="flex-1 cursor-pointer text-sm">
									{perm.label}
								</Label>
								<Badge variant="outline" class="text-xs">{perm.scope}</Badge>
							</div>
						{/each}
					</div>
				</Field.Field>
			{/if}
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					showCreateDialog = false;
					resetForm();
				}}
				disabled={isSubmitting}
			>
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
				<p class="text-sm text-warning">
					This is the only time you'll see this key. Copy it and store it securely.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex-1 overflow-hidden rounded-md bg-muted p-3">
					<code class="text-sm break-all">
						{#if showKeyValue}
							{generatedKey}
						{:else}
							{'*'.repeat(38)}
						{/if}
					</code>
				</div>
				<div class="flex flex-col gap-1">
					<Button
						variant="outline"
						size="icon"
						onclick={() => (showKeyValue = !showKeyValue)}
						aria-label={showKeyValue ? 'Hide key' : 'Show key'}
					>
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
