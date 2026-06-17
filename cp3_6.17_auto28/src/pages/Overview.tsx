import { useMemo, useState } from 'react';
import { useBorrow } from '../hooks/useBorrow';
import DeviceCard from '../components/DeviceCard';
import QRModal from '../components/QRModal';
import { Shield, AlertTriangle } from '../icons';
import type { Device } from '../types';

interface OverviewProps {
  userId: string;
  userCreditScore: number;
  userName: string;
}

const PAGE_SIZE = 20;

export default function Overview({ userId, userCreditScore, userName }: OverviewProps) {
  const { loading, error, data, borrow } = useBorrow();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrRecordId, setQrRecordId] = useState<string | null>(null);
  const [qrDeviceName, setQrDeviceName] = useState('');
  const [page, setPage] = useState(1);

  const pagedDevices = useMemo<Device[]>(() => {
    const start = (page - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  const handleBorrowSuccess = (recordId: string) => {
    const device = data.find(d => {
      const rec = (useBorrow as unknown as { borrowResult?: { deviceId: string } }).borrowResult;
      return rec ? d.id === rec.deviceId : false;
    });
    const borrowedDevice = data.find(d => {
      const match = (document.querySelectorAll('[data-borrow-check]'));
      if (match) return false;
      return false;
    });
    if (borrowedDevice) {
      setQrDeviceName(borrowedDevice.name);
    } else {
      setQrDeviceName(data.find(d => d.status === 'borrowed')?.name || '');
    }
    setQrRecordId(recordId);
    setQrOpen(true);
  };

  const borrowFn = async (deviceId: string, uid: string) => {
    const result = await borrow(deviceId, uid);
    if (result) {
      const dev = data.find(d => d.id === deviceId);
      if (dev) setQrDeviceName(dev.name);
    }
    return result;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">设备总览</h1>
            <p className="text-sm text-slate-500">
              欢迎回来，<span className="font-medium text-slate-700">{userName}</span>。
              下方是共享办公空间的所有可借设备，请按需使用。
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <Shield
              width={18}
              height={18}
              style={{ color: userCreditScore >= 80 ? '#22c55e' : userCreditScore >= 60 ? '#eab308' : '#ef4444' }}
            />
            <div className="text-sm">
              <div className="text-slate-400 text-xs">我的信用分</div>
              <div className="font-bold text-slate-800">{userCreditScore}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 max-w-2xl">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-xs text-slate-400 mb-1">设备总数</div>
            <div className="text-2xl font-bold text-slate-800">{data.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-xs text-slate-400 mb-1">当前可借</div>
            <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>
              {data.filter(d => d.status === 'available').length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-xs text-slate-400 mb-1">维修中</div>
            <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>
              {data.filter(d => d.status === 'maintenance').length}
            </div>
          </div>
        </div>
      </div>

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl overflow-hidden animate-pulse"
              style={{ width: '100%', maxWidth: '240px', height: '320px', margin: '0 auto' }}
            >
              <div className="h-40 bg-slate-100" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-9 w-full bg-slate-100 rounded-lg mt-8" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              maxWidth: '100%'
            }}
          >
            {pagedDevices.map(device => (
              <div key={device.id} data-borrow-check style={{ display: 'flex', justifyContent: 'center' }}>
                <DeviceCard
                  device={device}
                  userId={userId}
                  userCreditScore={userCreditScore}
                  onBorrowSuccess={handleBorrowSuccess}
                  borrowFn={borrowFn}
                />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 h-9 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
              >
                上一页
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className="w-9 h-9 rounded-lg text-sm font-medium transition-all duration-300"
                  style={{
                    background: page === i + 1 ? '#1e293b' : '#ffffff',
                    color: page === i + 1 ? '#ffffff' : '#475569',
                    border: page === i + 1 ? 'none' : '1px solid #e2e8f0'
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 h-9 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      <QRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        recordId={qrRecordId}
        deviceName={qrDeviceName}
        borrowTime={new Date().toISOString()}
      />
    </div>
  );
}
