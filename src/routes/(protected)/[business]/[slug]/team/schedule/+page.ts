import type { PageLoad } from './$types';
import { getRoster, getShiftTemplates, getLeaveRequests, getTeamMembers } from '$lib/api';

function getWeekBounds(date: Date): { startDate: string; endDate: string } {
	const d = new Date(date);
	const day = d.getDay();
	// Monday-based week
	const diff = day === 0 ? -6 : 1 - day;
	const monday = new Date(d);
	monday.setDate(d.getDate() + diff);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);

	const fmt = (dt: Date) => dt.toISOString().split('T')[0];
	return { startDate: fmt(monday), endDate: fmt(sunday) };
}

export const load: PageLoad = async ({ parent, fetch, url, depends }) => {
	depends('app:schedule');
	const parentData = await parent();
	const businessId = parentData.businessId;

	// Allow navigating to a specific week via ?week=YYYY-MM-DD
	const weekParam = url.searchParams.get('week');
	const refDate = weekParam ? new Date(weekParam) : new Date();
	const { startDate, endDate } = getWeekBounds(refDate);

	try {
		const [rosterResult, templatesResult, leaveResult, membersResult] = await Promise.allSettled([
			getRoster(businessId, { startDate, endDate }, { fetch }),
			getShiftTemplates(businessId, { fetch }),
			getLeaveRequests(businessId, undefined, { fetch }),
			getTeamMembers(businessId, { status: 'active', limit: 100 }, { fetch })
		]);

		const roster = rosterResult.status === 'fulfilled' ? rosterResult.value.roster : [];
		const templates = templatesResult.status === 'fulfilled' ? templatesResult.value.templates : [];
		const leaveRequests = leaveResult.status === 'fulfilled' ? leaveResult.value.leaveRequests : [];
		const teamMembers = membersResult.status === 'fulfilled' ? membersResult.value.members : [];

		return {
			...parentData,
			roster,
			templates,
			leaveRequests,
			teamMembers,
			startDate,
			endDate
		};
	} catch (err) {
		console.error('Failed to load schedule:', err);
		return {
			...parentData,
			roster: [],
			templates: [],
			leaveRequests: [],
			teamMembers: [],
			startDate,
			endDate,
			error: err instanceof Error ? err.message : 'Failed to load schedule'
		};
	}
};
