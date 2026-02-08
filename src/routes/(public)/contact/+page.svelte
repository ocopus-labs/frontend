<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
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
		else if (message.trim().length < 10)
			newErrors.message = 'Message must be at least 10 characters';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		submitting = true;
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

	const contactInfo = [
		{
			icon: MailIcon,
			title: 'Email',
			lines: ['support@posplatform.in', 'sales@posplatform.in']
		},
		{
			icon: PhoneIcon,
			title: 'Phone',
			lines: ['+91 98765 43210', 'Mon-Sat, 9 AM - 6 PM IST']
		},
		{
			icon: MapPinIcon,
			title: 'Office',
			lines: ['Bangalore, Karnataka', 'India']
		},
		{
			icon: ClockIcon,
			title: 'Response Time',
			lines: ['Within 24 hours', 'on business days']
		}
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
	<title>Contact — POS Platform</title>
	<meta
		name="description"
		content="Get in touch with the POS Platform team. We are here to help you find the right plan and get started."
	/>
</svelte:head>

<div class="pt-28 lg:pt-36">
	<!-- Header -->
	<section class="relative pb-16">
		<div aria-hidden="true" class="absolute inset-0 -z-10">
			<div class="dot-grid absolute inset-0 opacity-30 dark:opacity-15"></div>
		</div>

		<div class="mx-auto max-w-7xl px-6 text-center lg:px-8">
			<p class="animate-fade-up text-sm font-semibold uppercase tracking-wider text-primary">
				Contact
			</p>
			<h1 class="animate-fade-up delay-100 mt-3 font-display text-4xl md:text-5xl lg:text-6xl">
				Get in <span class="italic">touch</span>
			</h1>
			<p class="animate-fade-up delay-200 mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
				Have a question or need help choosing the right plan? We would love to hear from you.
			</p>
		</div>
	</section>

	<!-- Contact Content -->
	<section class="pb-24">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="grid gap-12 lg:grid-cols-5">
				<!-- Form -->
				<div class="lg:col-span-3">
					<div class="rounded-xl border bg-card p-6 md:p-8">
						<h2 class="text-lg font-semibold">Send us a message</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							Fill out the form and we will get back to you as soon as possible.
						</p>

						<form onsubmit={handleSubmit} class="mt-6 space-y-5">
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
												'Select type'}
										</Select.Trigger>
										<Select.Content>
											{#each businessTypes as bt}
												<Select.Item value={bt.value} label={bt.label}>{bt.label}</Select.Item>
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
									<SendIcon class="ml-1.5 size-4" />
								{/if}
							</Button>
						</form>
					</div>
				</div>

				<!-- Contact Info + FAQ -->
				<div class="space-y-5 lg:col-span-2">
					{#each contactInfo as info}
						<div class="flex items-start gap-4 rounded-xl border bg-card p-5">
							<div
								class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
							>
								<info.icon class="size-5" />
							</div>
							<div>
								<p class="text-sm font-semibold">{info.title}</p>
								{#each info.lines as line}
									<p class="text-sm text-muted-foreground">{line}</p>
								{/each}
							</div>
						</div>
					{/each}

					<Separator />

					<div>
						<h3 class="mb-4 text-sm font-semibold">Quick answers</h3>
						<Accordion.Root type="single">
							{#each faqs as faq, i}
								<Accordion.Item value="faq-{i}">
									<Accordion.Trigger class="text-sm">{faq.q}</Accordion.Trigger>
									<Accordion.Content>
										<p class="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
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
