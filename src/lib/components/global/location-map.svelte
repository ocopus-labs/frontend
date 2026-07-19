<script lang="ts" module>
	export interface MapLocation {
		id: string;
		name: string;
		lat: number;
		lng: number;
		/** Secondary line in the popup — city, revenue, whatever fits. */
		subtitle?: string;
		/** Marker colour. Any design token: 'primary', 'chart-1'…'chart-8', 'success', 'warning', 'destructive'. */
		accent?: string;
		/** Makes the popup title a link. */
		href?: string;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { EmptyState } from '$lib/components/data-display';
	import { cn } from '$lib/utils.js';
	import MapPinOff from '@lucide/svelte/icons/map-pin-off';

	interface Props {
		locations: MapLocation[];
		/** CSS height. Give the map a real height — Leaflet needs one to render. */
		height?: string;
		/** Fallback view when no location has coordinates yet. */
		emptyTitle?: string;
		emptyDescription?: string;
		/** Fired when a marker is clicked. */
		onSelect?: (location: MapLocation) => void;
		class?: string;
	}

	let {
		locations,
		height = '360px',
		emptyTitle = 'No mapped locations',
		emptyDescription = 'Add a street address to your locations to see them plotted here.',
		onSelect,
		class: className = ''
	}: Props = $props();

	// Tile provider is env-driven so moving off OSM's public tiles (which aren't
	// intended for heavy commercial traffic) to a paid host is a config change,
	// not a code change. See docs/FRANCHISE-STATUS.md.
	const TILE_URL = env.PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
	const TILE_ATTRIBUTION =
		env.PUBLIC_MAP_TILE_ATTRIBUTION ||
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

	/** Only locations that actually carry usable coordinates can be plotted. */
	const plottable = $derived(
		locations.filter(
			(l) =>
				typeof l.lat === 'number' &&
				typeof l.lng === 'number' &&
				Number.isFinite(l.lat) &&
				Number.isFinite(l.lng) &&
				// (0,0) is almost always an unset default rather than the Atlantic.
				!(l.lat === 0 && l.lng === 0)
		)
	);

	let container = $state<HTMLDivElement | null>(null);
	let map: any = null;
	let markerLayer: any = null;
	let leaflet: any = null;

	/**
	 * Token-coloured pin as a divIcon. Deliberately not Leaflet's default marker:
	 * that ships PNGs whose URLs break under Vite's asset hashing, and it can't
	 * take a CSS variable for colour.
	 */
	function buildIcon(L: any, accent = 'primary') {
		return L.divIcon({
			className: 'location-map__pin',
			html: `<span class="location-map__pin-dot" style="background-color: var(--${accent}); box-shadow: 0 0 0 3px color-mix(in oklch, var(--${accent}) 25%, transparent);"></span>`,
			iconSize: [16, 16],
			iconAnchor: [8, 8],
			popupAnchor: [0, -10]
		});
	}

	function escapeHtml(value: string) {
		return value.replace(
			/[&<>"']/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
		);
	}

	function renderMarkers() {
		if (!map || !leaflet) return;

		markerLayer?.clearLayers();
		if (!plottable.length) return;

		const bounds: [number, number][] = [];

		for (const location of plottable) {
			const marker = leaflet
				.marker([location.lat, location.lng], {
					icon: buildIcon(leaflet, location.accent),
					keyboard: true,
					title: location.name,
					alt: location.name
				})
				.addTo(markerLayer);

			// Popup content is built as a string by Leaflet's API, so every
			// interpolated value is escaped — these are user-supplied names.
			const title = escapeHtml(location.name);
			const subtitle = location.subtitle ? escapeHtml(location.subtitle) : '';
			marker.bindPopup(
				`<div class="location-map__popup">
					${location.href ? `<a href="${escapeHtml(location.href)}">${title}</a>` : `<span>${title}</span>`}
					${subtitle ? `<p>${subtitle}</p>` : ''}
				</div>`
			);

			if (onSelect) marker.on('click', () => onSelect(location));
			bounds.push([location.lat, location.lng]);
		}

		if (bounds.length === 1) {
			map.setView(bounds[0], 13);
		} else {
			map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
		}
	}

	onMount(() => {
		let disposed = false;

		// Leaflet touches `window` at import time, so it can only load client-side.
		(async () => {
			const [L] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
			if (disposed || !container || !plottable.length) return;

			leaflet = L.default ?? L;
			map = leaflet.map(container, {
				scrollWheelZoom: false, // don't hijack page scroll
				attributionControl: true
			});
			leaflet.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
			markerLayer = leaflet.layerGroup().addTo(map);

			renderMarkers();
		})();

		return () => {
			disposed = true;
			map?.remove();
			map = null;
			markerLayer = null;
		};
	});

	// Re-plot when the location set changes (filters, live data).
	$effect(() => {
		void plottable;
		if (map) renderMarkers();
	});
</script>

{#if plottable.length === 0}
	<EmptyState type="no-data" icon={MapPinOff} title={emptyTitle} description={emptyDescription} />
{:else}
	<div
		bind:this={container}
		class={cn('location-map w-full overflow-hidden rounded-lg border border-border', className)}
		style="height: {height}"
		role="application"
		aria-label="Map of {plottable.length} location{plottable.length === 1 ? '' : 's'}"
	></div>
{/if}

<style>
	/* Leaflet renders into its own DOM outside Svelte's scope, so these need
	   :global. Kept to surface/typography only — markers carry their own tokens. */
	.location-map :global(.leaflet-container) {
		height: 100%;
		width: 100%;
		background: var(--muted);
		font-family: inherit;
		outline: none;
	}

	/* OSM raster tiles are light-only. Inverting them is the standard way to get
	   a dark basemap without paying for a dark vector style. Markers and popups
	   are re-inverted below so they keep their true token colours. */
	:global(.dark) .location-map :global(.leaflet-tile-pane) {
		filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.9);
	}

	.location-map :global(.location-map__pin-dot) {
		display: block;
		width: 14px;
		height: 14px;
		border-radius: 9999px;
		border: 2px solid var(--background);
	}

	.location-map :global(.leaflet-popup-content-wrapper),
	.location-map :global(.leaflet-popup-tip) {
		background: var(--popover);
		color: var(--popover-foreground);
		border-radius: var(--radius);
		box-shadow: 0 4px 16px rgb(0 0 0 / 0.18);
	}

	.location-map :global(.location-map__popup a),
	.location-map :global(.location-map__popup span) {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--popover-foreground);
	}

	.location-map :global(.location-map__popup p) {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.location-map :global(.leaflet-control-attribution) {
		background: color-mix(in oklch, var(--background) 82%, transparent);
		color: var(--muted-foreground);
		font-size: 0.65rem;
	}

	.location-map :global(.leaflet-control-attribution a) {
		color: var(--primary);
	}

	.location-map :global(.leaflet-bar a) {
		background: var(--card);
		color: var(--card-foreground);
		border-bottom-color: var(--border);
	}

	.location-map :global(.leaflet-bar a:hover) {
		background: var(--accent);
	}
</style>
