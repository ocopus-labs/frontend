<script lang="ts" module>
	export interface SectionNavItem {
		label: string;
		href: string;
		icon?: any;
		/**
		 * Match the path exactly rather than by prefix. Use this for the "index"
		 * item, otherwise it stays highlighted on every child route.
		 */
		exact?: boolean;
		/**
		 * Draw a divider before this item. Chunks a long row into readable groups
		 * without introducing a second navigation paradigm. Ignored on the first
		 * item. Navs with few items simply don't set it.
		 */
		startsGroup?: boolean;
	}
</script>

<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils.js';

	interface Props {
		items: SectionNavItem[];
		class?: string;
		/** Accessible name for the nav landmark, e.g. "Billing sections". */
		label?: string;
	}

	let { items, class: className = '', label = 'Sections' }: Props = $props();

	const pathname = $derived($page.url.pathname);

	function isActive(item: SectionNavItem) {
		return item.exact ? pathname === item.href : pathname.startsWith(item.href);
	}
</script>

<nav
	aria-label={label}
	class={cn('-mb-px no-scrollbar overflow-x-auto border-b border-border', className)}
>
	<ul class="flex min-w-max items-center gap-1">
		{#each items as item, i (item.href)}
			{@const active = isActive(item)}
			{#if item.startsGroup && i > 0}
				<li aria-hidden="true" class="mx-1.5 h-4 w-px shrink-0 bg-border"></li>
			{/if}
			<li>
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class={cn(
						'flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap no-underline transition-colors',
						active
							? 'border-primary text-foreground'
							: 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
					)}
				>
					{#if item.icon}
						<item.icon class="size-4 shrink-0" />
					{/if}
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
