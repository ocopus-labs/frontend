<script lang="ts">
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { locale, setLocale, SUPPORTED_LOCALES } from '$lib/i18n.svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { signOut, useSession } from '$lib/auth';
	import { clearApiCache } from '$lib/api/client';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { Subscription } from '$lib/api/subscription';

	let {
		subscription = null,
		hideUpgrade = false
	}: { subscription?: Subscription | null; hideUpgrade?: boolean } = $props();

	const session = useSession();
	const user = $derived($session?.data?.user);
	const sidebar = useSidebar();

	const planName = $derived(subscription?.plan?.displayName || subscription?.plan?.name);
	const isTopTier = $derived(
		subscription?.plan?.slug === 'enterprise' ||
			(subscription?.plan?.features?.whiteLabel && subscription?.plan?.features?.api)
	);

	let dark = $state(false);

	if (typeof window !== 'undefined') {
		dark =
			localStorage.getItem('theme') === 'dark' ||
			(!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
	}

	function toggleTheme() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}

	// Get initials from user name
	const initials = $derived.by(() => {
		if (!user?.name) return 'U';
		return user.name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	});

	async function handleLogout() {
		try {
			sessionStorage.removeItem('business-setup-progress');
			// Clear API caches to prevent stale data after logout
			clearApiCache();
			if ('caches' in window) {
				caches.delete('api-cache');
			}
			await signOut();
			toast.success('Logged out successfully');
			goto('/login');
		} catch (error) {
			console.error('Logout error:', error);
			toast.error('Failed to logout');
		}
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="px-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground "
					>
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Image src={user?.image} alt={user?.name || 'User'} />
							<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{user?.name || 'User'}</span>
							<span class="truncate text-xs">{user?.email || ''}</span>
						</div>
						<ChevronsUpDownIcon class="ml-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Image src={user?.image} alt={user?.name || 'User'} />
							<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{user?.name || 'User'}</span>
							<span class="truncate text-xs">{user?.email || ''}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#if !hideUpgrade && !isTopTier}
					<DropdownMenu.Group>
						<DropdownMenu.Item onclick={() => goto('/dashboard/billing')}>
							<SparklesIcon />
							{planName ? `Upgrade from ${planName}` : 'Upgrade to Pro'}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
					<DropdownMenu.Separator />
				{/if}
				<DropdownMenu.Group>
					<DropdownMenu.Item onclick={() => goto('/dashboard/security')}>
						<BadgeCheckIcon />
						Account
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => goto('/dashboard/billing')}>
						<CreditCardIcon />
						Billing
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={toggleTheme}>
						{#if dark}
							<SunIcon />
						{:else}
							<MoonIcon />
						{/if}
						{dark ? 'Light mode' : 'Dark mode'}
					</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>
							<LanguagesIcon />
							Language
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							{#each SUPPORTED_LOCALES as loc (loc.code)}
								<DropdownMenu.Item onclick={() => setLocale(loc.code)}>
									{loc.label}
									{#if locale.current === loc.code}
										<span class="ml-auto text-xs text-primary">&#10003;</span>
									{/if}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={handleLogout}>
					<LogOutIcon />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
