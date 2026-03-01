<script lang="ts">
	import { APP_NAME } from '$lib/constants/config';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
</script>

<footer class="relative overflow-hidden border-t bg-muted/20">
	<!-- Decorative elements -->
	<div
		aria-hidden="true"
		class="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
	></div>

	<div class="relative mx-auto max-w-7xl px-6 py-16 lg:px-8">
		<div class="grid gap-12 lg:grid-cols-6">
			<!-- Brand column - wider -->
			<div class="space-y-4 lg:col-span-2">
				<a href="/" class="group flex items-center gap-2.5">
					<div
						class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							color="currentColor"
						>
							<path
								d="M22 18C22 19.4001 22 20.1002 21.7275 20.635C21.4878 21.1054 21.1054 21.4878 20.635 21.7275C20.1002 22 19.4001 22 18 22C16.5999 22 15.8998 22 15.365 21.7275C14.8946 21.4878 14.5122 21.1054 14.2725 20.635C14 20.1002 14 19.4001 14 18C14 16.5999 14 15.8998 14.2725 15.365C14.5122 14.8946 14.8946 14.5122 15.365 14.2725C15.8998 14 16.5999 14 18 14C19.4001 14 20.1002 14 20.635 14.2725C21.1054 14.5122 21.4878 14.8946 21.7275 15.365C22 15.8998 22 16.5999 22 18Z"
								stroke="currentColor"
								stroke-width="1.5"
							></path>
							<path
								d="M22 10C22 11.4001 22 12.1002 21.7275 12.635C21.4878 13.1054 21.1054 13.4878 20.635 13.7275C20.1002 14 19.4001 14 18 14C16.5999 14 15.8998 14 15.365 13.7275C14.8946 13.4878 14.5122 13.1054 14.2725 12.635C14 12.1002 14 11.4001 14 10C14 8.59987 14 7.8998 14.2725 7.36502C14.5122 6.89462 14.8946 6.51217 15.365 6.27248C15.8998 6 16.5999 6 18 6C19.4001 6 20.1002 6 20.635 6.27248C21.1054 6.51217 21.4878 6.89462 21.7275 7.36502C22 7.8998 22 8.59987 22 10Z"
								stroke="currentColor"
								stroke-width="1.5"
							></path>
							<path
								d="M14 18C14 19.4001 14 20.1002 13.7275 20.635C13.4878 21.1054 13.1054 21.4878 12.635 21.7275C12.1002 22 11.4001 22 10 22C8.59987 22 7.8998 22 7.36502 21.7275C6.89462 21.4878 6.51217 21.1054 6.27248 20.635C6 20.1002 6 19.4001 6 18C6 16.5999 6 15.8998 6.27248 15.365C6.51217 14.8946 6.89462 14.5122 7.36502 14.2725C7.8998 14 8.59987 14 10 14C11.4001 14 12.1002 14 12.635 14.2725C13.1054 14.5122 13.4878 14.8946 13.7275 15.365C14 15.8998 14 16.5999 14 18Z"
								stroke="currentColor"
								stroke-width="1.5"
							></path>
							<path
								opacity="0.5"
								d="M10 6C10 7.40013 10 8.1002 9.72752 8.63497C9.48783 9.10538 9.10538 9.48783 8.63498 9.72752C8.1002 10 7.40013 10 6 10C4.59987 10 3.8998 10 3.36502 9.72751C2.89462 9.48783 2.51217 9.10538 2.27248 8.63497C2 8.10019 2 7.40013 2 6C2 4.59987 2 3.8998 2.27248 3.36502C2.51217 2.89462 2.89462 2.51217 3.36502 2.27248C3.8998 2 4.59987 2 6 2C7.40013 2 8.1002 2 8.63498 2.27248C9.10538 2.51217 9.48783 2.89462 9.72752 3.36502C10 3.8998 10 4.59987 10 6Z"
								stroke="currentColor"
								stroke-width="1.5"
							></path>
						</svg>
					</div>
					<span class="text-lg font-semibold tracking-tight">{APP_NAME}</span>
				</a>
				<p class="max-w-xs text-sm leading-relaxed text-muted-foreground">
					The all-in-one point of sale and business management platform, purpose-built for Indian
					businesses.
				</p>
			</div>

			<!-- Product -->
			<div class="space-y-4">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Product
				</h3>
				<ul class="space-y-3 text-sm">
					<li>
						<a
							href="/#features"
							class="text-foreground/70 transition-colors hover:text-foreground">Features</a
						>
					</li>
					<li>
						<a href="/pricing" class="text-foreground/70 transition-colors hover:text-foreground"
							>Pricing</a
						>
					</li>
					<li>
						<a
							href="/integrations"
							class="text-foreground/70 transition-colors hover:text-foreground">Integrations</a
						>
					</li>
				</ul>
			</div>

			<!-- Company -->
			<div class="space-y-4">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Company
				</h3>
				<ul class="space-y-3 text-sm">
					<li>
						<a href="/about" class="text-foreground/70 transition-colors hover:text-foreground"
							>About</a
						>
					</li>
					<li>
						<a href="/blog" class="text-foreground/70 transition-colors hover:text-foreground"
							>Blog</a
						>
					</li>
					<li>
						<a href="/contact" class="text-foreground/70 transition-colors hover:text-foreground"
							>Contact</a
						>
					</li>
				</ul>
			</div>

			<!-- Resources -->
			<div class="space-y-4">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Resources
				</h3>
				<ul class="space-y-3 text-sm">
					<li>
						<a href="/privacy" class="text-foreground/70 transition-colors hover:text-foreground"
							>Privacy Policy</a
						>
					</li>
					<li>
						<a href="/terms" class="text-foreground/70 transition-colors hover:text-foreground"
							>Terms of Service</a
						>
					</li>
				</ul>
			</div>
		</div>

		<Separator class="my-10" />

		<div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
			<p class="text-xs text-muted-foreground">
				&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
			</p>
			<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
				Made with care in India
				<span class="inline-block text-sm">&#127470;&#127475;</span>
			</p>
		</div>
	</div>
</footer>
