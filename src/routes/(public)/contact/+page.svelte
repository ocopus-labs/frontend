<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { toast } from 'svelte-sonner';

	import MailIcon from '@lucide/svelte/icons/mail';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import SendIcon from '@lucide/svelte/icons/send';
	import ClockIcon from '@lucide/svelte/icons/clock';

	let name = $state('');
	let email = $state('');
	let subject = $state('');
	let businessType = $state<string | undefined>(undefined);
	let message = $state('');
	let submitting = $state(false);

	let errors = $state<Record<string, string>>({});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!name.trim()) newErrors.name = 'Name is required';
		if (!email.trim()) newErrors.email = 'Email is required';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email address';
		if (!subject.trim()) newErrors.subject = 'Subject is required';
		if (!message.trim()) newErrors.message = 'Message is required';
		else if (message.trim().length < 10) newErrors.message = 'Message must be at least 10 characters';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		submitting = true;
		// Simulate network delay
		await new Promise((r) => setTimeout(r, 1000));
		submitting = false;

		toast.success('Message sent successfully! We will get back to you within 24 hours.');
		name = '';
		email = '';
		subject = '';
		businessType = undefined;
		message = '';
		errors = {};
	}

	const businessTypes = [
		{ value: 'restaurant', label: 'Restaurant' },
		{ value: 'cafe', label: 'Cafe' },
		{ value: 'salon', label: 'Salon' },
		{ value: 'spa', label: 'Spa' },
		{ value: 'gym', label: 'Gym' },
		{ value: 'clinic', label: 'Clinic' },
		{ value: 'hotel', label: 'Hotel' },
		{ value: 'other', label: 'Other' }
	];

	const faqs = [
		{
			q: 'How quickly do you respond?',
			a: 'We typically respond within 24 hours on business days. Pro and Enterprise customers get priority support with faster response times.'
		},
		{
			q: 'Do you offer on-site setup assistance?',
			a: 'Yes! For Enterprise customers, we provide on-site setup and training. Pro customers can access remote setup assistance via video call.'
		},
		{
			q: 'Can I request a live demo?',
			a: 'Absolutely! Fill out the contact form with "Demo Request" as the subject and our team will schedule a personalized demo for you.'
		}
	];
</script>

<svelte:head>
	<title>Contact - POS Platform</title>
	<meta
		name="description"
		content="Get in touch with the POS Platform team. We are here to help you find the right plan and get started."
	/>
</svelte:head>

<div class="pt-24 lg:pt-28">
	<!-- Header -->
	<section class="pb-12">
		<div class="mx-auto max-w-6xl px-6 text-center">
			<Badge variant="secondary" class="mb-4">Contact</Badge>
			<h1 class="text-4xl font-bold tracking-tight md:text-5xl">Get in Touch</h1>
			<p class="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
				Have a question or need help choosing the right plan? We would love to hear from you.
			</p>
		</div>
	</section>

	<!-- Contact Content -->
	<section class="pb-20">
		<div class="mx-auto max-w-6xl px-6">
			<div class="grid gap-12 lg:grid-cols-5">
				<!-- Contact Form -->
				<div class="lg:col-span-3">
					<Card.Root>
						<Card.Header>
							<Card.Title>Send us a message</Card.Title>
							<Card.Description>
								Fill out the form below and we will get back to you as soon as possible.
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<form onsubmit={handleSubmit} class="space-y-5">
								<div class="grid gap-5 sm:grid-cols-2">
									<div class="space-y-2">
										<Label for="name">Name *</Label>
										<Input
											id="name"
											bind:value={name}
											placeholder="Your name"
											class={errors.name ? 'border-destructive' : ''}
										/>
										{#if errors.name}
											<p class="text-xs text-destructive">{errors.name}</p>
										{/if}
									</div>
									<div class="space-y-2">
										<Label for="email">Email *</Label>
										<Input
											id="email"
											type="email"
											bind:value={email}
											placeholder="you@example.com"
											class={errors.email ? 'border-destructive' : ''}
										/>
										{#if errors.email}
											<p class="text-xs text-destructive">{errors.email}</p>
										{/if}
									</div>
								</div>

								<div class="grid gap-5 sm:grid-cols-2">
									<div class="space-y-2">
										<Label for="subject">Subject *</Label>
										<Input
											id="subject"
											bind:value={subject}
											placeholder="How can we help?"
											class={errors.subject ? 'border-destructive' : ''}
										/>
										{#if errors.subject}
											<p class="text-xs text-destructive">{errors.subject}</p>
										{/if}
									</div>
									<div class="space-y-2">
										<Label for="business-type">Business Type</Label>
										<Select.Root type="single" bind:value={businessType}>
											<Select.Trigger id="business-type">
												{businessTypes.find((b) => b.value === businessType)?.label ??
													'Select your business type'}
											</Select.Trigger>
											<Select.Content>
												{#each businessTypes as bt}
													<Select.Item value={bt.value} label={bt.label}
														>{bt.label}</Select.Item
													>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
								</div>

								<div class="space-y-2">
									<Label for="message">Message *</Label>
									<Textarea
										id="message"
										bind:value={message}
										placeholder="Tell us about your business and how we can help..."
										rows={5}
										class={errors.message ? 'border-destructive' : ''}
									/>
									{#if errors.message}
										<p class="text-xs text-destructive">{errors.message}</p>
									{/if}
								</div>

								<Button type="submit" class="w-full sm:w-auto" disabled={submitting}>
									{#if submitting}
										Sending...
									{:else}
										Send Message
										<SendIcon class="ml-1 size-4" />
									{/if}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Contact Info -->
				<div class="space-y-6 lg:col-span-2">
					<Card.Root>
						<Card.Content class="pt-6">
							<div class="flex items-start gap-4">
								<div
									class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
								>
									<MailIcon class="size-5" />
								</div>
								<div>
									<p class="font-medium">Email</p>
									<p class="mt-1 text-sm text-muted-foreground">support@posplatform.in</p>
									<p class="text-sm text-muted-foreground">sales@posplatform.in</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Content class="pt-6">
							<div class="flex items-start gap-4">
								<div
									class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
								>
									<PhoneIcon class="size-5" />
								</div>
								<div>
									<p class="font-medium">Phone</p>
									<p class="mt-1 text-sm text-muted-foreground">+91 98765 43210</p>
									<p class="text-xs text-muted-foreground">Mon-Sat, 9 AM - 6 PM IST</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Content class="pt-6">
							<div class="flex items-start gap-4">
								<div
									class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
								>
									<MapPinIcon class="size-5" />
								</div>
								<div>
									<p class="font-medium">Office</p>
									<p class="mt-1 text-sm text-muted-foreground">
										Bangalore, Karnataka<br />India
									</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Content class="pt-6">
							<div class="flex items-start gap-4">
								<div
									class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
								>
									<ClockIcon class="size-5" />
								</div>
								<div>
									<p class="font-medium">Response Time</p>
									<p class="mt-1 text-sm text-muted-foreground">
										Within 24 hours on business days
									</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<Separator />

					<!-- Mini FAQ -->
					<div>
						<h3 class="mb-4 text-sm font-semibold">Quick Answers</h3>
						<Accordion.Root type="single">
							{#each faqs as faq, i}
								<Accordion.Item value="faq-{i}">
									<Accordion.Trigger class="text-sm">{faq.q}</Accordion.Trigger>
									<Accordion.Content>
										<p class="text-sm text-muted-foreground">{faq.a}</p>
									</Accordion.Content>
								</Accordion.Item>
							{/each}
						</Accordion.Root>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
