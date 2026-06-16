import { GroupOrder } from '../types';

const ORDER_COUNT_KEY = 'cc_order_count';
const USER_ACTIVE_ORDERS_KEY = 'cc_user_active_orders';

export interface OrderValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCreateOrder(
  userId: string,
  duration: number,
  tableNumber: number,
  existingOrders: GroupOrder[]
): OrderValidationResult {
  if (!userId) {
    return { valid: false, error: '请先登录' };
  }
  if (duration !== 15 && duration !== 30 && duration !== 60) {
    return { valid: false, error: '截止时间无效' };
  }
  if (tableNumber < 1 || tableNumber > 20 || !Number.isInteger(tableNumber)) {
    return { valid: false, error: '桌号必须是1-20之间的整数' };
  }
  const hasActive = existingOrders.some(
    (o) => o.status === 'active' && o.participants.some((p) => p.userId === userId)
  );
  if (hasActive) {
    return { valid: false, error: '您已有进行中的拼单，请先完成或等待结束' };
  }
  return { valid: true };
}

export function validateJoinOrder(
  userId: string,
  order: GroupOrder
): OrderValidationResult {
  if (!userId) {
    return { valid: false, error: '请先登录' };
  }
  if (order.status !== 'active') {
    return { valid: false, error: '该拼单已结束' };
  }
  if (order.participants.length >= order.maxParticipants) {
    return { valid: false, error: '拼单已满' };
  }
  if (order.participants.some((p) => p.userId === userId)) {
    return { valid: false, error: '您已加入该拼单' };
  }
  if (Date.now() > order.deadline) {
    return { valid: false, error: '拼单已超时' };
  }
  return { valid: true };
}

export function hasActiveUserOrder(userId: string, orders: GroupOrder[]): boolean {
  return orders.some(
    (o) => o.status === 'active' && o.participants.some((p) => p.userId === userId)
  );
}

export function incrementOrderCount(userId: string): number {
  const key = `${ORDER_COUNT_KEY}_${userId}`;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return next;
}

export function getOrderCount(userId: string): number {
  const key = `${ORDER_COUNT_KEY}_${userId}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export function formatCountdown(deadline: number): string {
  const diff = deadline - Date.now();
  if (diff <= 0) return '00:00';
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
