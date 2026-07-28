<script lang="ts" module>
	// Imported here rather than in the instance script because the card table
	// below is module-scoped — it is exported for tests and shared with the
	// panel's own empty state.
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import PackageIcon from '@lucide/svelte/icons/package';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ContactIcon from '@lucide/svelte/icons/contact';

	/**
	 * Capability groups, expanded into concrete prompts.
	 *
	 * Four cards rather than a wall of suggestions: an operator who has never
	 * used an assistant does not know what to type, and a long list of examples
	 * is read as a menu of the only things it can do. A card names a domain and
	 * only then offers prompts, which teaches the shape of a question instead of
	 * a fixed set of them.
	 *
	 * Prompts are phrased against the business-type label from the sidebar
	 * adapter where one exists ("appointments" for a salon), so the copy does
	 * not tell a gym owner to ask about tables.
	 */
	export interface CapabilityCard {
		id: string;
		title: string;
		icon: typeof TrendingUpIcon;
		/** Roles this card is worth showing; empty means everyone. */
		roles?: string[];
		prompts: (labels: DomainLabels) => string[];
	}

	interface DomainLabels {
		operation: string;
		operations: string;
		customer: string;
		customers: string;
	}

	const LABELS_BY_TYPE: Record<string, DomainLabels> = {
		salon: {
			operation: 'appointment',
			operations: 'appointments',
			customer: 'client',
			customers: 'clients'
		},
		spa: {
			operation: 'appointment',
			operations: 'appointments',
			customer: 'client',
			customers: 'clients'
		},
		clinic: {
			operation: 'appointment',
			operations: 'appointments',
			customer: 'patient',
			customers: 'patients'
		},
		gym: {
			operation: 'membership',
			operations: 'memberships',
			customer: 'member',
			customers: 'members'
		}
	};

	const DEFAULT_LABELS: DomainLabels = {
		operation: 'order',
		operations: 'orders',
		customer: 'customer',
		customers: 'customers'
	};

	export function labelsFor(businessType: string | null | undefined): DomainLabels {
		return LABELS_BY_TYPE[(businessType ?? '').toLowerCase()] ?? DEFAULT_LABELS;
	}

	export const CAPABILITY_CARDS: CapabilityCard[] = [
		{
			id: 'sales',
			title: 'Sales',
			icon: TrendingUpIcon,
			prompts: (l) => [
				"What were today's sales?",
				`Show me open ${l.operations}`,
				'Compare this week to last week'
			]
		},
		{
			id: 'inventory',
			title: 'Inventory',
			icon: PackageIcon,
			prompts: () => [
				'Which items are low on stock?',
				'What did we spend on supplies this month?',
				'Show me pending purchase orders'
			]
		},
		{
			id: 'staff',
			title: 'Staff',
			icon: UsersIcon,
			// A staff member seeing "who is on shift" is fine; the tools behind
			// the rota answers are permission-gated either way, so the card is
			// shown to everyone and the assistant declines what it cannot do.
			prompts: () => [
				'Who is on shift right now?',
				"Show me this week's rota",
				'Any pending leave requests?'
			]
		},
		{
			id: 'customers',
			title: 'Customers',
			icon: ContactIcon,
			prompts: (l) => [
				`Who are our top ${l.customers} this month?`,
				`Show me ${l.customers} who haven't been back in 60 days`,
				'How many loyalty points are outstanding?'
			]
		}
	];
</script>

