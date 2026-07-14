<script>
	import Logo from '$lib/components/global/logo.svelte';
	let { children } = $props();
</script>

<div class="grid min-h-svh lg:grid-cols-2">
	<div class="order-2 flex flex-col gap-4 p-6 md:p-10">
		<div class="flex justify-center md:justify-start">
			<Logo href="/" size="sm" />
		</div>
		<div class="flex flex-1 items-center justify-center">
			<div class="w-full max-w-xs">
				{@render children()}
			</div>
		</div>
	</div>
	<div class="relative hidden bg-muted lg:block">
		<img
			src="https://images.pexels.com/photos/3801439/pexels-photo-3801439.jpeg"
			alt=""
			loading="lazy"
			class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
		/>
	</div>
</div>
