import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import type { BorrowRecordWithDetails } from '../types';
import { RECORD_STATUS_CONFIG } from '../types';
import { getAllRecords, confirmReturn } from '../api/borrowApi';
import { Clock, User, Shield, CheckCircle, RefreshCw, AlertTriangle } from '../icons';
import ConfirmModal from '../components/ConfirmModal';

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<BorrowRecordWithDetails[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetRecord, setTargetRecord] = useState<BorrowRecordWithDetails | null>(null);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'borrowing' | 'returned'>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRecords();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const handleReturnClick = (record: BorrowRecordWithDetails) => {
    setTargetRecord(record);
    setConfirmOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!targetRecord) return;
    setProcessing(true);
    try {
      const result = await confirmReturn(targetRecord.id);
      setProcessing(false);
      setConfirmOpen(false);
      setTargetRecord(null);
      if (result.success) {
        const sign = result.creditChanged >= 0 ? '+' : '';
        showToast('success', `归还成功！信用分${sign}${result.creditChanged}`);
        await loadRecords();
      }
    } catch (err) {
      setProcessing(false);
      setConfirmOpen(false);
      showToast('error', err instanceof Error ? err.message : '归还失败');
    }
  };

  const filteredRecords = records.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'borrowing') return r.status === 'borrowing';
    return r.status !== 'borrowing';
  });

  const borrowingCount = records.filter(r => r.status === 'borrowing').length;
  const returnedCount = records.filter(r => r.status !== 'borrowing').length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">管理面板</h1>
          <p className="text-sm text-slate-500">查看所有借用记录，标记设备归还</p>
        </div>
        <button
          onClick={loadRecords}
          className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-300"
        >
          <RefreshCw width={14} height={14} />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Clock width={14} height={14} />
            <span>全部记录</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{records.length}</div>
        </div>
        <div
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Shield width={14} height={14} />
            <span>借用中</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#dc2626' }}>{borrowingCount}</div>
        </div>
        <div
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <CheckCircle width={14} height={14} />
            <span>已归还</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#16a34a' }}>{returnedCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {([
          { key: 'all', label: '全部' },
          { key: 'borrowing', label: '借用中' },
          { key: 'returned', label: '已归还' }
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-4 h-9 rounded-lg text-sm font-medium transition-all duration-300"
            style={{
              background: filter === f.key ? '#1e293b' : '#ffffff',
              color: filter === f.key ? '#ffffff' : '#475569',
              border: filter === f.key ? 'none' : '1px solid #e2e8f0'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {toast && (
        <div
          className="fixed top-20 right-6 z-[200] px-5 py-3 rounded-xl shadow-lg text-sm text-white animate-[fadeIn_.3s_ease]"
          style={{ background: toast.type === 'success' ? '#16a34a' : '#dc2626' }}
        >
          {toast.msg}
        </div>
      )}

      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
        >
          <AlertTriangle width={20} height={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div
          className="bg-white rounded-xl p-6 animate-pulse space-y-4"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded" />
          ))}
        </div>
      ) : (
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          {filteredRecords.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-400">
              暂无记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: '#f8fafc' }}>
                  <tr className="text-left text-slate-400">
                    <th className="px-5 py-3.5 font-medium whitespace-nowrap">设备</th>
                    <th className="px-5 py-3.5 font-medium whitespace-nowrap">借用人</th>
                    <th className="px-5 py-3.5 font-medium whitespace-nowrap">借用时间</th>
                    <th className="px-5 py-3.5 font-medium whitespace-nowrap">归还时间</th>
                    <th className="px-5 py-3.5 font-medium whitespace-nowrap">状态</th>
                    <th className="px-5 py-3.5 font-medium whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(record => {
                    const rs = RECORD_STATUS_CONFIG[record.status];
                    const isBorrowing = record.status === 'borrowing';
                    const borrowHours = isBorrowing
                      ? (Date.now() - new Date(record.borrowTime).getTime()) / (1000 * 60 * 60)
                      : 0;
                    const isOverdueWarning = isBorrowing && borrowHours > 12;

                    return (
                      <tr
                        key={record.id}
                        className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-700 max-w-[220px] truncate">
                            {record.deviceName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{record.deviceId}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                              style={{ background: 'linear-gradient(135deg, #60a5fa, #818cf8)' }}
                            >
                              {record.userInitial}
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1.5">
                                {record.userName}
                                <User width={12} height={12} className="text-slate-300" />
                              </div>
                              <div className="text-xs text-slate-400">{record.userId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                          {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {record.returnTime
                            ? <span className="text-slate-600">{dayjs(record.returnTime).format('YYYY-MM-DD HH:mm')}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap"
                              style={{ background: rs.bgColor, color: rs.color }}
                            >
                              {rs.label}
                            </span>
                            {isOverdueWarning && (
                              <span
                                className="text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap flex items-center gap-1"
                                style={{ background: '#fef2f2', color: '#dc2626' }}
                                title="借用超过12小时，可能即将超时"
                              >
                                <AlertTriangle width={10} height={10} />
                                借用{borrowHours.toFixed(1)}h
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {isBorrowing ? (
                            <button
                              onClick={() => handleReturnClick(record)}
                              className="px-4 h-9 rounded-lg text-xs font-semibold text-white transition-all duration-300 active:scale-[0.98]"
                              style={{ background: '#1e293b' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
                            >
                              标记归还
                            </button>
                          ) : (
                            <CheckCircle width={18} height={18} style={{ color: '#22c55e' }} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setTargetRecord(null);
        }}
        onConfirm={handleConfirmReturn}
        loading={processing}
        title="确认归还"
        message={
          targetRecord
            ? `确认「${targetRecord.deviceName}」已归还？系统将根据借用时长更新借用人的信用分。`
            : ''
        }
        confirmText="确认归还"
      />
    </div>
  );
}
