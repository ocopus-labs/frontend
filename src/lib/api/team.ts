import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type TeamMemberStatus = 'active' | 'inactive' | 'suspended';
export type TeamRole = 'manager' | 'staff' | 'viewer' | 'accountant';

export interface TeamMember {
  id: string;
  businessId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  role: TeamRole;
  status: TeamMemberStatus;
  permissions: string[];
  joinedAt: string;
  lastActiveAt?: string;
  suspendedAt?: string;
  suspendReason?: string;
}

export interface TeamStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<string, number>;
}

export interface RoleInfo {
  role: string;
  displayName: string;
  description: string;
  permissions: string[];
  canAssign: string[];
}

export interface TeamInvitation {
  id: string;
  businessId: string;
  email: string;
  role: TeamRole;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface InviteTeamMemberPayload {
  email: string;
  role: TeamRole;
  customPermissions?: string[];
  message?: string;
}

export interface AddExistingUserPayload {
  userId: string;
  role: TeamRole;
  customPermissions?: string[];
}

export interface UpdateTeamMemberPayload {
  role?: TeamRole;
  status?: TeamMemberStatus;
  permissions?: string[];
}

export interface UpdateMemberRolePayload {
  role: TeamRole;
}

export interface UpdateMemberPermissionsPayload {
  permissions: string[];
}

export interface SuspendMemberPayload {
  reason?: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== TEAM CRUD ====================

export async function getTeamMembers(
  businessId: string,
  status?: TeamMemberStatus,
  options?: FetchOption
): Promise<{ members: TeamMember[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  const url = status
    ? `/business/${businessId}/team?status=${status}`
    : `/business/${businessId}/team`;
  return api.get(url);
}

export async function getTeamStats(
  businessId: string,
  options?: FetchOption
): Promise<{ stats: TeamStats }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/team/stats`);
}

export async function getAvailableRoles(
  businessId: string,
  options?: FetchOption
): Promise<{ roles: RoleInfo[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/team/roles`);
}

export async function getTeamMemberById(
  businessId: string,
  memberId: string,
  options?: FetchOption
): Promise<{ member: TeamMember }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/team/${memberId}`);
}

export async function inviteTeamMember(
  businessId: string,
  data: InviteTeamMemberPayload,
  options?: FetchOption
): Promise<{ message: string; invitation: TeamInvitation; member?: TeamMember }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/team/invite`, data);
}

export async function addExistingUser(
  businessId: string,
  data: AddExistingUserPayload,
  options?: FetchOption
): Promise<{ message: string; member: TeamMember }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/team/add`, data);
}

export async function updateTeamMember(
  businessId: string,
  memberId: string,
  data: UpdateTeamMemberPayload,
  options?: FetchOption
): Promise<{ message: string; member: TeamMember }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/team/${memberId}`, data);
}

export async function updateMemberRole(
  businessId: string,
  memberId: string,
  data: UpdateMemberRolePayload,
  options?: FetchOption
): Promise<{ message: string; member: TeamMember }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/team/${memberId}/role`, data);
}

export async function updateMemberPermissions(
  businessId: string,
  memberId: string,
  data: UpdateMemberPermissionsPayload,
  options?: FetchOption
): Promise<{ message: string; member: TeamMember }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.patch(`/business/${businessId}/team/${memberId}/permissions`, data);
}

export async function suspendTeamMember(
  businessId: string,
  memberId: string,
  data?: SuspendMemberPayload,
  options?: FetchOption
): Promise<{ message: string; member: TeamMember }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/team/${memberId}/suspend`, data || {});
}

export async function reactivateTeamMember(
  businessId: string,
  memberId: string,
  options?: FetchOption
): Promise<{ message: string; member: TeamMember }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/team/${memberId}/reactivate`);
}

export async function removeTeamMember(
  businessId: string,
  memberId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/team/${memberId}`);
}
