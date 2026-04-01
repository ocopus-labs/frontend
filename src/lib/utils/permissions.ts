export function isReadOnlyRole(role: string): boolean {
	return role === 'viewer' || role === 'accountant';
}

export function canModify(role: string): boolean {
	return !isReadOnlyRole(role);
}
