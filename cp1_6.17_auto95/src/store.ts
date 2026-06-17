import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export type Channel = 'dine_in' | 'takeout' | 'platform'

export type Page = 'dashboard' | 'menu' | 'orders' | 'export'

export interface MenuItem {
  id: string
  name: string
  price: number
  stock: number
  todaySales: number
  category: string
}

export interface Order {
  id: string
  orderNo: string
  channel: Channel
  menuItemId: string
  menuItemName: string
  quantity: number
  amount: number
  timestamp: Date
}

export interface HourlyRevenue {
  hour: string
  amount: number
  yesterdayAmount: number
}

export interface AppState {
  selectedDate: string
  currentPage: Page
  sidebarCollapsed: boolean
  revenue: {
    total: number
    totalOrders: number
    hourly: HourlyRevenue[]
  }
  orders: Order[]
  menuItems: MenuItem[]

  setSelectedDate: (date: string) => void
  setCurrentPage: (page: Page) => void
  toggleSidebar: () => void
  addOrder: (order: Order) => void
  updateMenuItemStock: (id: string, delta: number) => void
  refreshRevenueData: () => void
}

const MENU_ITEMS: MenuItem[] = [
  { id: uuidv4(), name: '宫保鸡丁', price: 28, stock: 35, todaySales: 42, category: '热菜' },
  { id: uuidv4(), name: '鱼香肉丝', price: 26, stock: 28, todaySales: 38, category: '热菜' },
  { id: uuidv4(), name: '麻婆豆腐', price: 18, stock: 50, todaySales: 56, category: '热菜' },
  { id: uuidv4(), name: '回锅肉', price: 32, stock: 15, todaySales: 24, category: '热菜' },
  { id: uuidv4(), name: '凉拌黄瓜', price: 12, stock: 8, todaySales: 31, category: '凉菜' },
  { id: uuidv4(), name: '皮蛋豆腐', price: 14, stock: 42, todaySales: 27, category: '凉菜' },
  { id: uuidv4(), name: '番茄蛋汤', price: 10, stock: 60, todaySales: 45, category: '汤类' },
  { id: uuidv4(), name: '紫菜蛋花汤', price: 8, stock: 55, todaySales: 39, category: '汤类' },
  { id: uuidv4(), name: '米饭', price: 2, stock: 5, todaySales: 120, category: '主食' },
  { id: uuidv4(), name: '可乐', price: 6, stock: 20, todaySales: 48, category: '饮料' },
  { id: uuidv4(), name: '柠檬水', price: 8, stock: 30, todaySales: 35, category: '饮料' },
  { id: uuidv4(), name: '招牌炒饭', price: 22, stock: 18, todaySales: 29, category: '主食' },
]

function generateHourlyRevenue(): HourlyRevenue[] {
  const hours: HourlyRevenue[] = []
  for (let h = 10; h <= 21; h++) {
    const baseAmount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 180, 420, 560, 380, 150, 80, 120, 350, 480, 420, 280, 120][h]
    const variance = Math.floor(Math.random() * 120) - 60
    hours.push({
      hour: `${h.toString().padStart(2, '0')}:00`,
      amount: baseAmount + variance,
      yesterdayAmount: baseAmount + Math.floor(Math.random() * 160) - 80,
    })
  }
  return hours
}

function generateInitialOrders(): Order[] {
  const orders: Order[] = []
  const channels: Channel[] = ['dine_in', 'takeout', 'platform']
  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const menuItem = MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)]
    const quantity = Math.floor(Math.random() * 3) + 1
    const time = new Date(now.getTime() - i * (3 + Math.random() * 5) * 60000)
    orders.push({
      id: uuidv4(),
      orderNo: `ORD${(Date.now() - i * 100000).toString().slice(-8)}`,
      channel: channels[Math.floor(Math.random() * channels.length)],
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity,
      amount: menuItem.price * quantity,
      timestamp: time,
    })
  }
  return orders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

const initialHourly = generateHourlyRevenue()
const initialOrders = generateInitialOrders()
const initialRevenue = initialHourly.reduce((sum, h) => sum + h.amount, 0)
const initialOrderCount = initialOrders.length + 42

export const useStore = create<AppState>((set, get) => ({
  selectedDate: new Date().toISOString().split('T')[0],
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  revenue: {
    total: initialRevenue,
    totalOrders: initialOrderCount,
    hourly: initialHourly,
  },
  orders: initialOrders,
  menuItems: MENU_ITEMS,

  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  addOrder: (order) =>
    set((state) => {
      const newOrders = [order, ...state.orders].slice(0, 20)
      return {
        orders: newOrders,
        revenue: {
          ...state.revenue,
          total: state.revenue.total + order.amount,
          totalOrders: state.revenue.totalOrders + 1,
        },
        menuItems: state.menuItems.map((item) =>
          item.id === order.menuItemId
            ? { ...item, stock: Math.max(0, item.stock - order.quantity), todaySales: item.todaySales + order.quantity }
            : item
        ),
      }
    }),

  updateMenuItemStock: (id, delta) =>
    set((state) => ({
      menuItems: state.menuItems.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item
      ),
    })),

  refreshRevenueData: () => {
    const hourly = generateHourlyRevenue()
    const total = hourly.reduce((sum, h) => sum + h.amount, 0)
    set((state) => ({
      revenue: {
        ...state.revenue,
        hourly,
        total,
      },
    }))
  },
}))

export const channelLabels: Record<Channel, { label: string; color: string }> = {
  dine_in: { label: '堂食', color: '#F97316' },
  takeout: { label: '外卖自取', color: '#3B82F6' },
  platform: { label: '外卖平台', color: '#A855F7' },
}
