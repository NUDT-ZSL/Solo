import React from 'react';
import type { Device } from '../types';

interface Props {
  device: Device;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function BorrowConfirmModal({ device, onConfirm, onCancel, loading }: Props) {
  const statusText = device.status === 'available' ? '空闲中' : device.status === 'borrowed' ? '已借出' : '维修中';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>×</button>

        <h2 className="modal-title">确认借用</h2>
        <p className="modal-description">请确认以下设备信息，确认后将生成借用记录</p>

        <div style={{
          display: 'flex',
          gap: '20px',
          padding: '20px',
          background: 'var(--bg-primary)',
          borderRadius: '12px'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
            background: '#e2e8f0'
          }}>
            <img
              src={device.imageUrl}
              alt={device.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>
              {device.type} · <span style={{ color: statusText === '空闲中' ? 'var(--success)' : statusText === '已借出' ? 'var(--warning)' : 'var(--danger)' }}>{statusText}</span>
            </div>
            <h3 style={{
              fontSize: '17px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '10px',
              lineHeight: '1.3'
            }}>
              {device.name}
            </h3>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}>
              最低信用分要求：<strong style={{ color: 'var(--text-primary)' }}>{device.minCreditScore} 分</strong>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '12px 16px',
          background: 'rgba(59, 130, 246, 0.08)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--accent-blue)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⏱️</span>
          <span>借用时长为 24 小时，请按时归还以免影响您的信用评分</span>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '16px', height: '16px' }}></span> : '确认借用'}
          </button>
        </div>
      </div>
    </div>
  );
}