<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Shimmer } from '@shimmer-from-structure/svelte';
	import { agent, ASSISTANT_NAME } from '$lib/stores/agent.svelte';
	import Composer from './composer.svelte';
	import AgentError from './agent-error.svelte';
	import { agentErrorCopy } from './agent-errors';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import MessageIcon from '@lucide/svelte/icons/message-square';

	interface Props {
		/** Operator's display name, for the greeting. Falls back to no name. */
		userName?: string | null;
		/** `Restaurant.type`, so the prompts use this business's vocabulary. */
		businessType?: string | null;
		/** Base path for `/assistant`, used by the recent-conversation links. */
		basePath: string;
		onSend: (text: string) => void;
		sending?: boolean;
	}

	let { userName = null, businessType = null, basePath, onSend, sending = false }: Props = $props();

	const readiness = $derived(agent.readiness);
	const labels = $derived(labelsFor(businessType));
	const loading = $derived(readiness.state === 'unknown' || readiness.state === 'checking');

	/** Expanded card, or null. One at a time — this is a hint, not a menu. */
	let expanded = $state<string | null>(null);

	const greeting = $derived(userName ? `Hello, ${userName}` : `Ask ${ASSISTANT_NAME}`);

	const recent = $derived(agent.sessions.filter((s) => !s.archived).slice(0, 4));

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
	}
</script>

<div class="mx-auto flex w-full max-w-[46rem] flex-col gap-6 px-4 py-8">
	<div class="flex flex-col items-center gap-3 text-center">
		<SparklesIcon class="size-8 text-primary" aria-hidden="true" />
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">{greeting}</h1>
			<p class="text-base text-muted-foreground">
				Ask about {labels.operations}, stock, staff or {labels.customers} — answered from live data.
			</p>
		</div>

		<!--
			Shimmered rather than hidden: the chip appears a beat after the page
			does, and an element that pops into a centred column shifts everything
			under it. See UI audit §3.3.
		-->
		<Shimmer {loading} class="rounded-full">
			{#if readiness.state === 'ready'}
				<Badge variant="outline" class="gap-1.5 font-normal">
					<WrenchIcon class="size-3" aria-hidden="true" />
					{readiness.toolCount} tools connected
					{#if readiness.quota && readiness.quota.messagesLimit !== null}
						<span class="text-muted-foreground">
							· {readiness.quota.messagesLimit - readiness.quota.messagesUsed} messages left today
						</span>
					{/if}
				</Badge>
			{:else}
				<Badge variant="outline" class="gap-1.5 font-normal">
					<WrenchIcon class="size-3" aria-hidden="true" />
					000 tools connected
				</Badge>
			{/if}
		</Shimmer>
	</div>

	{#if readiness.state === 'blocked'}
		<AgentError
			copy={agentErrorCopy(readiness.code, readiness.message)}
			onRetry={() => void agent.checkReadiness()}
		/>
	{:else}
		<Composer {onSend} status={sending ? 'submitted' : 'ready'} autofocus />

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each CAPABILITY_CARDS as card (card.id)}
				{@const open = expanded === card.id}
				<div class="rounded-lg border border-border bg-card">
					<Button
						variant="ghost"
						size="touch"
						class="w-full justify-start gap-2 px-3 font-medium"
						aria-expanded={open}
						aria-controls={`capability-${card.id}`}
						onclick={() => toggle(card.id)}
					>
						<card.icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						{card.title}
					</Button>
					{#if open}
						<ul id={`capability-${card.id}`} class="space-y-1 border-t border-border p-2">
							{#each card.prompts(labels) as prompt (prompt)}
								<li>
									<Button
										variant="ghost"
										size="sm"
										class="h-auto w-full justify-start py-2 text-left text-sm font-normal whitespace-normal text-muted-foreground hover:text-foreground"
										onclick={() => onSend(prompt)}
									>
										{prompt}
									</Button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>

		{#if recent.length}
			<div class="space-y-2">
				<h2 class="text-sm font-medium text-muted-foreground">Recent</h2>
				<ul class="space-y-1">
					{#each recent as session (session.id)}
						<li>
							<a
								href={`${basePath}/${session.id}`}
								class="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
							>
								<MessageIcon class="size-3.5 shrink-0" aria-hidden="true" />
								<span class="truncate">{session.title ?? 'New conversation'}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>
