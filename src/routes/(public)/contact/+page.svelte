<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();

	let name = $state('');
	let email = $state('');
	let subject = $state('');
	let message = $state('');

	// UI states
	let isLoading = $state(false);
	let submitMessage = $state('');
	let submitMessageType = $state<'success' | 'error' | ''>('');

	// Validation
	let nameError = $state('');
	let emailError = $state('');
	let subjectError = $state('');
	let messageError = $state('');

	function validateName() {
		if (!name.trim()) {
			nameError = 'Name is required';
			return false;
		}
		nameError = '';
		return true;
	}

	function validateEmail() {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email) {
			emailError = 'Email is required';
			return false;
		}
		if (!emailRegex.test(email)) {
			emailError = 'Please enter a valid email address';
			return false;
		}
		emailError = '';
		return true;
	}

	function validateSubject() {
		if (!subject.trim()) {
			subjectError = 'Subject is required';
			return false;
		}
		subjectError = '';
		return true;
	}

	function validateMessage() {
		if (!message.trim()) {
			messageError = 'Message is required';
			return false;
		}
		if (message.trim().length < 10) {
			messageError = 'Message must be at least 10 characters long';
			return false;
		}
		messageError = '';
		return true;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!validateName() || !validateEmail() || !validateSubject() || !validateMessage()) return;

		isLoading = true;
		submitMessage = '';

		try {
			// TODO: Replace with actual API call
			await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

			submitMessage = 'Thank you for your message! We will get back to you soon.';
			submitMessageType = 'success';

			// Clear form after success
			name = '';
			email = '';
			subject = '';
			message = '';
		} catch (error) {
			submitMessage = 'Failed to send message. Please try again.';
			submitMessageType = 'error';
		} finally {
			isLoading = false;
		}
	}
</script>

<form class={cn('flex flex-col gap-6', className)} {...restProps} onsubmit={handleSubmit}>
	<Field.Group>
		<div class="flex flex-col items-center gap-1 text-center">
			<h1 class="text-2xl font-bold">Contact Us</h1>
			<p class="text-sm text-balance text-muted-foreground">
				We'd love to hear from you. Send us a message and we'll respond as soon as possible.
			</p>
		</div>

		{#if submitMessage}
			<div
				class="rounded-md p-3 text-sm {submitMessageType === 'success'
					? 'border border-green-200 bg-green-50 text-green-800'
					: 'border border-red-200 bg-red-50 text-red-800'}"
			>
				{submitMessage}
			</div>
		{/if}

		<Field.Field>
			<Field.Label for="name">Name</Field.Label>
			<Input
				id="name"
				type="text"
				placeholder="Your full name"
				required
				bind:value={name}
				disabled={isLoading}
			/>
			{#if nameError}
				<Field.Description class="text-red-600">{nameError}</Field.Description>
			{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="email">Email</Field.Label>
			<Input
				id="email"
				type="email"
				placeholder="your.email@example.com"
				required
				bind:value={email}
				disabled={isLoading}
			/>
			{#if emailError}
				<Field.Description class="text-red-600">{emailError}</Field.Description>
			{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="subject">Subject</Field.Label>
			<Input
				id="subject"
				type="text"
				placeholder="What's this about?"
				required
				bind:value={subject}
				disabled={isLoading}
			/>
			{#if subjectError}
				<Field.Description class="text-red-600">{subjectError}</Field.Description>
			{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="message">Message</Field.Label>
			<Textarea
				id="message"
				placeholder="Tell us more..."
				required
				bind:value={message}
				disabled={isLoading}
				rows={5}
			/>
			{#if messageError}
				<Field.Description class="text-red-600">{messageError}</Field.Description>
			{:else}
				<Field.Description class="text-muted-foreground">Minimum 10 characters</Field.Description>
			{/if}
		</Field.Field>

		<Field.Field>
			<Button type="submit" disabled={isLoading} class="w-full">
				{#if isLoading}
					<span class="flex items-center gap-2">
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Sending...
					</span>
				{:else}
					Send Message
				{/if}
			</Button>
		</Field.Field>
	</Field.Group>
</form>
