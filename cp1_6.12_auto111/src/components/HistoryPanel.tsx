import { useState, useMemo } from 'react';
import { diffWords } from 'diff';
import type { HistoryRecord } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  historyRecords: HistoryRecord[];
}

export default function HistoryPanel({
  isOpen,
  onClose,
  historyRecords
}: HistoryPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 2) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const diffResult = useMemo(() => {
    if (selectedIds.length !== 2) return null;
    const [id1, id2] = selectedIds;
    const record1 = historyRecords.find((r) => r._id === id1);
    const record2 = historyRecords.find((r) => r._id === id2);
    if (!record1 || !record2) return null;

    const older = new Date(record1.modifiedAt) < new Date(record2.modifiedAt) ? record1 : record2;
    const newer = new Date(record1.modifiedAt) < new Date(record2.modifiedAt) ? record2 : record1;

    const diffs = diffWords(older.newText, newer.newText);
    return { diffs, older, newer };
  }, [selectedIds, historyRecords]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: 300,
          backgroundColor: 'white',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          zIndex: 180,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>历史记录</h3>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: 'transparent',
              fontSize: 18,
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid var(--border-color)',
              fontSize: 12,
              color: '#666'
            }}
          >
            已选择 {selectedIds.length}/2 条记录进行对比
            {selectedIds.length === 2 && (
              <button
                onClick={() => setSelectedIds([])}
                style={{
                  marginLeft: 8,
                  padding: '2px 8px',
                  fontSize: 11,
                  borderRadius: 4,
                  backgroundColor: 'var(--primary-color)',
                  color: 'white'
                }}
              >
                清除
              </button>
            )}
          </div>
        )}

        {diffResult && (
          <div
            style={{
              padding: 16,
              margin: '12px 16px',
              backgroundColor: '#f8f9fa',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.6
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: '#666' }}>
              差异对比
            </p>
            <div>
              {diffResult.diffs.map((part, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: part.added
                      ? '#a6f3c1'
                      : part.removed
                      ? '#ffb3b3'
                      : 'transparent',
                    textDecoration: part.removed ? 'line-through' : 'none'
                  }}
                >
                  {part.value}
                </span>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px'
          }}
        >
          {historyRecords.length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                color: '#999',
                fontSize: 13,
                padding: '40px 0'
              }}
            >
              暂无修改记录
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {historyRecords.map((record) => (
                <div
                  key={record._id}
                  onClick={() => handleSelect(record._id)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: selectedIds.includes(record._id)
                      ? '2px solid var(--primary-color)'
                      : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'var(--transition-base)',
                    backgroundColor: selectedIds.includes(record._id)
                      ? 'rgba(192, 57, 43, 0.05)'
                      : 'white'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {record.modifiedBy}
                    </span>
                    <span style={{ fontSize: 11, color: '#999' }}>
                      {formatTime(record.modifiedAt)}
                    </span>
                  </div>

                  {record.oldText !== record.newText && (
                    <>
                      <p
                        style={{
                          fontSize: 12,
                          color: '#999',
                          textDecoration: 'line-through',
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {record.oldText || '(空)'}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--text-color)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {record.newText || '(空)'}
                      </p>
                    </>
                  )}

                  {record.oldCharacter !== record.newCharacter && (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      <span style={{ color: '#999' }}>角色变更：</span>
                      <span style={{ color: 'var(--secondary-color)' }}>
                        {record.oldCharacter} → {record.newCharacter}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 170,
            display: window.innerWidth <= 768 ? 'block' : 'none'
          }}
        />
      )}
    </>
  );
}
