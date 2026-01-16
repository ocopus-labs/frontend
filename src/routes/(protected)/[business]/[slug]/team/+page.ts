import type { PageLoad } from './$types';
import { getTeamMembers, getTeamStats, getAvailableRoles } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch }) => {
	const parentData = await parent();
	const businessId = parentData.businessId;

	try {
		const [membersData, statsData, rolesData] = await Promise.all([
			getTeamMembers(businessId, undefined, { fetch }),
			getTeamStats(businessId, { fetch }),
			getAvailableRoles(businessId, { fetch })
		]);

		return {
			...parentData,
			members: membersData.members,
			stats: statsData.stats,
			roles: rolesData.roles
		};
	} catch (err) {
		console.error('Failed to load team:', err);
		return {
			...parentData,
			members: [],
			stats: {
				total: 0,
				active: 0,
				inactive: 0,
				suspended: 0,
				byRole: {}
			},
			roles: [],
			error: err instanceof Error ? err.message : 'Failed to load team'
		};
	}
};
