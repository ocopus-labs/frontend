import type { PageLoad } from './$types';
import { getItems, getTeamMembers, listAppointments } from '$lib/api';
import { todayInZone } from '$lib/utils/timezone';

/**
 * The day the diary opens on is the outlet's today, not the viewer's.
 *
 * `?date=` wins when present so a link to a specific day survives a reload, and
 * so "next day" is a navigation rather than component state.
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
	const date = url.searchParams.get('date') || todayInZone(timeZone);

	try {
		const [appointments, team, catalog] = await Promise.all([
			listAppointments(businessId, { from: date, to: date }, { fetch }),
			getTeamMembers(businessId, { status: 'active' }, { fetch }),
			getItems(businessId, undefined, { fetch })
		]);

		return {
			...parentData,
			date,
			timeZone,
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
			timeZone,
			appointments: [],
			staff: [],
			services: [],
			error: err instanceof Error ? err.message : 'Failed to load appointments'
		};
	}
};
