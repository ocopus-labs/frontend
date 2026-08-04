<script lang="ts">
	/**
	 * A booking on the grid: positioned, clickable, and draggable to a new time.
	 *
	 * Adapted from `DevRohit06/big-calendar-svelte` (MIT) —
	 * `src/lib/calendar/components/dnd/draggable-event.svelte`.
	 *
	 * Two changes from the original. It carries an `Appointment` rather than an
	 * `IEvent`, and it reports where *inside* the block the pointer went down —
	 * without that offset, a booking grabbed by its middle snaps its top edge to
	 * the cursor and moves by however tall it happens to be.
	 *
	 * It owns its own positioned element rather than wrapping one. A wrapper
	 * would need `display: contents` to avoid disturbing the layout, and an
	 * element with no box cannot show the drag's own opacity.
	 */
	import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
	import type { Snippet } from 'svelte';
	import type { Appointment } from '$lib/api';
	import { appointmentDragData } from './dnd';

	interface Props {
		appointment: Appointment;
		/** Offset from the top of the grid, in pixels. */
		top: number;
		height: number;
		blockMinutes: number;
		canDrag?: boolean;
		/** Dimmed while its move is in flight. */
		pending?: boolean;
		class?: string;
		onSelect?: () => void;
		/** How far into the block the pointer went down, in minutes. */
		onGrab?: (offsetMinutes: number) => void;
		children: Snippet;
	}

	let {
		appointment,
		top,
		height,
		blockMinutes,
		canDrag = true,
		pending = false,
		class: className = '',
		onSelect,
		onGrab,
		children
	}: Props = $props();

	let dragging = $state(false);

	// `appointment` and `canDrag` are read inside the callbacks rather than during
	// setup, so the attachment binds once instead of re-running on every change.
	function dragSource(element: HTMLElement) {
		return draggable({
			element,
			canDrag: () => canDrag,
			getInitialData: () => appointmentDragData(appointment),
			onDragStart: () => (dragging = true),
			onDrop: () => (dragging = false)
		});
	}

	function handlePointerDown(event: PointerEvent) {
		if (!canDrag || event.button !== 0) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		if (rect.height <= 0) return;
		onGrab?.(((event.clientY - rect.top) / rect.height) * blockMinutes);
	}
</script>

<!--
	A positioned surface rather than a <Button>: the block is sized by the
	booking's duration, so nearly every class the button variants set would have
	to be overridden. Same pattern as the result rows in
	`pos/customer-picker.svelte`, and unchanged from before this grid learned to
	drag.
-->
<button
	type="button"
	{@attach dragSource}
	onpointerdown={handlePointerDown}
	onclick={() => onSelect?.()}
	class="absolute inset-x-1 flex flex-col gap-0.5 overflow-hidden rounded-md border p-1.5 text-left transition-[opacity,colors] {className}"
	class:cursor-grab={canDrag && !dragging}
	class:cursor-grabbing={dragging}
	class:cursor-pointer={!canDrag}
	class:opacity-40={dragging || pending}
	style="top: {top}px; height: {Math.max(height, 22)}px"
>
	{@render children()}
</button>
