import { QRCodeCanvas } from 'qrcode.react';
import dayjs from 'dayjs';
import type { BorrowRecord } from '../types';

interface Props {
  record: BorrowRecord | null;
  deviceName?: string;
  onClose: () => void;
}

export default function QRCodeModal({ record, deviceName, onClose }: Props) {
  if (!record) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <button className="modal-close" onClick={onClose}>×</button>

        <h2 className="modal-title" style={{ textAlign: 'center' }}>🎉 借用成功</h2>
        <p className="modal-description" style={{ textAlign: 'center' }}>
          请向管理员出示以下二维码完成借用确认
        </p>

        <div className="qr-container">
          <QRCodeCanvas
            value={record.id}
            size={256}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#1e293b"
          />
          <div className="qr-info">
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              {deviceName}
            </div>
            <div className="qr-record-id">
              记录ID: {record.id}
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'var(--bg-primary)',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>借用时间</span>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
              {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>归还期限</span>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--accent-blue)' }}>
              {dayjs(record.expectedReturnTime).format('YYYY-MM-DD HH:mm')}
            </span>
          </div>
        </div>

        <div className="record-hint">
          💡 超时归还将扣除 5 信用分，按时归还 +1 信用分
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
