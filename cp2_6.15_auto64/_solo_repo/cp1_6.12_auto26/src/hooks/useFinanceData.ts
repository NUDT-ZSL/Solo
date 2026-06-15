import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Transaction,
  TransactionFormData,
  Budget,
  BudgetFormData,
  Summary,
  TransactionFilters,
  TransactionListResponse,
  getBudgetWarningLevel,
  BudgetWarningLevel
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export interface FinanceData {
  transactions: Transaction[];
  transactionsTotal: number;
  budgets: (Budget & { warningLevel: BudgetWarningLevel })[];
  summary: Summary | null;
  loading: boolean;
  error: string | null;
  notification: { type: 'warning' | 'danger'; message: string; categories: string[] } | null;
  dismissNotification: () => void;
  fetchTransactions: (filters: Partial<TransactionFilters>) => Promise<void>;
  addTransaction: (data: TransactionFormData) => Promise<boolean>;
  removeTransaction: (id: string) => Promise<boolean>;
  fetchBudgets: (month?: string) => Promise<void>;
  addBudget: (data: BudgetFormData) => Promise<boolean>;
  removeBudget: (id: string) => Promise<boolean>;
  fetchSummary: () => Promise<void>;
  refreshAll: (month?: string) => Promise<void>;
}

export function useFinanceData(): FinanceData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [budgets, setBudgets] = useState<(Budget & { warningLevel: BudgetWarningLevel })[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'warning' | 'danger'; message: string; categories: string[] } | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissNotification = useCallback(() => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotification(null);
  }, []);

  const showNotification = useCallback((type: 'warning' | 'danger', categories: string[]) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    const message = type === 'danger'
      ? `警告：${categories.join('、')} 已超出预算！`
      : `提醒：${categories.join('、')} 即将达到预算的80%`;
    setNotification({ type, message, categories });
    notifTimer.current = setTimeout(dismissNotification, 5000);
  }, [dismissNotification]);

  const processBudgetWarnings = useCallback((newBudgets: Budget[]) => {
    const processed = newBudgets.map(b => ({
      ...b,
      warningLevel: getBudgetWarningLevel(b)
    }));
    setBudgets(processed);

    const dangerCats = processed.filter(b => b.warningLevel === 'danger').map(b => b.category);
    const warningCats = processed.filter(b => b.warningLevel === 'warning').map(b => b.category);

    if (dangerCats.length > 0) {
      showNotification('danger', dangerCats);
    } else if (warningCats.length > 0) {
      showNotification('warning', warningCats);
    }
  }, [showNotification]);

  const fetchTransactions = useCallback(async (filters: Partial<TransactionFilters>) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
      });
      const res = await fetchJson<{ data: any[]; total: number }>(
        `${API_BASE}/transactions?${params.toString()}`
      );
      const txList = res.data.map(tx => ({
        ...tx,
        tags: typeof tx.tags === 'string' ? JSON.parse(tx.tags) : tx.tags
      })) as Transaction[];
      setTransactions(txList);
      setTransactionsTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const addTransaction = useCallback(async (data: TransactionFormData): Promise<boolean> => {
    try {
      setError(null);
      await fetchJson<Transaction>(`${API_BASE}/transactions`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const month = data.date.slice(0, 7);
      await Promise.all([
        fetchTransactions({ page: 1, pageSize: 10 }),
        fetchBudgets(month),
        fetchSummary()
      ]);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchTransactions]);

  const removeTransaction = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      await fetchJson(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
      await Promise.all([
        fetchTransactions({ page: 1, pageSize: 10 }),
        fetchBudgets(getCurrentMonth()),
        fetchSummary()
      ]);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchTransactions]);

  const fetchBudgets = useCallback(async (month?: string) => {
    try {
      const m = month || getCurrentMonth();
      const res = await fetchJson<Budget[]>(`${API_BASE}/budgets?month=${m}`);
      processBudgetWarnings(res);
    } catch (e: any) {
      setError(e.message);
    }
  }, [processBudgetWarnings]);

  const addBudget = useCallback(async (data: BudgetFormData): Promise<boolean> => {
    try {
      setError(null);
      await fetchJson<Budget>(`${API_BASE}/budgets`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await fetchBudgets(data.month);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchBudgets]);

  const removeBudget = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      await fetchJson(`${API_BASE}/budgets/${id}`, { method: 'DELETE' });
      await fetchBudgets(getCurrentMonth());
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchBudgets]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetchJson<Summary>(`${API_BASE}/summary?months=6`);
      setSummary(res);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const refreshAll = useCallback(async (month?: string) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchTransactions({ page: 1, pageSize: 10 }),
        fetchBudgets(month || getCurrentMonth()),
        fetchSummary()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions, fetchBudgets, fetchSummary]);

  useEffect(() => {
    refreshAll();
    return () => {
      if (notifTimer.current) clearTimeout(notifTimer.current);
    };
  }, [refreshAll]);

  return {
    transactions,
    transactionsTotal,
    budgets,
    summary,
    loading,
    error,
    notification,
    dismissNotification,
    fetchTransactions,
    addTransaction,
    removeTransaction,
    fetchBudgets,
    addBudget,
    removeBudget,
    fetchSummary,
    refreshAll
  };
}
