import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { UserDetail } from '../types';
import { RECORD_STATUS_CONFIG } from '../types';
import { getUserById } from '../api/borrowApi';
import CreditProgress from '../components/CreditProgress';
import { Calendar, Shield, AlertTriangle, CheckCircle, Clock } from '../icons';

interface ProfileProps {
  userId: string;
}

export default function Profile({ userId }: ProfileProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getUserById(userId)
      .then(data => setUser(data))
      .catch(err => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-1 bg-white rounded-xl p-6 animate-pulse space-y-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto" />
            <div className="h-4 w-20 bg-slate-100 rounded mx-auto" />
            <div className="w-28 h-28 bg-slate-100 rounded-full mx-auto mt-6" />
          </div>
          <div className="col-span-2 bg-white rounded-xl p-6 animate-pulse space-y-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="h-5 w-40 bg-slate-100 rounded mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 animate-pulse space-y-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="h-6 w-32 bg-slate-100 rounded mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p style={{ color: '#ef4444' }} className="text-sm">{error || '用户不存在'}</p>
      </div>
    );
  }

  const borrowedCount = user.borrowHistory.filter(r => r.status === 'borrowing').length;
  const onTimeCount = user.borrowHistory.filter(r => r.status === 'returned_on_time').length;
  const overdueCount = user.borrowHistory.filter(r => r.status === 'returned_overdue').length;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">我的档案</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          className="bg-white rounded-xl p-6 flex flex-col items-center text-center"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <div
            className="w-[60px] h-[60px] rounded-full overflow-hidden mb-4 flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{
              border: '2px solid #e5e7eb',
              background: 'linear-gradient(135deg, #3b82f6, #818cf8)'
            }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) parent.textContent = user.name.charAt(0);
                }}
              />
            ) : (
              user.name.charAt(0)
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">{user.name}</h2>
          <p className="text-xs text-slate-400 mb-6">{user.id}</p>

          <CreditProgress score={user.creditScore} size={120} strokeWidth={10} />

          <div className="w-full mt-6 space-y-2 text-xs">
            {user.creditScore >= 80 ? (
              <div className="flex items-center justify-center gap-1.5" style={{ color: '#22c55e' }}>
                <CheckCircle width={14} height={14} />
                <span className="font-medium">信用优秀</span>
              </div>
            ) : user.creditScore >= 60 ? (
              <div className="flex items-center justify-center gap-1.5" style={{ color: '#eab308' }}>
                <Clock width={14} height={14} />
                <span className="font-medium">信用良好，请保持</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5" style={{ color: '#ef4444' }}>
                <AlertTriangle width={14} height={14} />
                <span className="font-medium">信用偏低，请注意</span>
              </div>
            )}
          </div>
        </div>

        <div
          className="md:col-span-2 bg-white rounded-xl p-6"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
            <Shield width={16} height={16} style={{ color: '#64748b' }} />
            借用统计
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div
              className="p-4 rounded-xl text-center"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <div className="text-3xl font-bold mb-1" style={{ color: '#16a34a' }}>{user.borrowHistory.length}</div>
              <div className="text-xs" style={{ color: '#15803d' }}>总借用次数</div>
            </div>
            <div
              className="p-4 rounded-xl text-center"
              style={{ background: '#fefce8', border: '1px solid #fde68a' }}
            >
              <div className="text-3xl font-bold mb-1" style={{ color: '#ca8a04' }}>{borrowedCount}</div>
              <div className="text-xs" style={{ color: '#a16207' }}>正在借用</div>
            </div>
            <div
              className="p-4 rounded-xl text-center"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
            >
              <div className="text-3xl font-bold mb-1" style={{ color: '#2563eb' }}>{onTimeCount}</div>
              <div className="text-xs" style={{ color: '#1d4ed8' }}>按时归还</div>
            </div>
            <div
              className="p-4 rounded-xl text-center"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <div className="text-3xl font-bold mb-1" style={{ color: '#dc2626' }}>{overdueCount}</div>
              <div className="text-xs" style={{ color: '#b91c1c' }}>超时归还</div>
            </div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="text-xs text-slate-500 mb-2">信用规则说明</div>
            <ul className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <li>• 初始信用分为 100 分</li>
              <li>• 按时归还：<span className="font-semibold" style={{ color: '#16a34a' }}>+1分</span>（24小时内归还视为按时）</li>
              <li>• 超时归还：<span className="font-semibold" style={{ color: '#dc2626' }}>-5分</span></li>
              <li>• 信用分低于80分，无法借用要求≥80分的设备</li>
            </ul>
          </div>
        </div>
      </div>

      <div
        className="bg-white rounded-xl p-6"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        <h3 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
          <Calendar width={16} height={16} style={{ color: '#64748b' }} />
          借用历史记录
        </h3>

        {user.borrowHistory.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            暂无借用记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 pl-3 pr-2 font-medium whitespace-nowrap">设备名称</th>
                  <th className="pb-3 px-2 font-medium whitespace-nowrap">借用时间</th>
                  <th className="pb-3 px-2 font-medium whitespace-nowrap">归还时间</th>
                  <th className="pb-3 pr-3 pl-2 font-medium whitespace-nowrap">状态</th>
                </tr>
              </thead>
              <tbody>
                {user.borrowHistory.map(record => {
                  const rs = RECORD_STATUS_CONFIG[record.status];
                  return (
                    <tr key={record.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-3 pr-2 font-medium text-slate-700">{record.deviceName}</td>
                      <td className="py-4 px-2 text-slate-600 whitespace-nowrap">
                        {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                      </td>
                      <td className="py-4 px-2 text-slate-600 whitespace-nowrap">
                        {record.returnTime
                          ? dayjs(record.returnTime).format('YYYY-MM-DD HH:mm')
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-4 pr-3 pl-2">
                        <span
                          className="inline-block px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap"
                          style={{ background: rs.bgColor, color: rs.color }}
                        >
                          {rs.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
