<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';

	let { businessId, hasTables = true }: { businessId: string; hasTables?: boolean } = $props();

	const tourKey = `tour-completed:${businessId}`;

	onMount(() => {
		const isTour = $page.url.searchParams.get('tour') === 'true';
		if (!isTour) return;

		// Already completed
		if (typeof window !== 'undefined' && localStorage.getItem(tourKey)) return;

		// Remove ?tour=true from URL without navigation
		const url = new URL(window.location.href);
		url.searchParams.delete('tour');
		history.replaceState({}, '', url.toString());

		// Build steps based on what's available
		const steps: any[] = [];

		if (hasTables) {
			steps.push({
				element: '[data-tour="table-selector"]',
				popover: {
					title: 'Select a table',
					description:
						'Tap a table to start a dine-in order. You can also choose takeaway or delivery.',
					side: 'bottom',
					align: 'center'
				}
			});
		}

		steps.push({
			element: '[data-tour="menu-grid"]',
			popover: {
				title: 'Add items',
				description: 'Browse your menu and tap items to add them to the order.',
				side: 'left',
				align: 'start'
			}
		});

		steps.push({
			element: '[data-tour="send-order"]',
			popover: {
				title: 'Send to kitchen',
				description:
					'When ready, send the order to the kitchen. Your first order is just a tap away!',
				side: 'top',
				align: 'center'
			}
		});

		// Start tour after a brief delay to let page render
		setTimeout(() => {
			const d = driver({
				showProgress: true,
				animate: true,
				overlayColor: 'rgba(0, 0, 0, 0.5)',
				steps,
				onDestroyStarted: () => {
					localStorage.setItem(tourKey, 'true');
					d.destroy();
				}
			});

			d.drive();
		}, 500);
	});
</script>
