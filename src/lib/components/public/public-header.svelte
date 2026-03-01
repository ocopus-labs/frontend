<script lang="ts">
	import { APP_NAME } from '$lib/constants/config';
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
				<a href="/" aria-label="home" class="group flex items-center gap-2.5">
					<div
						class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105"
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

				<!-- Desktop Nav -->
				<div class="hidden items-center gap-1 lg:flex">
					{#each menuItems as item}
						<a
							href={item.href}
							class="relative rounded-md px-4 py-2 text-sm font-medium transition-colors {currentPath ===
								item.href || (item.href === '/#features' && currentPath === '/')
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
			<div class="animate-fade-in border-t bg-background px-6 pb-6 pt-2 lg:hidden">
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
