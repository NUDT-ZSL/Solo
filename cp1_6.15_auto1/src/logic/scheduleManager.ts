import { Caregiver, Order, OrderStatus, ScheduleConflict } from '../types';

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function checkScheduleConflict(
  caregiver: Caregiver,
  startDate: string,
  endDate: string
): ScheduleConflict {
  const requestedDates = getDateRange(startDate, endDate);
  const conflictingDates: string[] = [];

  for (const date of requestedDates) {
    if (caregiver.bookedDates.includes(date)) {
      conflictingDates.push(date);
    }
  }

  return {
    hasConflict: conflictingDates.length > 0,
    conflictingDates
  };
}

export function canTransitionStatus(current: OrderStatus, next: OrderStatus): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };
  return transitions[current].includes(next);
}

export function calculateOrderDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(diffDays, 1);
}

export function calculateTotalPrice(
  dailyPrice: number,
  startDate: string,
  endDate: string
): number {
  const days = calculateOrderDays(startDate, endDate);
  return dailyPrice * days;
}

export function getWeeklySchedule(
  orders: Order[],
  weekStartDate: Date
): Map<string, Order[]> {
  const schedule = new Map<string, Order[]>();
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    schedule.set(dateStr, []);
  }

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const orderDates = getDateRange(order.startDate, order.endDate);
    for (const dateStr of orderDates) {
      if (schedule.has(dateStr)) {
        const list = schedule.get(dateStr)!;
        list.push(order);
      }
    }
  }

  return schedule;
}

export function calculateWeeklyRevenue(
  orders: Order[],
  weekStartDate: Date
): { total: number; dailyBreakdown: { date: string; revenue: number }[] } {
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap.set(dateStr, 0);
  }

  let total = 0;

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const orderStart = new Date(order.startDate);
    const orderEnd = new Date(order.endDate);
    const overlapStart = orderStart > weekStart ? orderStart : weekStart;
    const overlapEnd = orderEnd < weekEnd ? orderEnd : weekEnd;

    if (overlapStart <= overlapEnd) {
      const days = calculateOrderDays(
        overlapStart.toISOString().split('T')[0],
        overlapEnd.toISOString().split('T')[0]
      );
      const orderTotalDays = calculateOrderDays(order.startDate, order.endDate);
      const dailyPrice = order.totalPrice / orderTotalDays;
      const periodRevenue = Math.round(dailyPrice * days);
      total += periodRevenue;

      const overlapDates = getDateRange(
        overlapStart.toISOString().split('T')[0],
        overlapEnd.toISOString().split('T')[0]
      );
      for (const d of overlapDates) {
        if (dailyMap.has(d)) {
          dailyMap.set(d, dailyMap.get(d)! + Math.round(dailyPrice));
        }
      }
    }
  }

  const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, revenue]) => ({
    date,
    revenue
  }));

  return { total, dailyBreakdown };
}

export function getMonthCalendarDays(year: number, month: number): string[] {
  const days: string[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = firstDay.getDay();
  const adjustedFirstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;

  for (let i = adjustedFirstWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d.toISOString().split('T')[0]);
  }

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().split('T')[0]);
  }

  while (days.length % 7 !== 0) {
    const last = new Date(days[days.length - 1]);
    last.setDate(last.getDate() + 1);
    days.push(last.toISOString().split('T')[0]);
  }

  return days;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
