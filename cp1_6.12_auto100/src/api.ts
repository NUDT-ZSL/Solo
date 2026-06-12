import type {
  Coupon,
  CreateCouponData,
  RedeemData,
  StatsSummary,
  DailyRedemption,
  CouponRedemption,
  FilterStatus,
} from './types';

const BASE = '/api';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || (data as any).errors || 'Request failed');
  }
  return res.json();
}

export const api = {
  async getCoupons(search: string = '', status: FilterStatus = 'all'): Promise<Coupon[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    const qs = params.toString();
    return fetch(`${BASE}/coupons${qs ? '?' + qs : ''}`).then(handle<Coupon[]>);
  },

  async getCoupon(id: string): Promise<Coupon> {
    return fetch(`${BASE}/coupons/${id}`).then(handle<Coupon>);
  },

  async createCoupon(data: CreateCouponData): Promise<Coupon> {
    return fetch(`${BASE}/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handle<Coupon>);
  },

  async claimCoupon(id: string): Promise<{ success: boolean; claim_id: string; coupon: Coupon }> {
    return fetch(`${BASE}/coupons/${id}/claim`, {
      method: 'POST',
    }).then(handle<{ success: boolean; claim_id: string; coupon: Coupon }>);
  },

  async redeemCoupon(id: string, data: RedeemData): Promise<{
    success: boolean;
    redemption_id: string;
    saved: number;
  }> {
    return fetch(`${BASE}/coupons/${id}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handle<{ success: boolean; redemption_id: string; saved: number }>);
  },

  async getStatsSummary(start?: string, end?: string): Promise<StatsSummary> {
    const params = new URLSearchParams();
    if (start) params.set('start_date', start);
    if (end) params.set('end_date', end);
    const qs = params.toString();
    return fetch(`${BASE}/stats/summary${qs ? '?' + qs : ''}`).then(handle<StatsSummary>);
  },

  async getDailyRedemptions(start?: string, end?: string): Promise<DailyRedemption[]> {
    const params = new URLSearchParams();
    if (start) params.set('start_date', start);
    if (end) params.set('end_date', end);
    const qs = params.toString();
    return fetch(`${BASE}/stats/daily-redemptions${qs ? '?' + qs : ''}`).then(handle<DailyRedemption[]>);
  },

  async getCouponRedemptions(start?: string, end?: string): Promise<CouponRedemption[]> {
    const params = new URLSearchParams();
    if (start) params.set('start_date', start);
    if (end) params.set('end_date', end);
    const qs = params.toString();
    return fetch(`${BASE}/stats/coupon-redemptions${qs ? '?' + qs : ''}`).then(handle<CouponRedemption[]>);
  },
};
