import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Device } from '../types';
import { STATUS_CONFIG } from '../types';
import { Lock, AlertTriangle, ArrowRight } from '../icons';
import ConfirmModal from './ConfirmModal';

interface DeviceCardProps {
  device: Device;
  userId: string;
  userCreditScore: number;
  onBorrowSuccess: (recordId: string) => void;
  borrowFn: (deviceId: string, userId: string) => Promise<{ id: string } | null>;
}

export default function DeviceCard({
  device,
  userId,
  userCreditScore,
  onBorrowSuccess,
  borrowFn
}: DeviceCardProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const statusCfg = STATUS_CONFIG[device.status];
  const isAvailable = device.status === 'available';
  const creditSatisfied = userCreditScore >= device.creditRequirement;
  const canBorrow = isAvailable && creditSatisfied;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-action]')) return;
    navigate(`/device/${device.id}`);
  };

  const handleBorrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canBorrow) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setProcessing(true);
    const result = await borrowFn(device.id, userId);
    setProcessing(false);
    setConfirmOpen(false);
    if (result) {
      onBorrowSuccess(result.id);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-white rounded-xl overflow-hidden cursor-pointer group flex flex-col transition-all duration-300"
        style={{
          width: '100%',
          maxWidth: '240px',
          height: '320px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          margin: '0 auto'
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }}
      >
        <div className="relative w-full h-40 bg-slate-100 overflow-hidden">
          <img
            src={device.imageUrl}
            alt={device.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect fill="%23f1f5f9" width="240" height="160"/><text x="50%25" y="50%25" text-anchor="middle" fill="%2394a3b8" font-size="14" dy=".3em">设备图片</text></svg>';
            }}
          />
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
            style={{ background: statusCfg.bgColor, color: statusCfg.color }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusCfg.color }}
            />
            {statusCfg.label}
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <div
            className="inline-flex self-start px-2 py-0.5 rounded text-[11px] font-medium mb-2"
            style={{ background: '#f1f5f9', color: '#475569' }}
          >
            {device.type}
          </div>

          <h3
            className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug mb-1.5"
            title={device.name}
          >
            {device.name}
          </h3>

          <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <span>信用分 ≥ {device.creditRequirement}</span>
          </div>

          <div className="mt-auto space-y-2">
            {!isAvailable ? (
              <button
                disabled
                data-action
                className="w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                style={{ background: '#94a3b8', color: '#ffffff', cursor: 'not-allowed', opacity: 0.7 }}
              >
                <AlertTriangle width={14} height={14} />
                设备当前不可借
              </button>
            ) : !creditSatisfied ? (
              <div className="space-y-1.5">
                <button
                  disabled
                  data-action
                  className="w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                  style={{ background: '#94a3b8', color: '#ffffff', cursor: 'not-allowed' }}
                >
                  <Lock width={14} height={14} />
                  信用分不足
                </button>
                <p className="text-[11px] text-center" style={{ color: '#ef4444' }}>
                  您的信用分 {userCreditScore} < {device.creditRequirement}
                </p>
              </div>
            ) : (
              <button
                data-action
                onClick={handleBorrowClick}
                className="w-full h-9 rounded-lg text-xs font-medium text-white transition-all duration-300 active:scale-[0.98]"
                style={{ background: '#1e293b' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
              >
                立即借用
              </button>
            )}

            <div
              data-action
              className="flex items-center justify-center gap-1 text-xs pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ color: '#64748b' }}
            >
              <span>查看详情</span>
              <ArrowRight width={12} height={12} />
            </div>
          </div>
        </div>
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
    </>
  );
}
