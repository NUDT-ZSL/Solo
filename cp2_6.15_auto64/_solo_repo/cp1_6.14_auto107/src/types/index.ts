export type CustomerLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  level: CustomerLevel;
  points: number;
  lastConsumeTime: string | null;
  createdAt: string;
}

export interface PointLog {
  id: string;
  customerId: string;
  points: number;
  reason: string;
  amount: number;
  createdAt: string;
}

export type CouponType = 'fullReduction' | 'discount' | 'exchange';

export interface Coupon {
  id: string;
  type: CouponType;
  name: string;
  value: number;
  threshold?: number;
  expireDate: string;
  isExpired: boolean;
  createdAt: string;
}

export interface Stats {
  issuedCoupons: number;
  redeemedCoupons: number;
  activeCoupons: number;
  topCustomers: Customer[];
  period: 'week' | 'month';
}

export interface ConsumeResult {
  customer: Customer;
  log: PointLog;
  reachedThreshold: boolean;
}
