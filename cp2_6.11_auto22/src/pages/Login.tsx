import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Mail, Lock, LogIn, UserPlus } from "lucide-react"
import { useStore } from "@/store"

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const login = useStore((s) => s.login)
  const register = useStore((s) => s.register)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        await register(email, password)
      }
      navigate("/")
    } catch (err: any) {
      setError(err.message || "操作失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-base-900 to-base-800">
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-base-700/60 backdrop-blur-glass p-8 shadow-2xl">
        <h1 className="font-display text-3xl font-bold text-center mb-2 bg-gradient-to-r from-cyan-primary to-indigo-primary bg-clip-text text-transparent">
          声纹相簿
        </h1>
        <p className="text-center text-sm text-base-500 mb-8">
          {mode === "login" ? "登录你的账号" : "创建新账号"}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-base-600 bg-base-800/50 pl-10 pr-4 py-3 text-sm text-white placeholder:text-base-500 focus:border-cyan-primary focus:outline-none transition-colors duration-200"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-500" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-base-600 bg-base-800/50 pl-10 pr-4 py-3 text-sm text-white placeholder:text-base-500 focus:border-cyan-primary focus:outline-none transition-colors duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-primary to-indigo-primary text-white font-medium text-sm hover:brightness-110 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="spin-dots inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : mode === "login" ? (
              <>
                <LogIn className="w-4 h-4" /> 登录
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> 注册
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-base-500 mt-6">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login")
              setError("")
            }}
            className="ml-1 text-cyan-primary hover:underline"
          >
            {mode === "login" ? "立即注册" : "去登录"}
          </button>
        </p>
      </div>
    </div>
  )
}
