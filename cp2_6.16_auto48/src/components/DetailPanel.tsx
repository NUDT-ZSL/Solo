import React from 'react';
import type { MindMapNode, Priority, Theme } from '../types';

interface DetailPanelProps {
  node: MindMapNode | null;
  isOpen: boolean;
  theme: Theme;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<MindMapNode>) => void;
}

const priorityColors: Record<Priority, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

const priorityLabels: Record<Priority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const DetailPanel: React.FC<DetailPanelProps> = ({
  node,
  isOpen,
  theme,
  onClose,
  onUpdate,
}) => {
  const themeColors = {
    bg: theme === 'dark' ? '#1e293b' : '#ffffff',
    text: theme === 'dark' ? '#f1f5f9' : '#1e293b',
    textSecondary: theme === 'dark' ? '#94a3b8' : '#64748b',
    border: theme === 'dark' ? '#334155' : '#e2e8f0',
    inputBg: theme === 'dark' ? '#0f172a' : '#f8fafc',
    inputBorderFocus: '#3b82f6',
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (node) {
      onUpdate(node.id, { title: e.target.value });
    }
  };

  const handlePriorityChange = (priority: Priority) => {
    if (node) {
      onUpdate(node.id, { priority });
    }
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (node) {
      onUpdate(node.id, { dueDate: e.target.value });
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (node) {
      onUpdate(node.id, { notes: e.target.value });
    }
  };

  const handleMilestoneToggle = () => {
    if (node) {
      onUpdate(node.id, { isMilestone: !node.isMilestone });
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (node) {
      onUpdate(node.id, { progress: parseInt(e.target.value, 10) });
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: isOpen ? '320px' : '0',
        height: '100%',
        backgroundColor: themeColors.bg,
        borderRadius: '16px',
        boxShadow: isOpen ? '-4px 0 20px rgba(0,0,0,0.1)' : 'none',
        overflow: 'hidden',
        zIndex: 5,
        transition: 'width 300ms ease-out, box-shadow 300ms ease-out',
        border: `1px solid ${themeColors.border}`,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '320px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 200ms ease-out',
          transitionDelay: isOpen ? '100ms' : '0ms',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: `1px solid ${themeColors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: themeColors.text,
            }}
          >
            任务详情
          </h3>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: themeColors.textSecondary,
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 150ms ease, transform 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor =
                theme === 'dark' ? '#334155' : '#f1f5f9';
              (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
          >
            ✕
          </button>
        </div>

        {node ? (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: themeColors.text,
                  marginBottom: '8px',
                }}
              >
                标题
              </label>
              <input
                type="text"
                value={node.title}
                onChange={handleTitleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.inputBg,
                  color: themeColors.text,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 150ms ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = themeColors.inputBorderFocus;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = themeColors.border;
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: themeColors.text,
                  marginBottom: '8px',
                }}
              >
                优先级
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border:
                        node.priority === p
                          ? `2px solid ${priorityColors[p]}`
                          : `1px solid ${themeColors.border}`,
                      backgroundColor:
                        node.priority === p
                          ? `${priorityColors[p]}15`
                          : 'transparent',
                      color: themeColors.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'transform 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                    onMouseDown={(e) => {
                      (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
                    }}
                    onMouseUp={(e) => {
                      (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: priorityColors[p],
                      }}
                    />
                    {priorityLabels[p]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: themeColors.text,
                  marginBottom: '8px',
                }}
              >
                截止日期
              </label>
              <input
                type="date"
                value={node.dueDate}
                onChange={handleDueDateChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.inputBg,
                  color: themeColors.text,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 150ms ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = themeColors.inputBorderFocus;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = themeColors.border;
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: themeColors.text,
                  marginBottom: '8px',
                }}
              >
                进度: {node.progress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={node.progress}
                onChange={handleProgressChange}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: themeColors.border,
                  outline: 'none',
                  WebkitAppearance: 'none',
                }}
              />
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                  transition: transform 150ms ease;
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.2);
                }
              `}</style>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: themeColors.text,
                  marginBottom: '8px',
                }}
              >
                备注
              </label>
              <textarea
                value={node.notes}
                onChange={handleNotesChange}
                placeholder="添加备注..."
                rows={6}
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.inputBg,
                  color: themeColors.text,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 150ms ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = themeColors.inputBorderFocus;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = themeColors.border;
                }}
              />
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: themeColors.text,
                  }}
                >
                  转换为里程碑
                </label>
                <button
                  onClick={handleMilestoneToggle}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '28px',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: node.isMilestone ? '#3b82f6' : themeColors.border,
                    cursor: 'pointer',
                    transition: 'background-color 200ms ease',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: node.isMilestone ? '22px' : '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'left 200ms ease',
                    }}
                  />
                </button>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: themeColors.textSecondary,
                  marginTop: '8px',
                  marginBottom: 0,
                }}
              >
                里程碑在甘特图中显示为星形图标
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: themeColors.textSecondary,
              fontSize: '14px',
            }}
          >
            选择一个节点查看详情
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailPanel;
