const DEFAULT_BORROW_DAYS = 30;
const LOW_STOCK_THRESHOLD = 5;

export function calculateDueDate(borrowDate: Date): Date {
  const dueDate = new Date(borrowDate);
  dueDate.setDate(dueDate.getDate() + DEFAULT_BORROW_DAYS);
  return dueDate;
}

export function isLowStock(quantity: number): boolean {
  return quantity < LOW_STOCK_THRESHOLD;
}

export function calculateDueDays(dueDate: Date): number {
  const now = new Date();
  const timeDiff = now.getTime() - dueDate.getTime();
  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return dayDiff;
}

export function isOverdue(dueDate: Date): boolean {
  const now = new Date();
  return now > dueDate;
}

export function getOverdueDays(dueDate: Date): number {
  const days = calculateDueDays(dueDate);
  return days > 0 ? days : 0;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
