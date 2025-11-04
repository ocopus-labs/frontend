<script>
	import AreaChartInteractive from '$lib/components/chart/area-chart-interactive.svelte';
	import BarChart from '$lib/components/chart/bar-chart.svelte';
	import PieChart from '$lib/components/chart/pie-chart.svelte';
	import StatsCard from '$lib/components/global/stats-card.svelte';

	let stats = [
		{ title: 'Total Orders', value: 1200, change: 5.4 },
		{ title: 'Total Revenue', value: '$34,000', change: 3.2 },
		{ title: 'New Customers', value: 300, change: 8.1 },
		{ title: 'Returning Customers', value: 150, change: -2.5 }
	];
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-2">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<StatsCard bind:stats />
			<div class="mx-6">
				<AreaChartInteractive />
				<div class="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="">
						<BarChart />
					</div>
					<div class="">
						<BarChart />
					</div>
					<div class="">
						<PieChart />
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
