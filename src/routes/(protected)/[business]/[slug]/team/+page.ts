import type { PageLoad } from './$types';
import { getTeamMembers, getTeamStats, getAvailableRoles, getPermissionTree, getCurrentShift } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url, depends }) => {
	depends('app:team');
	const parentData = await parent();
	const businessId = parentData.businessId;

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	try {
		const [membersData, statsData, rolesData, permissionTreeData, currentShiftData] = await Promise.all([
			getTeamMembers(businessId, { limit, offset }, { fetch }),
			getTeamStats(businessId, { fetch }),
			getAvailableRoles(businessId, { fetch }),
			getPermissionTree(businessId, { fetch }).catch(() => null),
			getCurrentShift(businessId, { fetch }).catch(() => null)
		]);

		const total = membersData.total;
		const totalPages = Math.max(1, Math.ceil(total / limit));

		return {
			...parentData,
			members: membersData.members,
			stats: statsData.stats,
			roles: rolesData.roles,
			permissionTree: permissionTreeData,
			currentShift: currentShiftData?.shift ?? null,
			page,
			limit,
			total,
			totalPages
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
			permissionTree: null,
			currentShift: null,
			page: 1,
			limit,
			total: 0,
			totalPages: 1,
			error: err instanceof Error ? err.message : 'Failed to load team'
		};
	}
};
