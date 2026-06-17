export interface Coupon {
  code: string;
  status: 'unclaimed' | 'claimed' | 'redeemed';
  claimedAt: string | null;
  redeemedAt: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'full_reduction' | 'discount' | 'fixed';
  discountValue: number;
  minPurchase: number;
  reductionAmount: number;
  totalQuantity: number;
  claimed: number;
  redeemed: number;
  status: 'active' | 'paused';
  validFrom: string;
  validTo: string;
  createdAt: string;
  coupons: Coupon[];
}

export interface CampaignStats {
  id: string;
  name: string;
  type: string;
  claimed: number;
  redeemed: number;
  conversionRate: string;
  totalDiscount: string;
  avgDiscount: string;
}

export interface TotalStats {
  totalIssued: number;
  totalClaimed: number;
  totalRedeemed: number;
}

export interface TimeSeriesPoint {
  time: string;
  claimed: number;
  redeemed: number;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    throw error;
  }
}

export async function createCampaign(data: {
  name: string;
  type: string;
  discountValue?: number;
  minPurchase?: number;
  reductionAmount?: number;
  totalQuantity: number;
  validFrom: string;
  validTo: string;
}): Promise<Campaign> {
  return request<Campaign>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCampaigns(): Promise<Campaign[]> {
  return request<Campaign[]>('/campaigns');
}

export async function getCampaignStats(id: string): Promise<CampaignStats> {
  return request<CampaignStats>(`/campaigns/${id}/stats`);
}

export async function updateCampaignStatus(id: string, status: 'active' | 'paused'): Promise<{ id: string; status: string }> {
  return request(`/campaigns/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getStats(): Promise<TotalStats> {
  return request<TotalStats>('/stats');
}
