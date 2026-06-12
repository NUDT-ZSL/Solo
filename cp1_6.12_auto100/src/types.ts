export interface Coupon {
  id: string;
  name: string;
  amount: number;
  threshold: number;
  start_date: string;
  end_date: string;
  daily_limit: number;
  total_claimed: number;
  total_redeemed: number;
  created_at: string;
  today_remaining: number;
  today_claimed: number;
  status: 'active' | 'expired' | 'sold_out';
}

export interface CreateCouponData {
  name: string;
  amount: number | '';
  threshold: number | '';
  start_date: string;
  end_date: string;
  daily_limit: number | '';
}

export interface RedeemData {
  order_amount: number | '';
  note: string;
}

export interface StatsSummary {
  total_coupons: number;
  total_claims: number;
  total_redemptions: number;
  total_saved: number;
  date_range: { start: string; end: string };
}

export interface DailyRedemption {
  date: string;
  count: number;
}

export interface CouponRedemption {
  id: string;
  name: string;
  amount: number;
  count: number;
}

export type FilterStatus = 'all' | 'active' | 'expired' | 'sold_out';
export type PageView = 'list' | 'detail' | 'create' | 'stats';
