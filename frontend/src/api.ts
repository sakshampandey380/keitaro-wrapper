import {
  Offer,
  Campaign,
  CampaignListItem,
  Stream,
  KeitaroDefaults,
} from './types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.detail) {
        errorMessage = typeof errData.detail === 'string'
          ? errData.detail
          : JSON.stringify(errData.detail);
      }
    } catch {
      const text = await response.text();
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  getDefaults: () => request<KeitaroDefaults>('/defaults'),

  searchOffers: (search: string, limit = 40) =>
    request<Offer[]>(`/offers?search=${encodeURIComponent(search)}&limit=${limit}`),

  listCampaigns: (search = '', limit = 120) =>
    request<CampaignListItem[]>(
      `/campaigns?search=${encodeURIComponent(search)}&limit=${limit}`
    ),

  createCampaign: (payload: {
    name: string;
    geo: string[];
    offer_id: number;
    offer_name?: string;
  }) =>
    request<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  fetchCampaignStreams: (keitaroId: number) =>
    request<Campaign>(`/campaigns/${keitaroId}/fetch-streams`, {
      method: 'POST',
    }),

  addOfferToStream: (
    streamId: number,
    payload: { offer_id: number; offer_name?: string }
  ) =>
    request<Stream>(`/streams/${streamId}/offers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  removeOfferFromStream: (streamId: number, streamOfferId: number) =>
    request<Stream>(`/streams/${streamId}/offers/${streamOfferId}/remove`, {
      method: 'POST',
    }),

  restoreOfferInStream: (streamId: number, streamOfferId: number) =>
    request<Stream>(`/streams/${streamId}/offers/${streamOfferId}/restore`, {
      method: 'POST',
    }),

  pinOrUpdateOfferShare: (
    streamId: number,
    streamOfferId: number,
    payload: { is_pinned: boolean; share?: number }
  ) =>
    request<Stream>(`/streams/${streamId}/offers/${streamOfferId}/pin`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  pushStreamToKeitaro: (streamId: number) =>
    request<Stream>(`/streams/${streamId}/push`, {
      method: 'POST',
    }),

  cancelStreamChanges: (streamId: number) =>
    request<Stream>(`/streams/${streamId}/cancel`, {
      method: 'POST',
    }),
};
