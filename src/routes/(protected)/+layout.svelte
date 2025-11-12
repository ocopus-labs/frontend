<script lang="ts">
	import AppSidebar from '$lib/components/global/dashboard-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSession } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();
	
	const session = useSession();

	onMount(() => {
		// Redirect to login if not authenticated
		if (!$session.data) {
			goto('/login');
		}
	});
</script>

{#if $session.data}
<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header
			class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ml-1" />
				<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link href="##">Building Your Application</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item>
							<Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
		</header>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>
{:else}
<div class="flex items-center justify-center min-h-screen">
	<p>Loading...</p>
</div>
{/if}
