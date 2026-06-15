import express from 'express'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(express.json())

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  note: string
  timestamp: number
}

const categories = [
  { id: 'food', name: '餐饮', icon: '🍔', type: 'expense' },
  { id: 'transport', name: '交通', icon: '🚗', type: 'expense' },
  { id: 'shopping', name: '购物', icon: '🛒', type: 'expense' },
  { id: 'entertainment', name: '娱乐', icon: '🎮', type: 'expense' },
  { id: 'housing', name: '住房', icon: '🏠', type: 'expense' },
  { id: 'other_expense', name: '其他', icon: '📦', type: 'expense' },
  { id: 'salary', name: '薪资', icon: '💰', type: 'income' },
  { id: 'other_income', name: '其他收入', icon: '💵', type: 'income' }
]

const generateMockTransactions = (): Transaction[] => {
  const transactions: Transaction[] = []
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const expenseCategories = ['food', 'transport', 'shopping', 'entertainment', 'housing', 'other_expense']
  const incomeCategories = ['salary', 'other_income']

  for (let i = 0; i < 50; i++) {
    const isExpense = Math.random() > 0.2
    const daysAgo = Math.floor(Math.random() * 180)
    const timestamp = now - daysAgo * oneDay

    if (isExpense) {
      transactions.push({
        id: uuidv4(),
        type: 'expense',
        amount: Math.floor(Math.random() * 500) + 10,
        category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
        note: ['午餐', '地铁', '网购', '电影票', '房租', '日用品'][Math.floor(Math.random() * 6)],
        timestamp
      })
    } else {
      transactions.push({
        id: uuidv4(),
        type: 'income',
        amount: Math.floor(Math.random() * 5000) + 1000,
        category: incomeCategories[Math.floor(Math.random() * incomeCategories.length)],
        note: Math.random() > 0.5 ? '月薪' : '奖金',
        timestamp
      })
    }
  }

  return transactions.sort((a, b) => b.timestamp - a.timestamp)
}

let transactions = generateMockTransactions()

app.get('/api/transactions', (req, res) => {
  res.json(transactions)
})

app.get('/api/categories', (req, res) => {
  res.json(categories)
})

app.post('/api/transactions', (req, res) => {
  const { type, amount, category, note } = req.body
  const newTransaction: Transaction = {
    id: uuidv4(),
    type,
    amount: parseFloat(amount),
    category,
    note: note || '',
    timestamp: Date.now()
  }
  transactions.unshift(newTransaction)
  res.status(201).json(newTransaction)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
