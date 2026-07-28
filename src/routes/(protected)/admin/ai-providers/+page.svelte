<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		getAiProviders,
		getAiModels,
		setProviderEnabled,
		setModelEnabled,
		testProvider,
		syncAiModels,
		type AiProvider,
		type AiModel,
		type GatewayInfo,
		type ProviderStatus
	} from '$lib/api/ai';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import RefreshIcon from '@lucide/svelte/icons/refresh-cw';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import PlugIcon from '@lucide/svelte/icons/plug-zap';
	import AlertIcon from '@lucide/svelte/icons/triangle-alert';
	import ExternalIcon from '@lucide/svelte/icons/external-link';

	let providers = $state<AiProvider[]>([]);
	let models = $state<AiModel[]>([]);
	let gateway = $state<GatewayInfo | null>(null);
	let loading = $state(true);
	let syncing = $state(false);
	let testing = $state<string | null>(null);

	const enabledCount = $derived(providers.filter((p) => p.enabled && p.hasKey).length);

	// Models grouped under their provider, so the table reads as a hierarchy
	// rather than a flat list the operator has to mentally sort.
	const modelsByProvider = $derived(
		providers.map((p) => ({
			provider: p,
			models: models.filter((m) => m.providerSlug === p.slug)
		}))
	);

	onMount(load);

	async function load() {
		loading = true;
		try {
			const [p, m] = await Promise.all([getAiProviders(), getAiModels()]);
			providers = p.providers;
			gateway = p.gateway;
			models = m.models;
		} catch {
			toast.error('Failed to load AI configuration');
		} finally {
			loading = false;
		}
	}

	async function toggleProvider(provider: AiProvider, enabled: boolean) {
		const previous = provider.enabled;
		provider.enabled = enabled; // optimistic
		try {
			const res = await setProviderEnabled(provider.slug, enabled);
			Object.assign(provider, res.provider);
			toast.success(`${provider.label} ${enabled ? 'enabled' : 'disabled'}`);
		} catch {
			provider.enabled = previous;
			toast.error(`Failed to update ${provider.label}`);
		}
	}

	async function toggleModel(model: AiModel, enabled: boolean) {
		const previous = model.enabled;
		model.enabled = enabled;
		try {
			await setModelEnabled(model.id, enabled);
		} catch {
			model.enabled = previous;
			toast.error(`Failed to update ${model.label}`);
		}
	}

	async function runTest(provider: AiProvider) {
		testing = provider.slug;
		try {
			const result = await testProvider(provider.slug);
			provider.status = result.status;
			provider.lastError = result.error ?? null;
			provider.lastCheckAt = new Date().toISOString();
			if (result.ok) toast.success(`${provider.label} is reachable`);
			else toast.error(`${provider.label}: ${result.error ?? result.status}`);
		} catch {
			toast.error(`Failed to test ${provider.label}`);
		} finally {
			testing = null;
		}
	}

	async function runSync() {
		syncing = true;
		try {
			const res = await syncAiModels();
			toast.success(`Synced ${res.openrouter.synced} free OpenRouter models (${res.total} total)`);
			await load();
		} catch {
			toast.error('Model sync failed');
		} finally {
			syncing = false;
		}
	}

	function statusLabel(status: ProviderStatus): string {
		switch (status) {
			case 'HEALTHY':
				return 'Healthy';
			case 'ERROR':
				return 'Error';
			case 'NO_KEY':
				return 'No API key';
			case 'DISABLED':
				return 'Disabled';
			case 'UNTESTED':
				return 'Not tested';
			case 'GATEWAY_UNCONFIGURED':
				return 'Gateway not set up';
		}
	}

	function statusClass(status: ProviderStatus): string {
		switch (status) {
			case 'HEALTHY':
				return 'bg-success/10 text-success border-success/20';
			case 'ERROR':
				return 'bg-destructive/10 text-destructive border-destructive/20';
			case 'NO_KEY':
			case 'GATEWAY_UNCONFIGURED':
				return 'bg-warning/10 text-warning border-warning/20';
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	}

	function formatContext(tokens: number | null): string {
		if (!tokens) return '—';
		if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
		return `${Math.round(tokens / 1000)}K`;
	}
</script>

<svelte:head>
	<title>AI Providers | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">AI Providers</h1>
			<p class="text-muted-foreground">
				Providers are reached through Cloudflare AI Gateway using platform API keys set in the
				environment. Enable the ones this platform should use.
			</p>
		</div>
		<Button variant="outline" onclick={runSync} disabled={syncing}>
			{#if syncing}
				<LoaderIcon class="mr-2 h-4 w-4 animate-spin" />
			{:else}
				<RefreshIcon class="mr-2 h-4 w-4" />
			{/if}
			Sync models
		</Button>
	</div>

	{#if loading}
		<div class="grid gap-4">
			{#each [1, 2, 3] as i (i)}
				<Card.Root>
					<Card.Content class="space-y-3 p-6">
						<Skeleton class="h-5 w-40" />
						<Skeleton class="h-4 w-72" />
						<Skeleton class="h-8 w-full" />
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		{#if gateway && !gateway.configured}
			<Alert.Root variant="destructive">
				<AlertIcon class="h-4 w-4" />
				<Alert.Title>Cloudflare AI Gateway is not configured</Alert.Title>
				<Alert.Description>
					Set <code class="font-mono text-xs">{gateway.accountEnv}</code> and
					<code class="font-mono text-xs">{gateway.gatewayEnv}</code> in the backend environment. Until
					then no provider can serve requests, regardless of what is enabled below.
				</Alert.Description>
			</Alert.Root>
		{:else if !gateway?.authenticated}
			<Alert.Root>
				<AlertIcon class="h-4 w-4" />
				<Alert.Title>No gateway authentication token set</Alert.Title>
				<Alert.Description>
					Cloudflare enables authentication by default on the auto-created <code
						class="font-mono text-xs">default</code
					>
					gateway. If yours has it on, requests will fail with 401 until
					<code class="font-mono text-xs">{gateway?.tokenEnv}</code> is set — create one under Cloudflare
					→ AI Gateway → Settings → Create authentication token. Ignore this if authentication is off
					for your gateway.
				</Alert.Description>
			</Alert.Root>
		{:else if enabledCount === 0}
			<Alert.Root>
				<AlertIcon class="h-4 w-4" />
				<Alert.Title>No provider is active</Alert.Title>
				<Alert.Description>
					The assistant is unavailable to all businesses until at least one provider is enabled and
					has its API key set.
				</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="grid gap-4">
			{#each providers as provider (provider.slug)}
				<Card.Root>
					<Card.Header>
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<Card.Title>{provider.label}</Card.Title>
									<Badge variant="outline" class={statusClass(provider.status)}>
										{statusLabel(provider.status)}
									</Badge>
									{#each provider.modalities as modality (modality)}
										<Badge variant="secondary">{modality}</Badge>
									{/each}
								</div>
								{#if provider.notes}
									<Card.Description>{provider.notes}</Card.Description>
								{/if}
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={() => runTest(provider)}
									disabled={testing === provider.slug || !provider.hasKey}
								>
									{#if testing === provider.slug}
										<LoaderIcon class="mr-2 h-4 w-4 animate-spin" />
									{:else}
										<PlugIcon class="mr-2 h-4 w-4" />
									{/if}
									Test
								</Button>
								<Switch
									checked={provider.enabled}
									onCheckedChange={(v) => toggleProvider(provider, v)}
									aria-label={`Enable ${provider.label}`}
								/>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="space-y-3">
						{#if !provider.hasKey}
							<div class="rounded-md border border-warning/20 bg-warning/10 p-3 text-sm">
								<p class="text-warning">
									Set <code class="font-mono text-xs">{provider.envVar}</code> in the backend environment
									to activate this provider.
								</p>
								<a
									href={provider.keyUrl}
									target="_blank"
									rel="noreferrer"
									class="mt-1 inline-flex items-center gap-1 text-xs underline"
								>
									Get an API key <ExternalIcon class="h-3 w-3" />
								</a>
							</div>
						{/if}

						{#if provider.lastError}
							<div class="rounded-md border border-destructive/20 bg-destructive/10 p-3">
								<p class="font-mono text-xs break-all text-destructive">{provider.lastError}</p>
							</div>
						{/if}

						<div class="flex items-center gap-4 text-sm text-muted-foreground">
							<span>Fallback priority {provider.fallbackOrder / 10}</span>
							<Separator orientation="vertical" class="h-4" />
							<span>{provider.modelCount} models</span>
							{#if provider.lastCheckAt}
								<Separator orientation="vertical" class="h-4" />
								<span>Checked {new Date(provider.lastCheckAt).toLocaleString()}</span>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<div class="space-y-4">
			<div>
				<h2 class="text-xl font-semibold tracking-tight">Models</h2>
				<p class="text-sm text-muted-foreground">
					Only models that support tool calling can serve the assistant, since it works by calling
					MCP tools. The highest-priority enabled model is used first.
				</p>
			</div>

			{#each modelsByProvider as group (group.provider.slug)}
				{#if group.models.length}
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-base">{group.provider.label}</Card.Title>
						</Card.Header>
						<Card.Content>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Model</Table.Head>
										<Table.Head>Context</Table.Head>
										<Table.Head>Tools</Table.Head>
										<Table.Head>Cost</Table.Head>
										<Table.Head class="text-right">Enabled</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each group.models as model (model.id)}
										<Table.Row>
											<Table.Cell>
												<div class="flex items-center gap-2">
													<span class="font-medium">{model.label}</span>
													{#if model.isDefault}
														<Badge variant="secondary">default</Badge>
													{/if}
												</div>
												<span class="font-mono text-xs text-muted-foreground">
													{model.modelId}
												</span>
											</Table.Cell>
											<Table.Cell class="text-muted-foreground">
												{formatContext(model.contextWindow)}
											</Table.Cell>
											<Table.Cell>
												{#if model.supportsTools}
													<Badge
														variant="outline"
														class="border-success/20 bg-success/10 text-success"
													>
														yes
													</Badge>
												{:else}
													<Badge variant="outline" class="text-muted-foreground">no</Badge>
												{/if}
											</Table.Cell>
											<Table.Cell>
												{#if model.isFree}
													<Badge
														variant="outline"
														class="border-success/20 bg-success/10 text-success"
													>
														free
													</Badge>
												{:else}
													<Badge variant="outline">paid</Badge>
												{/if}
											</Table.Cell>
											<Table.Cell class="text-right">
												<Switch
													checked={model.enabled}
													onCheckedChange={(v) => toggleModel(model, v)}
													disabled={!model.supportsTools}
													aria-label={`Enable ${model.label}`}
												/>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</Card.Content>
					</Card.Root>
				{/if}
			{/each}
		</div>
	{/if}
</div>
