import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { X } from '../icons';

interface QRModalProps {
  open: boolean;
  onClose: () => void;
  recordId: string | null;
  deviceName?: string;
  borrowTime?: string;
}

export default function QRModal({ open, onClose, recordId, deviceName, borrowTime }: QRModalProps) {
  if (!open || !recordId) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300"
      style={{ background: '#00000080' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 shadow-2xl flex flex-col items-center relative"
        style={{ padding: '24px', maxWidth: '360px', width: '90%' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
          aria-label="关闭"
        >
          <X width={20} height={20} />
        </button>

        <h3 className="text-lg font-semibold text-slate-800 mb-1">借用确认二维码</h3>
        <p className="text-xs text-slate-500 mb-5">请管理员扫描此二维码确认借用</p>

        <div
          className="rounded-xl border border-slate-200 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white"
          style={{ padding: '16px', marginBottom: '20px' }}
        >
          <QRCodeSVG
            value={recordId}
            size={256}
            level="H"
            includeMargin={false}
            fgColor="#1e293b"
          />
        </div>

        <div className="w-full space-y-2 text-sm">
          {deviceName && (
            <div className="flex justify-between">
              <span className="text-slate-500">设备名称:</span>
              <span className="text-slate-800 font-medium truncate ml-2 max-w-[180px]">{deviceName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">记录编号:</span>
            <span className="text-slate-800 font-mono text-xs">{recordId}</span>
          </div>
          {borrowTime && (
            <div className="flex justify-between">
              <span className="text-slate-500">借用时间:</span>
              <span className="text-slate-800">{dayjs(borrowTime).format('YYYY-MM-DD HH:mm')}</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full h-11 rounded-lg text-white text-sm font-medium transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
          style={{ background: '#1e293b' }}
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
