import type { AppointmentStatus } from '$lib/api';

/**
 * The transitions the backend will accept, mirrored from `ALLOWED_TRANSITIONS`
 * in `appointment.service.ts`.
 *
 * This is a deliberate duplicate. The server is the authority and rejects
 * anything else with a 400 — but a menu that offers "Complete" on a cancelled
 * booking is a menu that teaches the receptionist to distrust the menu. If the
 * two ever disagree the server wins and the user sees an error, which is the
 * safe direction for a copy to fail in.
 */
export const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
	scheduled: ['confirmed', 'checked_in', 'cancelled', 'no_show'],
	confirmed: ['checked_in', 'cancelled', 'no_show'],
	checked_in: ['in_progress', 'completed', 'cancelled', 'no_show'],
	in_progress: ['completed', 'cancelled'],
	completed: [],
	cancelled: [],
	no_show: []
};

/** Statuses that still occupy the chair — matching the exclusion constraint. */
const BLOCKING: AppointmentStatus[] = [
	'scheduled',
	'confirmed',
	'checked_in',
	'in_progress',
	'completed'
];

export function occupiesChair(status: AppointmentStatus): boolean {
	return BLOCKING.includes(status);
}

/** A booking can only be moved while it still holds a slot. */
export function canReschedule(status: AppointmentStatus): boolean {
	return occupiesChair(status);
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
	scheduled: 'Scheduled',
	confirmed: 'Confirmed',
	checked_in: 'Checked in',
	in_progress: 'In progress',
	completed: 'Completed',
	cancelled: 'Cancelled',
	no_show: 'No show'
};

/** Imperative label for the button that *moves into* a status. */
export const TRANSITION_LABEL: Record<AppointmentStatus, string> = {
	scheduled: 'Reopen',
	confirmed: 'Confirm',
	checked_in: 'Check in',
	in_progress: 'Start',
	completed: 'Complete',
	cancelled: 'Cancel',
	no_show: 'Mark no-show'
};

/**
 * Block styling per status. Semantic tokens only — `primary` for the live
 * booking, `muted` for the ones that no longer need attention, `destructive`
 * for the two that freed the chair.
 */
export const STATUS_BLOCK_CLASS: Record<AppointmentStatus, string> = {
	scheduled: 'border-border bg-card hover:bg-accent',
	confirmed: 'border-primary/40 bg-primary/10 hover:bg-primary/15',
	checked_in: 'border-primary/60 bg-primary/20 hover:bg-primary/25',
	in_progress: 'border-primary bg-primary/30 hover:bg-primary/35',
	completed: 'border-border bg-muted hover:bg-muted/80',
	cancelled: 'border-destructive/40 bg-destructive/10 hover:bg-destructive/15',
	no_show: 'border-destructive/40 bg-destructive/10 hover:bg-destructive/15'
};

export const STATUS_BADGE_VARIANT: Record<
	AppointmentStatus,
	'default' | 'secondary' | 'outline' | 'destructive'
> = {
	scheduled: 'outline',
	confirmed: 'secondary',
	checked_in: 'default',
	in_progress: 'default',
	completed: 'secondary',
	cancelled: 'destructive',
	no_show: 'destructive'
};
