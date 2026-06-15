import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import axios from 'axios'
import { Search, Filter, User, Calendar, Star, Wrench, Leaf, Hammer, SprayCan, Mountain } from 'lucide-react'

interface Tool {
  id: string
  name: string
  category: string
  description: string
  image: string
  available: boolean
  owner: string
}

interface Reservation {
  id: string
  toolId: string
  toolName: string
  userId: string
  startDate: string
  endDate: string
  status: string
}

interface UserCredit {
  userId: string
  score: number
  level: string
  completedReservations: number
}

const CURRENT_USER_ID = 'user-001'

const categories = [
  { id: 'all', name: '全部', icon: Wrench },
  { id: '园艺', name: '园艺', icon: Leaf },
  { id: '维修', name: '维修', icon: Hammer },
  { id: '清洁', name: '清洁', icon: SprayCan },
  { id: '户外', name: '户外', icon: Mountain },
]

function Navbar({ userCredit }: { userCredit: UserCredit | null }) {
  return (
    <nav className="h-14 fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-lg border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <Wrench className="w-6 h-6" />
          <span>邻里工具箱</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/reservations" className="nav-link flex items-center gap-1 text-gray-700 hover:text-primary transition-colors">
            <Calendar className="w-5 h-5" />
            <span className="hidden sm:inline">预约日历</span>
          </Link>
          <Link to="/credit" className="nav-link flex items-center gap-1 text-gray-700 hover:text-primary transition-colors">
            <Star className="w-5 h-5" />
            <span className="hidden sm:inline">信用面板</span>
          </Link>
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            {userCredit && (
              <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-semibold text-primary">{userCredit.score}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function ToolCard({ tool, loading }: { tool: Tool | null; loading: boolean }) {
  if (loading || !tool) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden animate-shimmer">
        <div className="h-40 bg-gray-200" />
        <div className="p-4 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="flex justify-between pt-2">
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-8 bg-gray-200 rounded w-20" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
      <div className="h-40 overflow-hidden">
        <img
          src={tool.image}
          alt={tool.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg text-gray-800">{tool.name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            tool.available 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {tool.available ? '可借' : '已借出'}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{tool.description}</p>
        <div className="flex items-center justify-between">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
            {tool.category}
          </span>
          <button className="btn-primary px-4 py-1.5 rounded-lg text-sm font-medium">
            立即预约
          </button>
        </div>
      </div>
    </div>
  )
}

function HomePage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await axios.get('/api/tools')
        setTools(response.data.data || [])
      } catch (error) {
        console.error('Failed to fetch tools:', error)
        setTools([
          {
            id: '1',
            name: '电动螺丝刀',
            category: '维修',
            description: '家用多功能电动螺丝刀，适合家具组装和日常维修。',
            image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop',
            available: true,
            owner: 'user-002',
          },
          {
            id: '2',
            name: '园艺剪刀',
            category: '园艺',
            description: '专业修枝剪，适合修剪花草和小型灌木。',
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
            available: true,
            owner: 'user-003',
          },
          {
            id: '3',
            name: '高压清洗机',
            category: '清洁',
            description: '家用高压清洗机，可清洗汽车、阳台和外墙。',
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
            available: false,
            owner: 'user-004',
          },
          {
            id: '4',
            name: '露营帐篷',
            category: '户外',
            description: '4人家庭露营帐篷，防水防晒，易于搭建。',
            image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop',
            available: true,
            owner: 'user-005',
          },
          {
            id: '5',
            name: '工具箱套装',
            category: '维修',
            description: '128件专业工具箱，包含各种手动工具。',
            image: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&h=300&fit=crop',
            available: true,
            owner: 'user-006',
          },
          {
            id: '6',
            name: '浇水壶',
            category: '园艺',
            description: '5L大容量浇水壶，带长嘴喷头设计。',
            image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop',
            available: true,
            owner: 'user-007',
          },
          {
            id: '7',
            name: '吸尘器',
            category: '清洁',
            description: '大功率家用吸尘器，适合深度清洁。',
            image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=300&fit=crop',
            available: false,
            owner: 'user-008',
          },
          {
            id: '8',
            name: '登山杖',
            category: '户外',
            description: '轻量化碳纤维登山杖，可调节长度。',
            image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
            available: true,
            owner: 'user-009',
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchTools()
  }, [])

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">欢迎来到邻里工具箱</h1>
          <p className="text-gray-600">与邻居共享工具，共建美好社区</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索工具名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array(8).fill(null).map((_, i) => (
                <ToolCard key={i} tool={null} loading={true} />
              ))
            : filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} loading={false} />
              ))}
        </div>

        {!loading && filteredTools.length === 0 && (
          <div className="text-center py-16">
            <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">没有找到符合条件的工具</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await axios.get('/api/reservations')
        setReservations(response.data.data || [])
      } catch (error) {
        console.error('Failed to fetch reservations:', error)
        setReservations([
          {
            id: 'r1',
            toolId: '1',
            toolName: '电动螺丝刀',
            userId: CURRENT_USER_ID,
            startDate: '2026-06-15',
            endDate: '2026-06-17',
            status: 'confirmed',
          },
          {
            id: 'r2',
            toolId: '2',
            toolName: '园艺剪刀',
            userId: CURRENT_USER_ID,
            startDate: '2026-06-20',
            endDate: '2026-06-21',
            status: 'pending',
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchReservations()
  }, [])

  return (
    <div className="pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">预约日历</h1>
        
        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(null).map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-shimmer" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="space-y-4">
              {reservations.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{res.toolName}</h3>
                      <p className="text-sm text-gray-500">
                        {res.startDate} 至 {res.endDate}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    res.status === 'confirmed'
                      ? 'bg-green-100 text-green-700'
                      : res.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {res.status === 'confirmed' ? '已确认' : res.status === 'pending' ? '待确认' : res.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CreditPage() {
  const [userCredit, setUserCredit] = useState<UserCredit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCredit = async () => {
      try {
        const response = await axios.get(`/api/ratings/${CURRENT_USER_ID}`)
        setUserCredit(response.data.data || null)
      } catch (error) {
        console.error('Failed to fetch user credit:', error)
        setUserCredit({
          userId: CURRENT_USER_ID,
          score: 92,
          level: '优秀',
          completedReservations: 28,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCredit()
  }, [])

  return (
    <div className="pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">个人信用面板</h1>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array(3).fill(null).map((_, i) => (
              <div key={i} className="h-40 bg-white rounded-xl animate-shimmer" />
            ))}
          </div>
        ) : userCredit && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Star className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm">信用评分</p>
                  <p className="text-3xl font-bold">{userCredit.score}</p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${userCredit.score}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">信用等级</p>
                  <p className="text-3xl font-bold text-gray-800">{userCredit.level}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                继续保持良好的借用记录，提升信用等级
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">完成预约</p>
                  <p className="text-3xl font-bold text-gray-800">{userCredit.completedReservations}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                每完成一次按时归还的预约，信用评分+1
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [userCredit, setUserCredit] = useState<UserCredit | null>(null)

  useEffect(() => {
    const fetchUserCredit = async () => {
      try {
        const response = await axios.get(`/api/ratings/${CURRENT_USER_ID}`)
        setUserCredit(response.data.data || null)
      } catch (error) {
        console.error('Failed to fetch user credit for navbar:', error)
        setUserCredit({
          userId: CURRENT_USER_ID,
          score: 92,
          level: '优秀',
          completedReservations: 28,
        })
      }
    }

    fetchUserCredit()
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar userCredit={userCredit} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/credit" element={<CreditPage />} />
        </Routes>
      </div>
    </Router>
  )
}
