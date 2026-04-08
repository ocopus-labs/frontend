import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type CampaignChannel = 'email' | 'sms' | 'both';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface CampaignSegmentRef {
  id: string;
  name: string;
  customerCount: number;
}

export interface Campaign {
  id: string;
  restaurantId: string;
  segmentId: string | null;
  name: string;
  channel: CampaignChannel;
  subject: string | null;
  body: string;
  status: CampaignStatus;
  stats: CampaignStats;
  scheduledAt: string | null;
  sentAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  segment: CampaignSegmentRef | null;
  _count?: { recipients: number };
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
}

export interface CampaignFunnel {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
}

export interface CampaignStatsResponse {
  campaign: {
    id: string;
    name: string;
    channel: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  };
  stats: CampaignStats;
  funnel: CampaignFunnel;
}

export interface CreateCampaignPayload {
  name: string;
  segmentId?: string;
  channel: CampaignChannel;
  subject?: string;
  body: string;
  scheduledAt?: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== CAMPAIGNS API ====================

export async function getCampaigns(
  businessId: string,
  options?: FetchOption
): Promise<{ campaigns: Campaign[] }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/campaigns`);
}

export async function getCampaignById(
  businessId: string,
  campaignId: string,
  options?: FetchOption
): Promise<{ campaign: Campaign }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/campaigns/${campaignId}`);
}

export async function createCampaign(
  businessId: string,
  data: CreateCampaignPayload,
  options?: FetchOption
): Promise<{ message: string; campaign: Campaign }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/campaigns`, data);
}

export async function sendCampaign(
  businessId: string,
  campaignId: string,
  options?: FetchOption
): Promise<{ message: string; recipientCount: number }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post(`/business/${businessId}/campaigns/${campaignId}/send`);
}

export async function getCampaignStats(
  businessId: string,
  campaignId: string,
  options?: FetchOption
): Promise<CampaignStatsResponse> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.get(`/business/${businessId}/campaigns/${campaignId}/stats`);
}

export async function deleteCampaign(
  businessId: string,
  campaignId: string,
  options?: FetchOption
): Promise<{ message: string }> {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.delete(`/business/${businessId}/campaigns/${campaignId}`);
}
