<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import IndianRupee from '@lucide/svelte/icons/indian-rupee';
	import Printer from '@lucide/svelte/icons/printer';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Truck from '@lucide/svelte/icons/truck';
	import Globe from '@lucide/svelte/icons/globe';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Plug from '@lucide/svelte/icons/plug';
	import Code from '@lucide/svelte/icons/code';
	import Webhook from '@lucide/svelte/icons/webhook';

	const categories = [
		{
			title: 'Payments',
			description: 'Accept every payment method your customers prefer.',
			integrations: [
				{
					icon: IndianRupee,
					name: 'UPI Payments',
					desc: 'Accept Google Pay, PhonePe, Paytm, and all UPI apps.',
					status: 'live'
				},
				{
					icon: CreditCard,
					name: 'Card Payments',
					desc: 'Visa, Mastercard, RuPay via secure payment gateway.',
					status: 'live'
				},
				{
					icon: IndianRupee,
					name: 'Razorpay',
					desc: 'Full Razorpay integration for online and in-store payments.',
					status: 'coming'
				}
			]
		},
		{
			title: 'Tax & Compliance',
			description: 'Stay compliant with Indian tax regulations automatically.',
			integrations: [
				{
					icon: Receipt,
					name: 'GST Invoicing',
					desc: 'Auto-generate GST-compliant invoices with GSTIN support.',
					status: 'live'
				},
				{
					icon: BarChart3,
					name: 'Tally Export',
					desc: 'Export transactions directly to Tally for seamless accounting.',
					status: 'coming'
				}
			]
		},
		{
			title: 'Printing & Hardware',
			description: 'Connect to the hardware your business already uses.',
			integrations: [
				{
					icon: Printer,
					name: 'Thermal Printers',
					desc: 'KOT and receipt printing on 80mm/58mm thermal printers.',
					status: 'live'
				},
				{
					icon: Printer,
					name: 'Barcode Scanners',
					desc: 'Scan products for quick billing and inventory management.',
					status: 'coming'
				}
			]
		},
		{
			title: 'Communication',
			description: 'Keep your customers informed and engaged.',
			integrations: [
				{
					icon: Mail,
					name: 'Email Notifications',
					desc: 'Automated order confirmations, receipts, and marketing emails.',
					status: 'live'
				},
				{
					icon: MessageSquare,
					name: 'WhatsApp Business',
					desc: 'Send order updates and receipts via WhatsApp.',
					status: 'coming'
				}
			]
		},
		{
			title: 'Delivery & Aggregators',
			description: 'Connect to popular food delivery platforms.',
			integrations: [
				{
					icon: Truck,
					name: 'Zomato',
					desc: 'Sync menu and receive orders from Zomato directly.',
					status: 'coming'
				},
				{
					icon: Truck,
					name: 'Swiggy',
					desc: 'Manage Swiggy orders alongside in-house orders.',
					status: 'coming'
				},
				{
					icon: Globe,
					name: 'ONDC',
					desc: 'Connect to the Open Network for Digital Commerce.',
					status: 'coming'
				}
			]
		},
		{
			title: 'Developer Tools',
			description: 'Build custom integrations with our powerful APIs.',
			integrations: [
				{
					icon: Code,
					name: 'REST API',
					desc: 'Full API access for custom integrations and automation.',
					status: 'live'
				},
				{
					icon: Webhook,
					name: 'Webhooks',
					desc: 'Real-time event notifications for orders, payments, and more.',
					status: 'live'
				},
				{
					icon: Plug,
					name: 'MCP Server',
					desc: 'AI-powered tools for automated business management.',
					status: 'live'
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Integrations — POS Platform</title>
	<meta
		name="description"
		content="POS Platform integrations with UPI, GST, WhatsApp, Zomato, Swiggy, thermal printers, and more. Connect your business tools."
	/>
</svelte:head>

<div class="pt-28 lg:pt-36">
	<!-- Header -->
	<section class="relative pb-20">
		<div aria-hidden="true" class="absolute inset-0 -z-10">
			<div class="dot-grid absolute inset-0 opacity-30 dark:opacity-15"></div>
			<div
				class="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/5 blur-3xl"
			></div>
		</div>

		<div class="mx-auto max-w-7xl px-6 text-center lg:px-8">
			<p class="animate-fade-up text-sm font-semibold uppercase tracking-wider text-primary">
				Integrations
			</p>
			<h1 class="animate-fade-up delay-100 mt-3 font-display text-4xl md:text-5xl lg:text-6xl">
				Connect your <span class="italic">entire</span> ecosystem
			</h1>
			<p class="animate-fade-up delay-200 mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
				From UPI payments to food delivery aggregators — POS Platform integrates with the tools
				Indian businesses use every day.
			</p>
		</div>
	</section>

	<!-- Integration Categories -->
	<section class="pb-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="space-y-20">
				{#each categories as category, ci}
					<div>
						<div class="mb-8">
							<h2 class="font-display text-2xl md:text-3xl">{category.title}</h2>
							<p class="mt-2 text-muted-foreground">{category.description}</p>
						</div>

						<div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
							{#each category.integrations as integration}
								<div
									class="group relative rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
								>
									<div
										class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
									></div>

									<div class="flex items-start justify-between">
										<div
											class="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
										>
											<integration.icon class="size-5" />
										</div>
										{#if integration.status === 'live'}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
											>
												<span class="size-1.5 rounded-full bg-success"></span>
												Live
											</span>
										{:else}
											<span
												class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
											>
												Coming Soon
											</span>
										{/if}
									</div>
									<h3 class="mt-4 text-base font-semibold">{integration.name}</h3>
									<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
										{integration.desc}
									</p>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="pb-8">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div
				class="grain-overlay relative overflow-hidden rounded-2xl bg-primary px-8 py-20 text-center text-primary-foreground"
			>
				<div
					aria-hidden="true"
					class="absolute -right-20 -top-20 size-64 rounded-full border border-primary-foreground/10"
				></div>

				<div class="relative z-10">
					<h2 class="font-display text-3xl md:text-4xl">Need a custom integration?</h2>
					<p class="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/80">
						Our API and developer tools make it easy to build exactly what your business needs.
					</p>
					<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Button href="/contact" size="lg" variant="secondary" class="px-8 text-base">
							Talk to Our Team
							<ArrowRight class="ml-1.5 size-4" />
						</Button>
						<Button
							href="/pricing"
							size="lg"
							variant="outline"
							class="border-primary-foreground/30 px-8 text-base text-primary-foreground hover:bg-primary-foreground/10"
						>
							View API Plans
						</Button>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
