import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { DeviceDetail } from '../types';
import { STATUS_CONFIG, RECORD_STATUS_CONFIG } from '../types';
import { getDeviceById, submitBorrow } from '../api/borrowApi';
import { ChevronLeft, Lock, AlertTriangle, User, Calendar, Clock } from '../icons';
import ConfirmModal from '../components/ConfirmModal';
import QRModal from '../components/QRModal';

interface DeviceDetailPageProps {
  userId: string;
  userCreditScore: number;
}

export default function DeviceDetail({ userId, userCreditScore }: DeviceDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrRecordId, setQrRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getDeviceById(id)
      .then(data => setDevice(data))
      .catch(err => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const statusCfg = device ? STATUS_CONFIG[device.status] : null;
  const isAvailable = device?.status === 'available';
  const creditSatisfied = device ? userCreditScore >= device.creditRequirement : false;
  const canBorrow = isAvailable && creditSatisfied;

  const handleConfirm = async () => {
    if (!device) return;
    setProcessing(true);
    try {
      const record = await submitBorrow(device.id, userId);
      setQrRecordId(record.id);
      setProcessing(false);
      setConfirmOpen(false);
      setQrOpen(true);
      const updated = await getDeviceById(device.id);
      setDevice(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '借用失败');
      setProcessing(false);
      setConfirmOpen(false);
    }
  };

  const handleQrClose = () => {
    setQrOpen(false);
    navigate('/overview');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-slate-100 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80 bg-slate-100 rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 bg-slate-100 rounded" />
              <div className="h-6 w-24 bg-slate-100 rounded" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-5 bg-slate-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p style={{ color: '#ef4444' }} className="text-sm">{error || '设备不存在'}</p>
        <button
          onClick={() => navigate('/overview')}
          className="mt-4 px-5 h-10 rounded-lg text-sm font-medium text-white"
          style={{ background: '#1e293b' }}
        >
          返回总览
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/overview')}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors duration-300"
        style={{ color: '#64748b' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#1e293b')}
        onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
      >
        <ChevronLeft width={18} height={18} />
        返回设备总览
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div
          className="bg-white rounded-xl overflow-hidden"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <div className="bg-slate-100">
            <img
              src={device.imageUrl}
              alt={device.name}
              className="w-full h-auto object-cover"
              style={{ borderRadius: '8px' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="%23f1f5f9" width="600" height="400"/><text x="50%25" y="50%25" text-anchor="middle" fill="%2394a3b8" font-size="20" dy=".3em">设备图片</text></svg>';
              }}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">{device.name}</h1>
            {statusCfg && (
              <div
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0"
                style={{ background: statusCfg.bgColor, color: statusCfg.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: statusCfg.color }} />
                {statusCfg.label}
              </div>
            )}
          </div>

          <div
            className="inline-flex self-start px-2.5 py-1 rounded text-xs font-medium mb-5"
            style={{ background: '#f1f5f9', color: '#475569' }}
          >
            {device.type}
          </div>

          <div className="space-y-4 mb-8 flex-1">
            <div
              className="p-5 rounded-xl"
              style={{ background: '#fefce8', border: '1px solid #fde68a' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Lock width={16} height={16} style={{ color: '#ca8a04' }} />
                <span className="text-sm font-semibold text-amber-700">最低信用分要求</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-amber-800">{device.creditRequirement}</span>
                <div className="text-xs">
                  <div style={{ color: creditSatisfied ? '#16a34a' : '#dc2626' }}>
                    您的信用分: {userCreditScore}
                  </div>
                  <div className="text-slate-500">
                    {creditSatisfied ? '✓ 已满足借用条件' : '✗ 信用分不足，无法借用'}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="p-5 rounded-xl bg-white"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <h3 className="text-sm font-semibold text-slate-700 mb-3">技术参数</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {Object.entries(device.specs).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <div className="text-slate-400">{key}</div>
                    <div className="text-slate-700 font-medium mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!isAvailable ? (
            <button
              disabled
              className="w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: '#94a3b8', color: '#ffffff', cursor: 'not-allowed', opacity: 0.7 }}
            >
              <AlertTriangle width={16} height={16} />
              设备当前不可借
            </button>
          ) : !creditSatisfied ? (
            <div className="space-y-2">
              <button
                disabled
                className="w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: '#94a3b8', color: '#ffffff', cursor: 'not-allowed' }}
              >
                <Lock width={16} height={16} />
                信用分不足
              </button>
              <p className="text-xs text-center" style={{ color: '#ef4444' }}>
                您的信用分 {userCreditScore} 低于本设备要求的 {device.creditRequirement}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white transition-all duration-300 active:scale-[0.99]"
              style={{ background: '#1e293b' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
            >
              立即借用
            </button>
          )}
        </div>
      </div>

      <div
        className="bg-white rounded-xl p-6"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Clock width={18} height={18} style={{ color: '#64748b' }} />
          历史借用记录
        </h2>

        {device.borrowHistory.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            暂无借用记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-3 pl-3 font-medium">借用人</th>
                  <th className="pb-3 font-medium">借用时间</th>
                  <th className="pb-3 font-medium">归还时间</th>
                  <th className="pb-3 pr-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {device.borrowHistory.map(record => {
                  const rs = RECORD_STATUS_CONFIG[record.status];
                  return (
                    <tr key={record.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-4 pl-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                            style={{ background: 'linear-gradient(135deg, #60a5fa, #818cf8)' }}
                          >
                            {record.userInitial}
                          </div>
                          <div>
                            <div className="font-medium text-slate-700">{record.userName}</div>
                            <div className="text-xs text-slate-400">
                              <User width={10} height={10} />
                              {record.userId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar width={14} height={14} />
                          {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </td>
                      <td className="py-4">
                        {record.returnTime ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar width={14} height={14} />
                            {dayjs(record.returnTime).format('YYYY-MM-DD HH:mm')}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-4 pr-3">
                        <span
                          className="inline-block px-2.5 py-1 rounded text-xs font-medium"
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

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        loading={processing}
        title="确认借用"
        message={`您确定要借用「${device.name}」吗？请在24小时内归还，否则将扣除5点信用分。`}
        confirmText="确认借用"
      />

      <QRModal
        open={qrOpen}
        onClose={handleQrClose}
        recordId={qrRecordId}
        deviceName={device.name}
        borrowTime={new Date().toISOString()}
      />
    </div>
  );
}
