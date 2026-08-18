<script lang="ts">
	/**
	 * A column that accepts a dragged booking.
	 *
	 * Adapted from `DevRohit06/big-calendar-svelte` (MIT) —
	 * `src/lib/calendar/components/dnd/droppable-time-block.svelte`, with one
	 * structural change: the original makes every quarter-hour slot its own drop
	 * target, so a ten-hour day is 40 registered targets per column and 280
	 * across a week. Here the *column* is the target and the minute is read off
	 * the pointer's offset with `minutesFromOffset` — which the original already
	 * needed anyway for its create-drag, because for most of a drag the pointer
	 * is over a block rather than a slot.
	 *
	 * The upshot is the same snapping with one target per column, and the drop
	 * indicator can be drawn at the exact minute rather than at a slot's edge.
	 */
	import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
	import type { Snippet } from 'svelte';
	import type { Appointment } from '$lib/api';
	import { isAppointmentDragData, minutesFromOffset, PX_PER_MINUTE } from './dnd';

	interface Props {
		/** Visible window of the grid, in minutes from the outlet's midnight. */
		windowStart: number;
		windowEnd: number;
		height: number;
		/** False for a column nothing can be dropped into — see the grid for why. */
		canDrop?: boolean;
		onDrop?: (appointment: Appointment, pointerMinutes: number) => void;
		children: Snippet;
	}

	let { windowStart, windowEnd, height, canDrop = true, onDrop, children }: Props = $props();

	let element: HTMLElement | null = $state(null);
	let hoverMinutes = $state<number | null>(null);

	function pointerMinutes(clientY: number): number {
		if (!element) return windowStart;
		const rect = element.getBoundingClientRect();
		return minutesFromOffset(clientY - rect.top, rect.height, windowStart, windowEnd);
	}

	function dropTarget(node: HTMLElement) {
		element = node;
		return dropTargetForElements({
			element: node,
			canDrop: ({ source }) => canDrop && isAppointmentDragData(source.data),
			onDrag: ({ location }) => {
				hoverMinutes = pointerMinutes(location.current.input.clientY);
			},
			onDragLeave: () => (hoverMinutes = null),
			onDrop: ({ source, location }) => {
				const minutes = pointerMinutes(location.current.input.clientY);
				hoverMinutes = null;
				if (!isAppointmentDragData(source.data)) return;
				onDrop?.(source.data.appointment, minutes);
			}
		});
	}
</script>

<div {@attach dropTarget} class="relative" style="height: {height}px">
	{@render children()}

	{#if hoverMinutes !== null}
		<!--
			Where the pointer is, not where the block will land — the block's own
			top edge depends on where it was grabbed, and drawing that instead would
			make the line jump away from the cursor.
		-->
		<div
			class="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-dashed border-primary"
			style="top: {(hoverMinutes - windowStart) * PX_PER_MINUTE}px"
		></div>
	{/if}
</div>
