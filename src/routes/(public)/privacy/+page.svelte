<script>
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { APP_NAME } from '$lib/constants/config';
</script>

<svelte:head>
	<title>Privacy Policy — {APP_NAME}</title>
	<meta
		name="description"
		content="{APP_NAME} privacy policy. Learn how we collect, use, and protect your personal and business data."
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
				Privacy Policy
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
					{APP_NAME} ("we", "our", or "us") is committed to protecting the privacy and security of your
					personal and business information. This Privacy Policy explains how we collect, use, share,
					and safeguard your data when you use our platform and services.
				</p>

				<h2>1. Information We Collect</h2>
				<h3>Account Information</h3>
				<p>
					When you create an account, we collect your name, email address, phone number, and
					business details including business name, type, and address.
				</p>

				<h3>Business Data</h3>
				<p>
					As you use the platform, we store data you create including menu items, inventory records,
					orders, payments, staff information, customer records, and analytics data.
				</p>

				<h3>Payment Information</h3>
				<p>
					Payment processing is handled by our third-party payment provider. We do not store your
					complete credit card or bank account numbers on our servers.
				</p>

				<h3>Usage Data</h3>
				<p>
					We automatically collect information about how you interact with our platform, including
					pages visited, features used, session duration, and device information.
				</p>

				<h2>2. How We Use Your Information</h2>
				<ul>
					<li>To provide, maintain, and improve our platform and services</li>
					<li>To process transactions and send related notices</li>
					<li>To send technical alerts, updates, and support messages</li>
					<li>To respond to your requests and provide customer support</li>
					<li>To monitor and analyze trends, usage, and activities</li>
					<li>To detect, investigate, and prevent fraudulent or unauthorized activity</li>
					<li>To comply with legal obligations under Indian law</li>
				</ul>

				<h2>3. Data Sharing</h2>
				<p>
					We do not sell your personal or business data to third parties. We may share information
					with:
				</p>
				<ul>
					<li>
						<strong>Service providers</strong> who assist in operating our platform (hosting, payment
						processing, email delivery)
					</li>
					<li><strong>Legal authorities</strong> when required by law or to protect our rights</li>
					<li>
						<strong>Business transfers</strong> in connection with a merger, acquisition, or sale of assets
					</li>
				</ul>

				<h2>4. Data Security</h2>
				<p>
					We implement industry-standard security measures including encryption in transit (TLS) and
					at rest, role-based access controls, regular security audits, and secure data centers.
					However, no method of transmission over the Internet is 100% secure.
				</p>

				<h2>5. Data Retention</h2>
				<p>
					We retain your data for as long as your account is active or as needed to provide
					services. You may request deletion of your account and associated data at any time by
					contacting our support team.
				</p>

				<h2>6. Your Rights</h2>
				<p>Under applicable Indian data protection laws, you have the right to:</p>
				<ul>
					<li>Access your personal data</li>
					<li>Correct inaccurate data</li>
					<li>Request deletion of your data</li>
					<li>Object to processing of your data</li>
					<li>Export your data in a portable format</li>
				</ul>

				<h2>7. Cookies</h2>
				<p>
					We use essential cookies to maintain your session and preferences. We do not use
					third-party advertising or tracking cookies.
				</p>

				<h2>8. Children's Privacy</h2>
				<p>
					Our platform is not intended for use by individuals under the age of 18. We do not
					knowingly collect information from children.
				</p>

				<h2>9. Changes to This Policy</h2>
				<p>
					We may update this Privacy Policy from time to time. We will notify you of material
					changes by posting a notice on our platform or sending you an email.
				</p>

				<h2>10. Contact Us</h2>
				<p>
					If you have questions or concerns about this Privacy Policy or our data practices, please
					contact us at:
				</p>
				<ul>
					<li>Email: privacy@posplatform.in</li>
					<li>Address: Bangalore, Karnataka, India</li>
				</ul>
			</article>
		</div>
	</section>
</div>
