export interface TimePoint {
  timestamp: string;
  timeIndex: number;
  pv: number;
  orders: number;
  stockUsed: number;
}

export interface FlashSession {
  id: string;
  name: string;
  startTime: string;
  totalPv: number;
  totalOrders: number;
  conversionRate: number;
  data: TimePoint[];
}

export interface SessionSummary {
  id: string;
  name: string;
  startTime: string;
  totalPv: number;
  totalOrders: number;
  conversionRate: number;
}

export interface ChartSession {
  session: FlashSession;
  color: string;
  visible: boolean;
}
