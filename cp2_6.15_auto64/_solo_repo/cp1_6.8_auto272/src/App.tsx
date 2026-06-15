import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Home from './pages/Home'
import Detail from './pages/Detail'

interface User {
  id: number
  username: string
  nickname: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, nickname: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

function AuthModal({ mode, onClose, onSwitch }: { mode: 'login' | 'register'; onClose: () => void; onSwitch: () => void }) {
  const { login, register } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        if (!nickname.trim()) {
          setError('昵称不能为空')
          setLoading(false)
          return
        }
        await register(username, password, nickname)
      }
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card p-8 w-full max-w-md mx-4 animate-float-up"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-serif title-glow text-center mb-6">
          {mode === 'login' ? '🗝️ 回归信箱' : '✨ 创建信箱'}
        </h2>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-300 text-sm text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-white/20 outline-none input-glow transition-all duration-300"
              placeholder="输入用户名"
              required
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-white/20 outline-none input-glow transition-all duration-300"
                placeholder="你的昵称"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-white/20 outline-none input-glow transition-all duration-300"
              placeholder="输入密码"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
        <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
          {mode === 'login' ? '还没有信箱？' : '已有信箱？'}
          <button
            onClick={onSwitch}
            className="ml-1 text-[var(--accent-purple)] hover:text-[var(--accent-pink)] transition-colors"
          >
            {mode === 'login' ? '创建一个' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  )
}

function CreateLetterModal({ onClose }: { onClose: () => void }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [recipientNickname, setRecipientNickname] = useState('')
  const [unlockAt, setUnlockAt] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const getMinDatetime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1)
    return now.toISOString().slice(0, 16)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/letters', {
        title,
        content,
        recipientNickname: recipientNickname || '未来的自己',
        unlockAt,
        isPublic,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      onClose()
      navigate(`/letter/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card p-8 w-full max-w-lg mx-4 animate-float-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-serif title-glow text-center mb-6">📬 写一封未来信</h2>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-300 text-sm text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">信件标题</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-white/20 outline-none input-glow transition-all duration-300"
              placeholder="给信件取个名字"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">收件人昵称</label>
            <input
              type="text"
              value={recipientNickname}
              onChange={e => setRecipientNickname(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-white/20 outline-none input-glow transition-all duration-300"
              placeholder="未来的自己（默认）"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">信件内容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-white/20 outline-none input-glow transition-all duration-300 resize-none"
              placeholder="写下你想对未来的TA说的话..."
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">解锁时间</label>
            <input
              type="datetime-local"
              value={unlockAt}
              onChange={e => setUnlockAt(e.target.value)}
              min={getMinDatetime()}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--text-primary)] outline-none input-glow transition-all duration-300 [color-scheme:dark]"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isPublic ? 'bg-purple-600/60' : 'bg-white/10'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white/80 transition-transform duration-300 ${isPublic ? 'left-6' : 'left-0.5'}`}
              />
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              {isPublic ? '🌍 公开信件' : '🔒 私密信件'}
            </span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '寄送中...' : '🕊️ 寄往未来'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Navbar() {
  const { user, logout } = useAuth()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showAuth, setShowAuth] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-black/20 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🕰️</span>
            <span className="text-xl font-serif shimmer-text font-bold">回声信箱</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/60 to-pink-600/60 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                >
                  ✍️ 写信
                </button>
                <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">
                  {user.nickname}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <button
                onClick={() => { setAuthMode('login'); setShowAuth(true) }}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] text-sm hover:bg-white/10 transition-all duration-300"
              >
                🗝️ 登录
              </button>
            )}
          </div>
        </div>
      </nav>
      {showAuth && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuth(false)}
          onSwitch={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        />
      )}
      {showCreate && <CreateLetterModal onClose={() => setShowCreate(false)} />}
    </>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('echo_token'))

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('echo_user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch {
          localStorage.removeItem('echo_token')
          localStorage.removeItem('echo_user')
          setToken(null)
        }
      }
    }
  }, [])

  const login = async (username: string, password: string) => {
    const res = await axios.post('/api/auth/login', { username, password })
    const { token: newToken, user: userData } = res.data
    setToken(newToken)
    setUser(userData)
    localStorage.setItem('echo_token', newToken)
    localStorage.setItem('echo_user', JSON.stringify(userData))
  }

  const register = async (username: string, password: string, nickname: string) => {
    const res = await axios.post('/api/auth/register', { username, password, nickname })
    const { token: newToken, user: userData } = res.data
    setToken(newToken)
    setUser(userData)
    localStorage.setItem('echo_token', newToken)
    localStorage.setItem('echo_user', JSON.stringify(userData))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('echo_token')
    localStorage.removeItem('echo_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      <BrowserRouter>
        <div className="min-h-screen">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/letter/:id" element={<Detail />} />
          </Routes>
          <footer className="text-center py-8 text-sm text-[var(--text-secondary)] border-t border-white/5">
            🕰️ 回声信箱 · 寄往未来的声音
          </footer>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App
