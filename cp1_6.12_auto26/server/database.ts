import fs from 'fs';
import path from 'path';

const dbDir = process.cwd();
const dbFile = path.join(dbDir, 'finance.json');

export interface TransactionRow {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  tags: string;
  date: string;
  created_at: string;
}

export interface BudgetRow {
  id: string;
  month: string;
  category: string;
  amount: number;
  created_at: string;
}

interface DBSchema {
  transactions: TransactionRow[];
  budgets: BudgetRow[];
}

const defaultData: DBSchema = {
  transactions: [],
  budgets: []
};

let data: DBSchema = loadData();

function loadData(): DBSchema {
  try {
    if (fs.existsSync(dbFile)) {
      const raw = fs.readFileSync(dbFile, 'utf-8');
      return { ...defaultData, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading database:', e);
  }
  return JSON.parse(JSON.stringify(defaultData));
}

function saveData(): void {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function initDatabase(): void {
  const currentMonth = getCurrentMonth();
  const defaultBudgets = [
    { month: currentMonth, category: '餐饮', amount: 2000 },
    { month: currentMonth, category: '交通', amount: 800 },
    { month: currentMonth, category: '购物', amount: 1500 },
    { month: currentMonth, category: '娱乐', amount: 1000 },
    { month: currentMonth, category: '居住', amount: 3000 },
    { month: currentMonth, category: '医疗', amount: 500 }
  ];

  let changed = false;
  defaultBudgets.forEach(b => {
    if (!data.budgets.find(x => x.month === b.month && x.category === b.category)) {
      data.budgets.push({
        id: `budget-${b.month}-${b.category}`,
        month: b.month,
        category: b.category,
        amount: b.amount,
        created_at: new Date().toISOString()
      });
      changed = true;
    }
  });

  if (data.transactions.length === 0) {
    seedSampleData();
    changed = true;
  }

  if (changed) saveData();
  console.log(`Database initialized: ${data.transactions.length} transactions, ${data.budgets.length} budgets`);
}

function seedSampleData(): void {
  const now = new Date();
  const samples: TransactionRow[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const createdAt = date.toISOString();

    samples.push({
      id: `tx-sample-${i}-1`,
      type: 'expense',
      amount: +(Math.random() * 50 + 10).toFixed(2),
      category: '餐饮',
      description: '午餐',
      tags: JSON.stringify(['日常', '外卖']),
      date: dateStr,
      created_at: createdAt
    });

    if (i % 3 === 0) {
      samples.push({
        id: `tx-sample-${i}-2`,
        type: 'expense',
        amount: +(Math.random() * 30 + 5).toFixed(2),
        category: '交通',
        description: '地铁',
        tags: JSON.stringify(['通勤']),
        date: dateStr,
        created_at: createdAt
      });
    }

    if (i % 7 === 0) {
      samples.push({
        id: `tx-sample-${i}-3`,
        type: 'income',
        amount: 15000,
        category: '工资',
        description: '月薪',
        tags: JSON.stringify(['固定收入']),
        date: dateStr,
        created_at: createdAt
      });
    }

    if (i % 5 === 0) {
      samples.push({
        id: `tx-sample-${i}-4`,
        type: 'expense',
        amount: +(Math.random() * 200 + 50).toFixed(2),
        category: '购物',
        description: '日用品',
        tags: JSON.stringify(['日常']),
        date: dateStr,
        created_at: createdAt
      });
    }
  }

  data.transactions.push(...samples);
}

export function getAllTransactions(
  filters: {
    startDate?: string;
    endDate?: string;
    category?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  } = {}
): { data: TransactionRow[]; total: number } {
  let result = [...data.transactions];

  if (filters.startDate) {
    result = result.filter(t => t.date >= filters.startDate!);
  }
  if (filters.endDate) {
    result = result.filter(t => t.date <= filters.endDate!);
  }
  if (filters.category && filters.category !== 'all') {
    result = result.filter(t => t.category === filters.category);
  }
  if (filters.tag && filters.tag !== 'all') {
    const tag = filters.tag;
    result = result.filter(t => {
      try {
        const tags = JSON.parse(t.tags);
        return Array.isArray(tags) && tags.includes(tag);
      } catch {
        return false;
      }
    });
  }

  result.sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  const total = result.length;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const offset = (page - 1) * pageSize;
  const pagedData = result.slice(offset, offset + pageSize);

  return { data: pagedData, total };
}

export function createTransaction(tx: Omit<TransactionRow, 'created_at'>): TransactionRow {
  const newTx: TransactionRow = {
    ...tx,
    created_at: new Date().toISOString()
  };
  data.transactions.push(newTx);
  saveData();
  return newTx;
}

export function deleteTransaction(id: string): boolean {
  const idx = data.transactions.findIndex(t => t.id === id);
  if (idx === -1) return false;
  data.transactions.splice(idx, 1);
  saveData();
  return true;
}

export function getAllBudgets(): BudgetRow[] {
  return [...data.budgets].sort((a, b) => {
    const m = b.month.localeCompare(a.month);
    if (m !== 0) return m;
    return a.category.localeCompare(b.category);
  });
}

export function getBudgetsByMonth(month: string): BudgetRow[] {
  return data.budgets
    .filter(b => b.month === month)
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function createBudget(budget: Omit<BudgetRow, 'created_at'>): BudgetRow {
  const existing = data.budgets.findIndex(
    b => b.month === budget.month && b.category === budget.category
  );
  if (existing !== -1) {
    data.budgets[existing] = {
      ...data.budgets[existing],
      ...budget,
      created_at: data.budgets[existing].created_at
    };
    saveData();
    return data.budgets[existing];
  }
  const newBudget: BudgetRow = {
    ...budget,
    created_at: new Date().toISOString()
  };
  data.budgets.push(newBudget);
  saveData();
  return newBudget;
}

export function deleteBudget(id: string): boolean {
  const idx = data.budgets.findIndex(b => b.id === id);
  if (idx === -1) return false;
  data.budgets.splice(idx, 1);
  saveData();
  return true;
}

export function getSummary(months: number = 6): any {
  const now = new Date();
  const monthData: Array<{ month: string; income: number; expense: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const inMonth = data.transactions.filter(t => t.date >= monthStart && t.date < monthEnd);
    const income = inMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = inMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    monthData.push({
      month: monthLabel,
      income: +income.toFixed(2),
      expense: +expense.toFixed(2)
    });
  }

  const cmStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nmStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const cmEnd = `${nmStart.getFullYear()}-${String(nmStart.getMonth() + 1).padStart(2, '0')}-01`;

  const currentMonthTx = data.transactions.filter(
    t => t.type === 'expense' && t.date >= cmStart && t.date < cmEnd
  );

  const catMap = new Map<string, number>();
  currentMonthTx.forEach(t => {
    catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
  });
  const categoryExpense = Array.from(catMap.entries())
    .map(([category, amount]) => ({ category, amount: +amount.toFixed(2) }))
    .sort((a, b) => b.amount - a.amount);

  const totalIncome = data.transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = data.transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const allTagsSet = new Set<string>();
  data.transactions.forEach(t => {
    try {
      const tags = JSON.parse(t.tags);
      if (Array.isArray(tags)) tags.forEach((tag: string) => allTagsSet.add(tag));
    } catch {}
  });

  const allCategories = Array.from(new Set(data.transactions.map(t => t.category))).sort();

  return {
    monthTrend: monthData,
    categoryExpense,
    totalIncome: +totalIncome.toFixed(2),
    totalExpense: +totalExpense.toFixed(2),
    balance: +(totalIncome - totalExpense).toFixed(2),
    allTags: Array.from(allTagsSet),
    allCategories
  };
}

export function getCategorySpentByMonth(month: string): Array<{ category: string; spent: number }> {
  const [year, monthNum] = month.split('-').map(Number);
  const monthStart = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  const nextMonth = new Date(year, monthNum, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const inMonth = data.transactions.filter(
    t => t.type === 'expense' && t.date >= monthStart && t.date < monthEnd
  );

  const catMap = new Map<string, number>();
  inMonth.forEach(t => {
    catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
  });

  return Array.from(catMap.entries()).map(([category, spent]) => ({
    category,
    spent: +spent.toFixed(2)
  }));
}
