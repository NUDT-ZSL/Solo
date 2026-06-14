import { useState } from 'react';
import type { PublishRecord } from '../types';
import { formatFullTime, getStatusLabel } from '../utils';

interface PublishHistoryModalProps {
  records: PublishRecord[];
  onClose: () => void;
}

function PublishHistoryModal({ records, onClose }: PublishHistoryModalProps) {
  const [selectedRecord, setSelectedRecord] = useState<PublishRecord | null>(null);

  const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 分发历史记录</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {selectedRecord ? (
            <div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  marginBottom: 12,
                  padding: '4px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: 4,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#495057'
                }}
              >
                ← 返回列表
              </button>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{selectedRecord.platformName}</span>
                  <span className={`status-tag ${selectedRecord.status}`}>
                    {getStatusLabel(selectedRecord.status)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 8 }}>
                  分发时间：{formatFullTime(selectedRecord.timestamp)}
                </div>
                {selectedRecord.errorMessage && (
                  <div style={{ 
                    fontSize: 13, 
                    color: '#842029', 
                    backgroundColor: '#f8d7da',
                    padding: '8px 12px',
                    borderRadius: 6,
                    marginBottom: 12
                  }}>
                    ⚠ 错误信息：{selectedRecord.errorMessage}
                  </div>
                )}
              </div>
              
              <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: '#495057' }}>
                格式化内容预览
              </div>
              <div className="preview-content">
                {selectedRecord.formattedContent}
              </div>
            </div>
          ) : (
            <div>
              {sortedRecords.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 40, 
                  color: '#adb5bd' 
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
                  <p>暂无分发记录</p>
                </div>
              ) : (
                sortedRecords.map((record, idx) => (
                  <div 
                    key={idx}
                    className="publish-history-item"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`status-tag ${record.status}`}>
                        {getStatusLabel(record.status)}
                      </span>
                      <span className="publish-history-platform">
                        {record.platformName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="publish-history-time">
                        {formatFullTime(record.timestamp)}
                      </span>
                      <span style={{ color: '#adb5bd', fontSize: 14 }}>→</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PublishHistoryModal;
