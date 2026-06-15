import { useState, useMemo } from 'react';
import { marked } from 'marked';
import type { PublishRecord } from '../types';
import { formatFullTime, getStatusLabel } from '../utils';

interface PublishHistoryModalProps {
  records: PublishRecord[];
  onClose: () => void;
}

function PublishHistoryModal({ records, onClose }: PublishHistoryModalProps) {
  const [selectedRecord, setSelectedRecord] = useState<PublishRecord | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.timestamp - a.timestamp);
  }, [records]);

  const renderMarkdown = (content: string) => {
    try {
      return { __html: marked.parse(content) as string };
    } catch {
      return { __html: content };
    }
  };

  const groupedRecords = useMemo(() => {
    const map = new Map<string, PublishRecord>();
    for (const record of sortedRecords) {
      const key = record.platformId;
      if (!map.has(key)) {
        map.set(key, record);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [sortedRecords]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ width: 620 }}
      >
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
                  marginBottom: 16,
                  padding: '6px 14px',
                  border: '1px solid #dee2e6',
                  borderRadius: 6,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#495057'
                }}
              >
                ← 返回列表
              </button>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  marginBottom: 10,
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#212529' }}>
                    {selectedRecord.platformName}
                  </span>
                  <span className={`status-tag ${selectedRecord.status}`}>
                    {getStatusLabel(selectedRecord.status)}
                  </span>
                </div>
                <div style={{ 
                  fontSize: 13, 
                  color: '#6c757d', 
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <span>分发时间：{formatFullTime(selectedRecord.timestamp)}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setViewMode('preview')}
                      style={{
                        padding: '3px 10px',
                        border: viewMode === 'preview' ? '1px solid #0d6efd' : '1px solid #dee2e6',
                        borderRadius: 4,
                        backgroundColor: viewMode === 'preview' ? '#e7f1ff' : 'transparent',
                        color: viewMode === 'preview' ? '#0d6efd' : '#6c757d',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      渲染预览
                    </button>
                    <button
                      onClick={() => setViewMode('raw')}
                      style={{
                        padding: '3px 10px',
                        border: viewMode === 'raw' ? '1px solid #0d6efd' : '1px solid #dee2e6',
                        borderRadius: 4,
                        backgroundColor: viewMode === 'raw' ? '#e7f1ff' : 'transparent',
                        color: viewMode === 'raw' ? '#0d6efd' : '#6c757d',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      原始文本
                    </button>
                  </div>
                </div>
                {selectedRecord.errorMessage && (
                  <div style={{ 
                    fontSize: 13, 
                    color: '#842029', 
                    backgroundColor: '#f8d7da',
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 14
                  }}>
                    ⚠ 错误信息：{selectedRecord.errorMessage}
                  </div>
                )}
              </div>
              
              <div style={{ 
                marginBottom: 8, 
                fontSize: 13, 
                fontWeight: 600, 
                color: '#495057' 
              }}>
                格式化后内容
              </div>
              
              {viewMode === 'preview' ? (
                <div 
                  className="markdown-preview"
                  dangerouslySetInnerHTML={renderMarkdown(selectedRecord.formattedContent)}
                />
              ) : (
                <div className="preview-content">
                  {selectedRecord.formattedContent}
                </div>
              )}
            </div>
          ) : (
            <div>
              {sortedRecords.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 50, 
                  color: '#adb5bd' 
                }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
                  <p style={{ fontSize: 15, marginBottom: 6 }}>暂无分发记录</p>
                  <p style={{ fontSize: 12, color: '#ced4da' }}>点击"一键分发"按钮开始分发</p>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    fontSize: 13, 
                    color: '#6c757d', 
                    marginBottom: 12,
                    padding: '8px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: 6
                  }}>
                    共 {sortedRecords.length} 条分发记录
                  </div>
                  
                  {groupedRecords.map((record, idx) => (
                    <div 
                      key={idx}
                      className="publish-history-item"
                      onClick={() => setSelectedRecord(record)}
                      style={{ padding: 14, marginBottom: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={`status-tag ${record.status}`}>
                          {getStatusLabel(record.status)}
                        </span>
                        <span className="publish-history-platform" style={{ fontSize: 14, fontWeight: 500 }}>
                          {record.platformName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="publish-history-time" style={{ fontSize: 12 }}>
                          {formatFullTime(record.timestamp)}
                        </span>
                        <span style={{ color: '#adb5bd', fontSize: 14 }}>→</span>
                      </div>
                    </div>
                  ))}
                  
                  {sortedRecords.length !== groupedRecords.length && (
                    <div style={{ 
                      fontSize: 11, 
                      color: '#adb5bd', 
                      textAlign: 'center',
                      marginTop: 12
                    }}>
                      仅显示每个平台最新一条记录
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PublishHistoryModal;
