<script>
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { APP_NAME } from '$lib/constants/config';
</script>

<svelte:head>
	<title>Terms of Service — {APP_NAME}</title>
	<meta
		name="description"
		content="{APP_NAME} terms of service. Read the terms and conditions governing your use of our platform."
	/>
</svelte:head>

<div class="pt-28 lg:pt-36">
	<section class="relative pb-16">
		<div aria-hidden="true" class="absolute inset-0 -z-10">
			<div class="dot-grid absolute inset-0 opacity-30 dark:opacity-15"></div>
		</div>

		<div class="mx-auto max-w-7xl px-6 text-center lg:px-8">
			<p class="animate-fade-up text-sm font-semibold tracking-wider text-primary uppercase">
				Legal
			</p>
			<h1 class="animate-fade-up font-display mt-3 text-4xl delay-100 md:text-5xl">
				Terms of Service
			</h1>
			<p class="animate-fade-up mt-4 text-muted-foreground delay-200">
				Last updated: February 2026
			</p>
		</div>
	</section>

	<section class="pb-24">
		<div class="mx-auto max-w-3xl px-6 lg:px-8">
			<article
				class="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
			>
				<p>
					These Terms of Service ("Terms") govern your access to and use of the {APP_NAME}
					services, website, and applications (collectively, the "Service"). By using the Service, you
					agree to be bound by these Terms.
				</p>

				<h2>1. Acceptance of Terms</h2>
				<p>
					By creating an account or using the Service, you acknowledge that you have read,
					understood, and agree to be bound by these Terms. If you are using the Service on behalf
					of a business, you represent that you have authority to bind that business to these Terms.
				</p>

				<h2>2. Account Registration</h2>
				<ul>
					<li>You must provide accurate and complete registration information</li>
					<li>You are responsible for maintaining the security of your account credentials</li>
					<li>You must be at least 18 years of age to use the Service</li>
					<li>One person or business may not maintain more than one free account</li>
				</ul>

				<h2>3. Use of Service</h2>
				<p>You agree to use the Service only for lawful business purposes. You may not:</p>
				<ul>
					<li>Use the Service for any illegal or unauthorized purpose</li>
					<li>Attempt to gain unauthorized access to the Service or its systems</li>
					<li>Interfere with or disrupt the integrity or performance of the Service</li>
					<li>Reverse engineer, decompile, or disassemble any part of the Service</li>
					<li>Resell or redistribute the Service without our written consent</li>
				</ul>

				<h2>4. Subscription Plans & Billing</h2>
				<p>
					The Service is offered under various subscription plans as described on our pricing page.
					Paid plans are billed in advance on a monthly or annual basis. All fees are quoted in
					Indian Rupees (INR) and are exclusive of applicable GST.
				</p>
				<ul>
					<li>Subscription fees are non-refundable except as required by applicable law</li>
					<li>We reserve the right to modify pricing with 30 days advance notice</li>
					<li>Failure to pay may result in suspension or termination of your account</li>
				</ul>

				<h2>5. Your Data</h2>
				<p>
					You retain ownership of all data you submit to the Service. By using the Service, you
					grant us a limited license to use, store, and process your data solely for the purpose of
					providing the Service. We handle your data in accordance with our Privacy Policy.
				</p>

				<h2>6. Service Availability</h2>
				<p>
					We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. We may
					perform scheduled maintenance with advance notice. We are not liable for any downtime or
					service interruptions.
				</p>

				<h2>7. Intellectual Property</h2>
				<p>
					The Service, including its design, features, and content, is owned by {APP_NAME} and protected
					by intellectual property laws. You may not copy, modify, or create derivative works based on
					the Service.
				</p>

				<h2>8. Limitation of Liability</h2>
				<p>
					To the maximum extent permitted by law, {APP_NAME} shall not be liable for any indirect, incidental,
					special, consequential, or punitive damages, including loss of profits, data, or business opportunities,
					arising from your use of the Service.
				</p>

				<h2>9. Termination</h2>
				<p>
					Either party may terminate the agreement at any time. You may cancel your subscription
					through your account settings. We may suspend or terminate your access if you violate
					these Terms. Upon termination, you may request export of your data within 30 days.
				</p>

				<h2>10. Governing Law</h2>
				<p>
					These Terms are governed by the laws of India. Any disputes shall be subject to the
					exclusive jurisdiction of the courts in Bangalore, Karnataka, India.
				</p>

				<h2>11. Changes to Terms</h2>
				<p>
					We may modify these Terms at any time. Material changes will be communicated via email or
					in-app notification at least 30 days before they take effect. Continued use of the Service
					after changes constitutes acceptance of the modified Terms.
				</p>

				<h2>12. Contact</h2>
				<p>For questions about these Terms, contact us at:</p>
				<ul>
					<li>Email: legal@posplatform.in</li>
					<li>Address: Bangalore, Karnataka, India</li>
				</ul>
			</article>
		</div>
	</section>
</div>
