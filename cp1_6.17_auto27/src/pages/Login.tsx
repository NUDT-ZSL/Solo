import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sprout, LogIn } from 'lucide-react'
import { useGardenStore } from '@/store/gardenStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'manager' | 'member'>('member')
  const setUser = useGardenStore((s) => s.setUser)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role }),
    })
    if (res.ok) {
      const data = await res.json()
      setUser(data.user)
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-garden-bg">
      <div
        className="bg-garden-card rounded-[12px] w-full max-w-sm p-8 flex flex-col items-center gap-6"
        style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.08)' }}
      >
        <Sprout className="w-16 h-16 text-garden-title" strokeWidth={1.5} />

        <div className="text-center">
          <h1 className="text-3xl font-bold font-display text-garden-title">
            社区菜园
          </h1>
          <p className="text-garden-text mt-1">协作管理平台</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            required
            className="w-full px-4 py-2.5 border border-garden-border rounded-lg bg-garden-card text-garden-text outline-none transition-[border-color] duration-300 focus:border-garden-focus"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'manager' | 'member')}
            className="w-full px-4 py-2.5 border border-garden-border rounded-lg bg-garden-card text-garden-text outline-none transition-[border-color] duration-300 focus:border-garden-focus"
          >
            <option value="manager">管理者</option>
            <option value="member">成员</option>
          </select>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 active:scale-100"
            style={{
              background: 'linear-gradient(135deg, #66BB6A, #43A047)',
            }}
          >
            <LogIn className="w-4 h-4" />
            登录
          </button>
        </form>
      </div>
    </div>
  )
}
