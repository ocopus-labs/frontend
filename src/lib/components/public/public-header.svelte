<script lang="ts">
	import Logo from '$lib/components/global/logo.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import ThemeToggle from '$lib/components/global/theme-toggle.svelte';

	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import BellIcon from '@lucide/svelte/icons/bell';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { scrollY } from 'svelte/reactivity/window';
	import { signOut } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';

	let { user = null }: { user?: any } = $props();

	let dashboardUrl = $derived(user?.role === 'super_admin' ? '/admin' : '/dashboard');
	let userInitials = $derived(() => {
		if (!user?.name) return user?.email?.charAt(0)?.toUpperCase() || '?';
		return user.name
			.split(' ')
			.map((n: string) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	});

	async function handleLogout() {
		try {
			sessionStorage.removeItem('business-setup-progress');
			await signOut();
			toast.success('Logged out successfully');
			goto('/login');
		} catch {
			toast.error('Failed to logout');
		}
	}

	let menuItems = [
		{ name: 'Features', href: '/#features' },
		{ name: 'Pricing', href: '/pricing' },
		{ name: 'About', href: '/about' },
		{ name: 'Contact', href: '/contact' }
	];
	let menuState = $state(false);
	let isScrolled = $derived.by(() => {
		if (scrollY.current !== undefined && scrollY.current > 50) {
			return true;
		}
		return false;
	});
	let currentPath = $derived($page.url.pathname);
</script>

<header class="animate-fade-in">
	<nav
		class="fixed z-50 w-full transition-all duration-300 {isScrolled
			? 'border-b bg-background/90 shadow-sm backdrop-blur-xl'
			: 'bg-transparent'}"
	>
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="flex items-center justify-between py-4">
				<!-- Logo -->
				<Logo href="/" size="md" />

				<!-- Desktop Nav -->
				<div class="hidden items-center gap-1 lg:flex">
					{#each menuItems as item}
						<a
							href={item.href}
							class="relative rounded-md px-4 py-2 text-sm font-medium transition-colors {currentPath ===
								item.href ||
							(item.href === '/#features' && currentPath === '/')
								? 'text-foreground'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							{item.name}
							{#if currentPath === item.href}
								<span
									class="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary"
								></span>
							{/if}
						</a>
					{/each}
				</div>

				<!-- Right side -->
				<div class="flex items-center gap-2">
					<ThemeToggle />

					<div class="hidden items-center gap-2 lg:flex">
						{#if user}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<button
											{...props}
											class="flex items-center gap-2 rounded-full border p-1 pr-3 transition-colors hover:bg-accent"
										>
											<Avatar.Root class="size-8">
												<Avatar.Image src={user?.image} alt={user?.name || 'User'} />
												<Avatar.Fallback>{userInitials()}</Avatar.Fallback>
											</Avatar.Root>
											<span class="text-sm font-medium">{user?.name || user?.email}</span>
											<ChevronDownIcon class="size-4 text-muted-foreground" />
										</button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content class="w-56 rounded-lg" align="end" sideOffset={8}>
									<DropdownMenu.Label class="p-0 font-normal">
										<div class="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
											<Avatar.Root class="size-8">
												<Avatar.Image src={user?.image} alt={user?.name || 'User'} />
												<Avatar.Fallback>{userInitials()}</Avatar.Fallback>
											</Avatar.Root>
											<div class="grid flex-1 text-left text-sm leading-tight">
												<span class="truncate font-medium">{user?.name || 'User'}</span>
												<span class="truncate text-xs text-muted-foreground"
													>{user?.email || ''}</span
												>
											</div>
										</div>
									</DropdownMenu.Label>
									<DropdownMenu.Separator />
									<DropdownMenu.Group>
										<DropdownMenu.Item onclick={() => goto(dashboardUrl)}>
											<LayoutDashboardIcon />
											Dashboard
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => goto('/dashboard/security')}>
											<BadgeCheckIcon />
											Account
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => goto('/dashboard/billing')}>
											<CreditCardIcon />
											Billing
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => goto('/dashboard/notifications')}>
											<BellIcon />
											Notifications
										</DropdownMenu.Item>
									</DropdownMenu.Group>
									<DropdownMenu.Separator />
									<DropdownMenu.Item onclick={handleLogout}>
										<LogOutIcon />
										Log out
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{:else}
							<Button href="/login" variant="ghost" size="sm">Sign in</Button>
							<Button href="/register" size="sm">Get Started</Button>
						{/if}
					</div>

					<!-- Mobile menu button -->
					<button
						onclick={() => (menuState = !menuState)}
						aria-label={menuState ? 'Close Menu' : 'Open Menu'}
						class="relative z-20 -m-2 inline-flex size-10 items-center justify-center rounded-md lg:hidden"
					>
						<Menu
							class={[
								'absolute size-5 transition-all duration-200',
								menuState && 'scale-0 rotate-90 opacity-0'
							]}
						/>
						<X
							class={[
								'absolute size-5 transition-all duration-200',
								!menuState && 'scale-0 -rotate-90 opacity-0'
							]}
						/>
					</button>
				</div>
			</div>
		</div>

		<!-- Mobile menu panel -->
		{#if menuState}
			<div class="animate-fade-in border-t bg-background px-6 pt-2 pb-6 lg:hidden">
				<nav class="flex flex-col gap-1">
					{#each menuItems as item}
						<a
							href={item.href}
							onclick={() => (menuState = false)}
							class="rounded-md px-3 py-2.5 text-sm font-medium transition-colors {currentPath ===
							item.href
								? 'bg-accent text-foreground'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
						>
							{item.name}
						</a>
					{/each}
				</nav>
				<div class="mt-4 flex flex-col gap-2 border-t pt-4">
					{#if user}
						<Button href={dashboardUrl} variant="outline" class="w-full">Dashboard</Button>
						<Button onclick={handleLogout} variant="ghost" class="w-full">Log out</Button>
					{:else}
						<Button href="/login" variant="outline" class="w-full">Sign in</Button>
						<Button href="/register" class="w-full">Get Started</Button>
					{/if}
				</div>
			</div>
		{/if}
	</nav>
</header>
