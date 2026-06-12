import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, User, Lock } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'reader' | 'admin'>('reader');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/users/login' : '/users/register';
      const { data } = await api.post(endpoint, {
        username,
        password,
        ...(isLogin ? {} : { role }),
      });

      if (data.success) {
        setAuth(data.user, data.token);
        navigate('/books');
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: '#F5E6CA',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(92, 64, 51, 0.03) 2px, rgba(92, 64, 51, 0.03) 4px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#8B4513] rounded-full mb-4">
            <BookOpen size={40} className="text-[#F5E6CA]" />
          </div>
          <h1 className="text-3xl font-bold text-[#5C4033]">社区图书馆</h1>
          <p className="text-[#8B7355] mt-2">在线借阅与预约系统</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                isLogin
                  ? 'text-[#8B4513] border-b-2 border-[#8B4513]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                !isLogin
                  ? 'text-[#8B4513] border-b-2 border-[#8B4513]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              注册
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1">
                用户名
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B4513]/30 focus:border-[#8B4513] outline-none transition-all"
                  placeholder="请输入用户名"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1">
                密码
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B4513]/30 focus:border-[#8B4513] outline-none transition-all"
                  placeholder="请输入密码"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1">
                  角色
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="reader"
                      checked={role === 'reader'}
                      onChange={() => setRole('reader')}
                      className="text-[#8B4513]"
                    />
                    <span className="text-[#5C4033]">读者</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="admin"
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      className="text-[#8B4513]"
                    />
                    <span className="text-[#5C4033]">管理员</span>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B4513] hover:bg-[#6B3410] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : isLogin ? '登录' : '注册'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isLogin ? '还没有账号？' : '已有账号？'}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-[#8B4513] hover:underline ml-1"
            >
              {isLogin ? '立即注册' : '去登录'}
            </button>
          </p>

          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            <p>测试账号: reader / reader123 (读者)</p>
            <p>测试账号: admin / admin123 (管理员)</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
