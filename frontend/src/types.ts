export interface Offer {
  id: number;
  name: string;
  group?: string | null;
  country?: string[] | string | null;
  state?: string | null;
  action_type?: string | null;
}

export interface StreamOffer {
  id: number;
  stream_id: number;
  offer_id: number;
  offer_name: string;
  share: number;
  is_pinned: boolean;
  status: 'active' | 'removed';
  is_published: boolean;
  published_share?: number | null;
  published_status?: string | null;
  published_is_pinned: boolean;
}

export interface Stream {
  id: number;
  keitaro_id: number;
  campaign_id: number;
  name: string;
  schema?: string | null;
  type?: string | null;
  has_offers: boolean;
  is_dirty: boolean;
  offers: StreamOffer[];
}

export interface Campaign {
  id: number;
  keitaro_id: number;
  name: string;
  alias?: string | null;
  geo?: string | null;
  created_at: string;
  streams: Stream[];
}

export interface CampaignListItem {
  id?: number | null;
  keitaro_id: number;
  name: string;
  alias?: string | null;
  geo?: string | null;
  group?: string | null;
  domain?: string | null;
  state?: string | null;
  is_local: boolean;
  dirty_streams_count: number;
  streams_count: number;
  created_at?: string | null;
}

export interface KeitaroDefaults {
  domain_id: number | null;
  domain_name: string;
  group_id: number | null;
  group_name: string;
  traffic_source_id: number | null;
  traffic_source_name: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}
