import React, { useState } from 'react';

interface AddStudentFormProps {
  onAdd: (name?: string) => void;
  onRemove: (id: string) => void;
  onForceStuck: (id: string) => void;
  onForceUnstuck: (id: string) => void;
  studentIds: string[];
}

const AddStudentForm: React.FC<AddStudentFormProps> = React.memo(({
  onAdd,
  onRemove,
  onForceStuck,
  onForceUnstuck,
  studentIds,
}) => {
  const [newName, setNewName] = useState('');
  const [removeId, setRemoveId] = useState('');
  const [stuckId, setStuckId] = useState('');
  const [showPanel, setShowPanel] = useState(false);

  const handleAdd = () => {
    if (newName.trim().length >= 2 && newName.trim().length <= 4) {
      onAdd(newName.trim());
      setNewName('');
    } else {
      onAdd();
      setNewName('');
    }
  };

  const handleForceStuck = () => {
    if (stuckId.trim()) {
      onForceStuck(stuckId.trim());
      setStuckId('');
    }
  };

  const handleForceUnstuck = () => {
    if (stuckId.trim()) {
      onForceUnstuck(stuckId.trim());
      setStuckId('');
    }
  };

  const handleRemove = () => {
    if (removeId.trim()) {
      onRemove(removeId.trim());
      setRemoveId('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 500,
    }}>
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '1px solid #00D4FF',
            background: 'rgba(0, 212, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#00D4FF',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0, 212, 255, 0.3)',
          }}
        >
          +
        </button>
      )}

      {showPanel && (
        <div style={{
          background: 'rgba(43, 43, 61, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid #00D4FF',
          padding: '16px',
          width: '300px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{ color: '#E0E0E0', fontSize: '14px', fontWeight: 600 }}>管理考生</span>
            <button
              onClick={() => setShowPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="姓名(2-4字,留空自动)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={4}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  background: 'rgba(30, 30, 46, 0.8)',
                  color: '#E0E0E0',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAdd}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #00D4FF',
                  background: 'rgba(0, 212, 255, 0.15)',
                  color: '#00D4FF',
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                添加
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="考生ID(移除)"
                value={removeId}
                onChange={(e) => setRemoveId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(231, 76, 60, 0.3)',
                  background: 'rgba(30, 30, 46, 0.8)',
                  color: '#E0E0E0',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleRemove}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E74C3C',
                  background: 'rgba(231, 76, 60, 0.15)',
                  color: '#E74C3C',
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                移除
              </button>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)', marginBottom: '6px' }}>
                模拟卡住/恢复(输入考生ID)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="考生ID"
                  value={stuckId}
                  onChange={(e) => setStuckId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(243, 156, 18, 0.3)',
                    background: 'rgba(30, 30, 46, 0.8)',
                    color: '#E0E0E0',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleForceStuck}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #F39C12',
                    background: 'rgba(243, 156, 18, 0.15)',
                    color: '#F39C12',
                    fontSize: '11px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  卡住
                </button>
                <button
                  onClick={handleForceUnstuck}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #27AE60',
                    background: 'rgba(39, 174, 96, 0.15)',
                    color: '#27AE60',
                    fontSize: '11px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  恢复
                </button>
              </div>
            </div>

            <div style={{
              maxHeight: '80px',
              overflow: 'auto',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '8px',
              fontSize: '9px',
              color: 'rgba(224,224,224,0.4)',
            }}>
              {studentIds.slice(0, 10).map(id => (
                <div key={id} style={{ padding: '1px 0', fontFamily: 'monospace' }}>{id.slice(0, 8)}...</div>
              ))}
              {studentIds.length > 10 && <div>...共{studentIds.length}名</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
AddStudentForm.displayName = 'AddStudentForm';

export default AddStudentForm;
