import { v4 as uuidv4 } from 'uuid'

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  note: string
  timestamp: number
}

export interface Category {
  id: string
  name: string
  icon: string
  type: 'income' | 'expense'
}

export const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF6384',
  transport: '#36A2EB',
  shopping: '#FFCE56',
  entertainment: '#4BC0C0',
  housing: '#9966FF',
  other_expense: '#FF9F40',
  salary: '#4CAF50',
  other_income: '#8BC34A'
}

export const defaultCategories: Category[] = [
  { id: 'food', name: '餐饮', icon: '🍔', type: 'expense' },
  { id: 'transport', name: '交通', icon: '🚗', type: 'expense' },
  { id: 'shopping', name: '购物', icon: '🛒', type: 'expense' },
  { id: 'entertainment', name: '娱乐', icon: '🎮', type: 'expense' },
  { id: 'housing', name: '住房', icon: '🏠', type: 'expense' },
  { id: 'other_expense', name: '其他', icon: '📦', type: 'expense' },
  { id: 'salary', name: '薪资', icon: '💰', type: 'income' },
  { id: 'other_income', name: '其他收入', icon: '💵', type: 'income' }
]

class DataManager {
  private transactions: Transaction[] = []
  private budget: number = 0
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const savedTransactions = localStorage.getItem('budget_transactions')
      const savedBudget = localStorage.getItem('budget_limit')
      if (savedTransactions) {
        this.transactions = JSON.parse(savedTransactions)
      }
      if (savedBudget) {
        this.budget = parseFloat(savedBudget)
      }
    } catch (e) {
      console.error('Failed to load from storage:', e)
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('budget_transactions', JSON.stringify(this.transactions))
      localStorage.setItem('budget_limit', this.budget.toString())
    } catch (e) {
      console.error('Failed to save to storage:', e)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener())
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getTransactions(): Transaction[] {
    return [...this.transactions]
  }

  addTransaction(type: 'income' | 'expense', amount: number, category: string, note: string): Transaction {
    const newTransaction: Transaction = {
      id: uuidv4(),
      type,
      amount,
      category,
      note,
      timestamp: Date.now()
    }
    this.transactions.unshift(newTransaction)
    this.saveToStorage()
    this.notifyListeners()
    return newTransaction
  }

  getBudget(): number {
    return this.budget
  }

  setBudget(budget: number) {
    this.budget = budget
    this.saveToStorage()
    this.notifyListeners()
  }

  getCurrentMonthRange(): { start: number; end: number } {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
    return { start, end }
  }

  getCurrentMonthExpense(): number {
    const { start, end } = this.getCurrentMonthRange()
    return this.transactions
      .filter(t => t.type === 'expense' && t.timestamp >= start && t.timestamp < end)
      .reduce((sum, t) => sum + t.amount, 0)
  }

  getCurrentMonthIncome(): number {
    const { start, end } = this.getCurrentMonthRange()
    return this.transactions
      .filter(t => t.type === 'income' && t.timestamp >= start && t.timestamp < end)
      .reduce((sum, t) => sum + t.amount, 0)
  }

  getBudgetRemaining(): number {
    if (this.budget === 0) return Infinity
    return this.budget - this.getCurrentMonthExpense()
  }

  isOverBudget(): boolean {
    if (this.budget === 0) return false
    return this.getCurrentMonthExpense() > this.budget
  }

  getOverBudgetAmount(): number {
    if (!this.isOverBudget()) return 0
    return this.getCurrentMonthExpense() - this.budget
  }

  getCategoryExpenseSummary(): { category: string; name: string; amount: number; color: string; percentage: number }[] {
    const { start, end } = this.getCurrentMonthRange()
    const expenseCategories = defaultCategories.filter(c => c.type === 'expense')
    
    const categoryTotals: Record<string, number> = {}
    expenseCategories.forEach(c => {
      categoryTotals[c.id] = 0
    })

    this.transactions
      .filter(t => t.type === 'expense' && t.timestamp >= start && t.timestamp < end)
      .forEach(t => {
        if (categoryTotals.hasOwnProperty(t.category)) {
          categoryTotals[t.category] += t.amount
        }
      })

    const totalExpense = this.getCurrentMonthExpense()

    return expenseCategories
      .filter(c => categoryTotals[c.id] > 0)
      .map(c => ({
        category: c.id,
        name: c.name,
        amount: categoryTotals[c.id],
        color: CATEGORY_COLORS[c.id] || '#999999',
        percentage: totalExpense > 0 ? (categoryTotals[c.id] / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  getMonthlyTrend(months: number = 6): { month: string; monthKey: string; expense: number; income: number }[] {
    const result: { month: string; monthKey: string; expense: number; income: number }[] = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = date.getTime()
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime()
      const monthStr = `${date.getMonth() + 1}月`
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const monthExpense = this.transactions
        .filter(t => t.type === 'expense' && t.timestamp >= start && t.timestamp < end)
        .reduce((sum, t) => sum + t.amount, 0)

      const monthIncome = this.transactions
        .filter(t => t.type === 'income' && t.timestamp >= start && t.timestamp < end)
        .reduce((sum, t) => sum + t.amount, 0)

      result.push({
        month: monthStr,
        monthKey,
        expense: monthExpense,
        income: monthIncome
      })
    }

    return result
  }

  getFilteredTransactions(categoryFilter: string | null, dateRange: { start: number; end: number } | null): Transaction[] {
    let filtered = [...this.transactions]

    if (categoryFilter) {
      filtered = filtered.filter(t => t.category === categoryFilter)
    }

    if (dateRange) {
      filtered = filtered.filter(t => t.timestamp >= dateRange.start && t.timestamp < dateRange.end)
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  }

  resetBudget() {
    this.budget = 0
    this.saveToStorage()
    this.notifyListeners()
  }

  getCategoryById(id: string): Category | undefined {
    return defaultCategories.find(c => c.id === id)
  }
}

export const dataManager = new DataManager()
