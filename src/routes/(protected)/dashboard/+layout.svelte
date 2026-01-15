<script lang="ts">
	import UserDashboardSidebar from '$lib/components/global/user-dashboard-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Generate breadcrumbs from current path
	const breadcrumbs = $derived(
		$page.url.pathname
			.split('/')
			.filter(Boolean)
			.map((segment, index, array) => {
				const href = '/' + array.slice(0, index + 1).join('/');
				const label = segment
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
				return { label, href };
			})
	);
</script>

<Sidebar.Provider>
	<UserDashboardSidebar businesses={data.businesses} />
	<Sidebar.Inset>
		<header
			class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ml-1" />
				<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						{#each breadcrumbs as crumb, index}
							{#if index < breadcrumbs.length - 1}
								<Breadcrumb.Item class="hidden md:block">
									<Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
								</Breadcrumb.Item>
								<Breadcrumb.Separator class="hidden md:block" />
							{:else}
								<Breadcrumb.Item>
									<Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
								</Breadcrumb.Item>
							{/if}
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
		</header>
		<div class="flex-1 overflow-auto p-4 pt-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
