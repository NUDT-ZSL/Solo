export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  tags: string[];
  date: string;
  created_at?: string;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: number | '';
  category: string;
  description: string;
  tags: string[];
  date: string;
}

export interface Budget {
  id: string;
  month: string;
  category: string;
  amount: number;
  spent?: number;
  created_at?: string;
}

export interface BudgetFormData {
  month: string;
  category: string;
  amount: number | '';
}

export interface Category {
  name: string;
  color: string;
  type: TransactionType;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { name: '餐饮', color: '#FF6B6B', type: 'expense' },
  { name: '交通', color: '#4ECDC4', type: 'expense' },
  { name: '购物', color: '#45B7D1', type: 'expense' },
  { name: '娱乐', color: '#96CEB4', type: 'expense' },
  { name: '居住', color: '#FFEAA7', type: 'expense' },
  { name: '医疗', color: '#DDA0DD', type: 'expense' },
  { name: '教育', color: '#98D8C8', type: 'expense' },
  { name: '其他支出', color: '#B8B8B8', type: 'expense' },
  { name: '工资', color: '#6BCB77', type: 'income' },
  { name: '奖金', color: '#4D96FF', type: 'income' },
  { name: '投资收益', color: '#FF6F91', type: 'income' },
  { name: '其他收入', color: '#A66CFF', type: 'income' }
];

export const EXPENSE_CATEGORIES = DEFAULT_CATEGORIES.filter(c => c.type === 'expense');
export const INCOME_CATEGORIES = DEFAULT_CATEGORIES.filter(c => c.type === 'income');

export function getCategoryColor(name: string): string {
  const cat = DEFAULT_CATEGORIES.find(c => c.name === name);
  return cat?.color || '#B8B8B8';
}

export interface MonthTrendItem {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryExpenseItem {
  category: string;
  amount: number;
}

export interface Summary {
  monthTrend: MonthTrendItem[];
  categoryExpense: CategoryExpenseItem[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  allTags: string[];
  allCategories: string[];
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  tag?: string;
  page: number;
  pageSize: number;
}

export type BudgetWarningLevel = 'normal' | 'warning' | 'danger';

export function getBudgetWarningLevel(budget: Budget): BudgetWarningLevel {
  if (!budget.spent || budget.amount === 0) return 'normal';
  const ratio = budget.spent / budget.amount;
  if (ratio >= 1) return 'danger';
  if (ratio >= 0.8) return 'warning';
  return 'normal';
}
