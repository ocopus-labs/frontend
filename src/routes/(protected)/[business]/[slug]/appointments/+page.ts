import type { PageLoad } from './$types';
import { getItems, getTeamMembers, listAppointments } from '$lib/api';
import { shiftDateKey, todayInZone } from '$lib/utils/timezone';

/** How the diary is laid out. Day = one date, columns of people. Week = seven dates. */
export type DiaryView = 'day' | 'week';

/**
 * Monday of the week containing `dateKey`.
 *
 * Walks date keys with `shiftDateKey`, which steps through UTC rather than
 * adding 24 hours to a local instant — the latter lands on the wrong date on a
 * DST changeover day, which in a week view shows up as a duplicated or missing
 * column. The weekday is read at noon UTC for the same reason: midnight is the
 * one instant a zone offset can push across a date boundary.
 */
function startOfWeek(dateKey: string): string {
	const at = new Date(`${dateKey}T12:00:00.000Z`);
	const weekday = at.getUTCDay();
	return shiftDateKey(dateKey, weekday === 0 ? -6 : 1 - weekday);
}

/**
 * The day the diary opens on is the outlet's today, not the viewer's.
 *
 * `?date=` wins when present so a link to a specific day survives a reload, and
 * so "next day" is a navigation rather than component state. `?view=week`
 * likewise, so a week is linkable.
 */
export const load: PageLoad = async ({ parent, url, fetch, depends }) => {
	depends('app:appointments');
	const parentData = await parent();
	const businessId = parentData.businessId;

	// The promoted `timezone` column, which is the source of truth over the copy
	// in `settings.timezone` — the two can drift, and the backend composes every
	// booking against the column.
	const timeZone =
		parentData.business?.timezone ?? parentData.business?.settings?.timezone ?? 'UTC';
	// The outlet bills in one currency, so this stays a scalar — only figures
	// that span outlets are per-currency sets.
	const currency = parentData.business?.settings?.currency ?? 'INR';
	const date = url.searchParams.get('date') || todayInZone(timeZone);
	const view: DiaryView = url.searchParams.get('view') === 'week' ? 'week' : 'day';

	// The range actually fetched. A week view asks for seven days in one call --
	// `listAppointments` already takes a range, so this needs no new endpoint.
	const from = view === 'week' ? startOfWeek(date) : date;
	const to = view === 'week' ? shiftDateKey(from, 6) : date;

	try {
		const [appointments, team, catalog] = await Promise.all([
			listAppointments(businessId, { from, to }, { fetch }),
			getTeamMembers(businessId, { status: 'active' }, { fetch }),
			getItems(businessId, undefined, { fetch })
		]);

		return {
			...parentData,
			date,
			view,
			from,
			to,
			timeZone,
			currency,
			appointments,
			// `TeamMember.id` is the `BusinessUser` id, which is what a booking's
			// `staffId` references — not `user.id`, which is the account.
			staff: team.members.map((m) => ({ id: m.id, name: m.user.name || m.user.email })),
			// Only rows with a duration can be booked; the server rejects the rest
			// with "has no duration set", so offering them would be a dead end.
			services: catalog.items.filter((item) => (item.durationMinutes ?? 0) > 0)
		};
	} catch (err) {
		console.error('Failed to load appointments:', err);
		return {
			...parentData,
			date,
			view,
			from,
			to,
			timeZone,
			currency,
			appointments: [],
			staff: [],
			services: [],
			error: err instanceof Error ? err.message : 'Failed to load appointments'
		};
	}
};
