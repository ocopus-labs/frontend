import { createApiClient, getApiClient } from './client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string; // info, warning, critical, maintenance
  target: string;
  isActive: boolean;
  isPinned: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
  };
}

export async function getActiveAnnouncements(
  options?: { fetch?: typeof fetch }
): Promise<{ announcements: Announcement[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get('/announcements/active');
}

export async function dismissAnnouncement(
  id: string,
  options?: { fetch?: typeof fetch }
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/announcements/${id}/dismiss`);
}
