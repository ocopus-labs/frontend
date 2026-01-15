<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Download from '@lucide/svelte/icons/download';
	import Plus from '@lucide/svelte/icons/plus';
	import Receipt from '@lucide/svelte/icons/receipt';

	// Mock billing data
	const paymentMethods = [
		{
			id: '1',
			type: 'visa',
			last4: '4242',
			expiry: '12/25',
			isDefault: true
		}
	];

	const invoices = [
		{
			id: 'INV-001',
			date: '2024-01-01',
			amount: '$0.00',
			status: 'paid',
			description: 'Free Plan - January 2024'
		}
	];
</script>

<svelte:head>
	<title>Billing | POS</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Billing</h1>
		<p class="mt-2 text-muted-foreground">
			Manage your payment methods and view billing history.
		</p>
	</div>

	<!-- Current Billing -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Current Plan</Card.Title>
			<Card.Description>Your subscription details</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-2xl font-bold">Free Plan</p>
					<p class="text-muted-foreground">$0.00/month</p>
				</div>
				<Button href="/dashboard/subscriptions">Upgrade Plan</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Payment Methods -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Payment Methods</Card.Title>
					<Card.Description>Manage your payment options</Card.Description>
				</div>
				<Button variant="outline" size="sm">
					<Plus class="mr-2 size-4" />
					Add Payment Method
				</Button>
			</div>
		</Card.Header>
		<Card.Content>
			{#if paymentMethods.length > 0}
				<div class="space-y-4">
					{#each paymentMethods as method}
						<div class="flex items-center justify-between rounded-lg border p-4">
							<div class="flex items-center gap-4">
								<div class="flex size-10 items-center justify-center rounded bg-muted">
									<CreditCard class="size-5" />
								</div>
								<div>
									<p class="font-medium">
										{method.type.toUpperCase()} ending in {method.last4}
									</p>
									<p class="text-sm text-muted-foreground">Expires {method.expiry}</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if method.isDefault}
									<Badge variant="secondary">Default</Badge>
								{/if}
								<Button variant="ghost" size="sm">Edit</Button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="py-8 text-center">
					<CreditCard class="mx-auto size-12 text-muted-foreground" />
					<p class="mt-4 text-muted-foreground">No payment methods added</p>
					<Button class="mt-4" variant="outline">
						<Plus class="mr-2 size-4" />
						Add Payment Method
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Billing History -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Billing History</Card.Title>
			<Card.Description>View and download past invoices</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if invoices.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Invoice</Table.Head>
							<Table.Head>Date</Table.Head>
							<Table.Head>Description</Table.Head>
							<Table.Head>Amount</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each invoices as invoice}
							<Table.Row>
								<Table.Cell class="font-medium">{invoice.id}</Table.Cell>
								<Table.Cell>{invoice.date}</Table.Cell>
								<Table.Cell>{invoice.description}</Table.Cell>
								<Table.Cell>{invoice.amount}</Table.Cell>
								<Table.Cell>
									<Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
										{invoice.status}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button variant="ghost" size="sm">
										<Download class="mr-2 size-4" />
										Download
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<div class="py-8 text-center">
					<Receipt class="mx-auto size-12 text-muted-foreground" />
					<p class="mt-4 text-muted-foreground">No invoices yet</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
