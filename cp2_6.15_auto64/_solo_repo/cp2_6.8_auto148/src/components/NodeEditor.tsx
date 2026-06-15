import { useState, useEffect, useMemo } from 'react';
import { TimelineNode, IconName } from '../types';
import { icons } from '../icons';

interface NodeEditorProps {
  node: TimelineNode | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<TimelineNode>) => void;
  onDelete: (id: string) => void;
}

const ICON_LIST: IconName[] = ['star', 'compass', 'camera', 'music', 'globe', 'rocket', 'bulb', 'heart', 'book', 'gear', 'flag', 'trophy'];

function NodeEditor({ node, isOpen, onClose, onUpdate, onDelete }: NodeEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<IconName>('star');
  const [importance, setImportance] = useState(3);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description);
      setDate(node.date);
      setSelectedIcon((node.icon as IconName) || 'star');
      setImportance(node.importance);
    }
  }, [node]);

  const handleSave = useMemo(() => () => {
    if (node) {
      onUpdate(node.id, {
        title,
        description,
        date,
        icon: selectedIcon,
        importance,
      });
    }
  }, [node, title, description, date, selectedIcon, importance, onUpdate]);

  const handleDelete = () => {
    if (node) {
      onDelete(node.id);
    }
  };

  if (!node) return null;

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            zIndex: 99,
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          onClick={onClose}
        />
      )}
      <div
        style={{
          position: 'relative',
          width: 320,
          height: '100vh',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px 0 0 12px',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-out',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>编辑节点</h3>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.field}>
            <label style={styles.label}>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={handleSave}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              onBlur={handleSave}
              placeholder="输入标题 (最多50字符)"
              maxLength={50}
              style={styles.input}
            />
            <span style={styles.charCount}>{title.length}/50</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              onBlur={handleSave}
              placeholder="输入详细描述 (最多200字符)"
              maxLength={200}
              rows={4}
              style={styles.textarea}
            />
            <span style={styles.charCount}>{description.length}/200</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>图标</label>
            <div style={styles.iconGrid}>
              {ICON_LIST.map((iconName) => {
                const IconComponent = icons[iconName];
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    key={iconName}
                    onClick={() => {
                      setSelectedIcon(iconName);
                      setTimeout(() => {
                        if (node) {
                          onUpdate(node.id, { icon: iconName });
                        }
                      }, 0);
                    }}
                    style={{
                      ...styles.iconButton,
                      backgroundColor: isSelected ? '#EEF2FF' : '#F8FAFC',
                      borderColor: isSelected ? '#6366F1' : '#E2E8F0',
                      color: isSelected ? '#4F46E5' : '#64748B',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#F1F5F9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }
                    }}
                  >
                    <IconComponent size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>重要性</label>
            <div style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= importance;
                const StarIcon = icons.star;
                return (
                  <button
                    key={star}
                    onClick={() => {
                      setImportance(star);
                      setTimeout(() => {
                        if (node) {
                          onUpdate(node.id, { importance: star });
                        }
                      }, 0);
                    }}
                    style={{
                      ...styles.starButton,
                      transform: 'scale(1)',
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <StarIcon 
                      size={28} 
                      color={isFilled ? '#F59E0B' : '#E2E8F0'} 
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button
            style={styles.deleteButton}
            onClick={handleDelete}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEE2E2';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
          >
            删除节点
          </button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #E2E8F0',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1E293B',
  },
  closeButton: {
    width: 32,
    height: 32,
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#64748B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
    fontFamily: 'inherit',
  },
  content: {
    flex: 1,
    padding: '20px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1E293B',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontFamily: 'inherit',
    backgroundColor: '#FFFFFF',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1E293B',
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    backgroundColor: '#FFFFFF',
  },
  charCount: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    fontSize: '11px',
    color: '#94A3B8',
    pointerEvents: 'none',
  },
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  iconButton: {
    width: '100%',
    aspectRatio: '1',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    backgroundColor: '#F8FAFC',
    fontFamily: 'inherit',
  },
  starsContainer: {
    display: 'flex',
    gap: '4px',
  },
  starButton: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #E2E8F0',
  },
  deleteButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
};

export default NodeEditor;
