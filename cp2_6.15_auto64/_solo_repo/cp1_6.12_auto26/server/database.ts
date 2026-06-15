import initSqlJs, { Database, Statement, QueryExecResult } from 'sql.js';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'finance.db');

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

let db: Database;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function execQuery(sql: string, params: any[] = []): QueryExecResult[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const results: QueryExecResult[] = [];
    const columns = stmt.getColumnNames();
    const values: any[][] = [];

    while (stmt.step()) {
      values.push(stmt.get());
    }

    if (columns.length > 0) {
      results.push({ columns, values });
    }

    return results;
  } finally {
    stmt.free();
  }
}

function execRun(sql: string, params: any[] = []): { changes: number } {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    stmt.step();
    return { changes: db.getRowsModified() };
  } finally {
    stmt.free();
  }
}

function queryOneValue(sql: string, params: any[] = []): any {
  const result = execQuery(sql, params);
  return result[0]?.values[0]?.[0];
}

function queryAllRows(sql: string, params: any[] = []): any[] {
  const result = execQuery(sql, params);
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } catch (e) {
      console.warn('Failed to load existing database, creating new one:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  execRun(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK (amount > 0),
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  execRun(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(month, category)
    );
  `);

  execRun('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');
  execRun('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)');
  execRun('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
  execRun('CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month)');

  const currentMonth = getCurrentMonth();
  const defaultBudgets = [
    { month: currentMonth, category: '餐饮', amount: 2000 },
    { month: currentMonth, category: '交通', amount: 800 },
    { month: currentMonth, category: '购物', amount: 1500 },
    { month: currentMonth, category: '娱乐', amount: 1000 },
    { month: currentMonth, category: '居住', amount: 3000 },
    { month: currentMonth, category: '医疗', amount: 500 }
  ];

  defaultBudgets.forEach(b => {
    execRun(
      'INSERT OR IGNORE INTO budgets (id, month, category, amount) VALUES (?, ?, ?, ?)',
      [`budget-${b.month}-${b.category}`, b.month, b.category, b.amount]
    );
  });

  const count = queryOneValue('SELECT COUNT(*) as cnt FROM transactions') as number || 0;
  if (count === 0) {
    seedSampleData();
  }

  saveDatabase();

  const finalCount = queryOneValue('SELECT COUNT(*) as cnt FROM transactions') as number || 0;
  const budgetCount = queryOneValue('SELECT COUNT(*) as cnt FROM budgets') as number || 0;
  console.log(`Database initialized: ${finalCount} transactions, ${budgetCount} budgets`);
}

function saveDatabase(): void {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

function seedSampleData(): void {
  const now = new Date();
  let idCounter = 0;

  for (let i = 0; i < 90; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const createdAt = date.toISOString();

    execRun(
      'INSERT INTO transactions (id, type, amount, category, description, tags, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        `tx-sample-${idCounter++}`,
        'expense',
        +(Math.random() * 50 + 10).toFixed(2),
        '餐饮',
        '午餐',
        JSON.stringify(['日常', '外卖']),
        dateStr,
        createdAt
      ]
    );

    if (i % 2 === 0) {
      execRun(
        'INSERT INTO transactions (id, type, amount, category, description, tags, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `tx-sample-${idCounter++}`,
          'expense',
          +(Math.random() * 30 + 5).toFixed(2),
          '交通',
          '地铁',
          JSON.stringify(['通勤']),
          dateStr,
          createdAt
        ]
      );
    }

    if (i % 15 === 0) {
      execRun(
        'INSERT INTO transactions (id, type, amount, category, description, tags, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `tx-sample-${idCounter++}`,
          'income',
          15000,
          '工资',
          '月薪',
          JSON.stringify(['固定收入']),
          dateStr,
          createdAt
        ]
      );
    }

    if (i % 4 === 0) {
      execRun(
        'INSERT INTO transactions (id, type, amount, category, description, tags, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `tx-sample-${idCounter++}`,
          'expense',
          +(Math.random() * 200 + 50).toFixed(2),
          '购物',
          '日用品',
          JSON.stringify(['日常']),
          dateStr,
          createdAt
        ]
      );
    }

    if (i % 10 === 0) {
      execRun(
        'INSERT INTO transactions (id, type, amount, category, description, tags, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `tx-sample-${idCounter++}`,
          'expense',
          +(Math.random() * 100 + 30).toFixed(2),
          '娱乐',
          '电影',
          JSON.stringify(['休闲']),
          dateStr,
          createdAt
        ]
      );
    }

    if (i % 30 === 0) {
      execRun(
        'INSERT INTO transactions (id, type, amount, category, description, tags, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `tx-sample-${idCounter++}`,
          'expense',
          3000,
          '居住',
          '房租',
          JSON.stringify(['固定支出']),
          dateStr,
          createdAt
        ]
      );
    }
  }
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
  const where: string[] = [];
  const params: any[] = [];

  if (filters.startDate) {
    where.push('date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    where.push('date <= ?');
    params.push(filters.endDate);
  }
  if (filters.category && filters.category !== 'all') {
    where.push('category = ?');
    params.push(filters.category);
  }
  if (filters.tag && filters.tag !== 'all') {
    where.push("tags LIKE '%' || ? || '%'");
    params.push(`"${filters.tag}"`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const total = queryOneValue(`SELECT COUNT(*) as cnt FROM transactions ${whereClause}`, params) as number || 0;

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const offset = (page - 1) * pageSize;

  const query = `
    SELECT * FROM transactions ${whereClause}
    ORDER BY date DESC, created_at DESC
    LIMIT ? OFFSET ?
  `;
  const queryParams = [...params, pageSize, offset];

  const data = queryAllRows(query, queryParams) as TransactionRow[];

  return { data, total };
}

export function createTransaction(tx: Omit<TransactionRow, 'created_at'>): TransactionRow {
  const createdAt = new Date().toISOString();
  execRun(
    'INSERT INTO transactions (id, type, amount, category, description, tags, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [tx.id, tx.type, tx.amount, tx.category, tx.description, tx.tags, tx.date, createdAt]
  );
  saveDatabase();
  return { ...tx, created_at: createdAt };
}

export function deleteTransaction(id: string): boolean {
  const resultBefore = queryOneValue('SELECT COUNT(*) as cnt FROM transactions WHERE id = ?', [id]) as number;
  const existsBefore = resultBefore > 0;

  execRun('DELETE FROM transactions WHERE id = ?', [id]);

  const resultAfter = queryOneValue('SELECT COUNT(*) as cnt FROM transactions WHERE id = ?', [id]) as number;
  const existsAfter = resultAfter > 0;

  const changed = existsBefore && !existsAfter;
  if (changed) saveDatabase();
  return changed;
}

export function getAllBudgets(): BudgetRow[] {
  return queryAllRows('SELECT * FROM budgets ORDER BY month DESC, category') as BudgetRow[];
}

export function getBudgetsByMonth(month: string): BudgetRow[] {
  return queryAllRows('SELECT * FROM budgets WHERE month = ? ORDER BY category', [month]) as BudgetRow[];
}

export function createBudget(budget: Omit<BudgetRow, 'created_at'>): BudgetRow {
  const existing = queryAllRows('SELECT id FROM budgets WHERE month = ? AND category = ?', [budget.month, budget.category]);

  if (existing.length > 0) {
    execRun('UPDATE budgets SET amount = ? WHERE month = ? AND category = ?', [budget.amount, budget.month, budget.category]);
    saveDatabase();
    const result = queryAllRows('SELECT * FROM budgets WHERE month = ? AND category = ?', [budget.month, budget.category]);
    return result[0] as BudgetRow;
  }

  const createdAt = new Date().toISOString();
  execRun(
    'INSERT INTO budgets (id, month, category, amount, created_at) VALUES (?, ?, ?, ?, ?)',
    [budget.id, budget.month, budget.category, budget.amount, createdAt]
  );
  saveDatabase();
  return { ...budget, created_at: createdAt };
}

export function deleteBudget(id: string): boolean {
  const resultBefore = queryOneValue('SELECT COUNT(*) as cnt FROM budgets WHERE id = ?', [id]) as number;
  const existsBefore = resultBefore > 0;

  execRun('DELETE FROM budgets WHERE id = ?', [id]);

  const resultAfter = queryOneValue('SELECT COUNT(*) as cnt FROM budgets WHERE id = ?', [id]) as number;
  const existsAfter = resultAfter > 0;

  const changed = existsBefore && !existsAfter;
  if (changed) saveDatabase();
  return changed;
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

    const income = queryOneValue(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date < ?",
      [monthStart, monthEnd]
    ) as number || 0;

    const expense = queryOneValue(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?",
      [monthStart, monthEnd]
    ) as number || 0;

    monthData.push({
      month: monthLabel,
      income: +income.toFixed(2),
      expense: +expense.toFixed(2)
    });
  }

  const cmStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const nmStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const cmEnd = `${nmStart.getFullYear()}-${String(nmStart.getMonth() + 1).padStart(2, '0')}-01`;

  const catRows = queryAllRows(
    `SELECT category, COALESCE(SUM(amount), 0) as amount
     FROM transactions
     WHERE type = 'expense' AND date >= ? AND date < ?
     GROUP BY category
     ORDER BY amount DESC`,
    [cmStart, cmEnd]
  );

  const categoryExpense = catRows.map(row => ({
    category: row.category as string,
    amount: +(row.amount as number).toFixed(2)
  }));

  const totalIncome = queryOneValue("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'") as number || 0;
  const totalExpense = queryOneValue("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'") as number || 0;

  const allTagsRows = queryAllRows("SELECT tags FROM transactions WHERE tags != '[]'");
  const allTagsSet = new Set<string>();
  allTagsRows.forEach(row => {
    try {
      const tags = JSON.parse(row.tags as string);
      if (Array.isArray(tags)) tags.forEach((tag: string) => allTagsSet.add(tag));
    } catch {}
  });

  const allCategoriesRows = queryAllRows('SELECT DISTINCT category FROM transactions ORDER BY category');
  const allCategories = allCategoriesRows.map(row => row.category as string);

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

  const rows = queryAllRows(
    `SELECT category, COALESCE(SUM(amount), 0) as spent
     FROM transactions
     WHERE type = 'expense' AND date >= ? AND date < ?
     GROUP BY category`,
    [monthStart, monthEnd]
  );

  return rows.map(row => ({
    category: row.category as string,
    spent: +(row.spent as number).toFixed(2)
  }));
}
