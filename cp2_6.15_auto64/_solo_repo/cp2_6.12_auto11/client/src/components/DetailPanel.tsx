import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Todo, Priority, TodoFormData } from '../types';

interface DetailPanelProps {
  selectedDate: string;
  todos: Todo[];
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: TodoFormData) => Promise<void>;
  onUpdate: (id: number, data: Partial<TodoFormData>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorder: (orderedIds: number[]) => Promise<void>;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
};

const formatDisplayDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
};

interface TodoFormProps {
  initialData?: Todo;
  onSubmit: (data: TodoFormData) => void;
  onCancel: () => void;
  existingTags: string[];
}

const TodoForm: React.FC<TodoFormProps> = ({ initialData, onSubmit, onCancel, existingTags }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState<Priority>(initialData?.priority || 'medium');
  const [tags, setTags] = useState<string[]>(
    initialData?.tags ? initialData.tags.split(',').filter(Boolean) : []
  );
  const [tagInput, setTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const availableTags = useMemo(() => {
    return existingTags.filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()));
  }, [existingTags, tags, tagInput]);

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
    setShowTagDropdown(false);
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      tags,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        ...styles.form,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="事项标题..."
        style={styles.titleInput}
        autoFocus
      />

      <div style={styles.priorityRow}>
        <span style={styles.fieldLabel}>优先级：</span>
        <div style={styles.priorityOptions}>
          {(['high', 'medium', 'low'] as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              style={{
                ...styles.priorityOption,
                backgroundColor: priority === p ? PRIORITY_COLORS[p] : 'transparent',
                color: priority === p ? '#fff' : PRIORITY_COLORS[p],
                borderColor: PRIORITY_COLORS[p],
              }}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.fieldRow}>
        <span style={styles.fieldLabel}>标签：</span>
        <div style={styles.tagsContainer}>
          {tags.map((tag) => (
            <span key={tag} style={styles.tagBadge}>
              {tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} style={styles.tagRemove}>
                ×
              </button>
            </span>
          ))}
          <div style={styles.tagInputWrapper} ref={useRef<HTMLDivElement>(null)}>
            <input
              type="text"
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowTagDropdown(true);
              }}
              onFocus={() => setShowTagDropdown(true)}
              onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault();
                  handleAddTag(tagInput);
                }
              }}
              placeholder="添加标签..."
              style={styles.tagInput}
            />
            {showTagDropdown && availableTags.length > 0 && (
              <div style={styles.tagDropdown}>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={() => handleAddTag(tag)}
                    style={styles.tagDropdownItem}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="详细描述（可选）..."
        style={styles.descriptionInput}
        rows={3}
      />

      <div style={styles.formActions}>
        <button type="button" onClick={onCancel} style={styles.cancelButton}>
          取消
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          style={{
            ...styles.saveButton,
            opacity: !title.trim() ? 0.5 : 1,
          }}
        >
          {initialData ? '保存' : '创建'}
        </button>
      </div>
    </form>
  );
};

interface TodoItemProps {
  todo: Todo;
  isDragging: boolean;
  dragOver: 'above' | 'below' | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  isDragging,
  dragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onEdit,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const tags = useMemo(() => todo.tags.split(',').filter(Boolean), [todo.tags]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        ...styles.todoItem,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transform: isDragging ? 'rotate(2deg)' : 'none',
        borderTop: dragOver === 'above' ? '2px solid var(--accent-blue)' : '2px solid transparent',
        borderBottom: dragOver === 'below' ? '2px solid var(--accent-blue)' : '2px solid transparent',
        transition: isDragging ? 'none' : 'all var(--transition-fast)',
      }}
    >
      <div style={styles.todoHandle}>⋮⋮</div>

      <div style={styles.todoContent}>
        <div style={styles.todoHeader}>
          <div style={styles.todoTitleRow}>
            <span
              style={{
                ...styles.priorityBadge,
                backgroundColor: PRIORITY_COLORS[todo.priority],
              }}
            />
            <h3 style={styles.todoTitle}>{todo.title}</h3>
          </div>
          <div style={styles.todoActions}>
            <button onClick={onEdit} style={styles.iconButton} title="编辑">
              ✎
            </button>
            <button onClick={onDelete} style={styles.iconButton} title="删除">
              🗑
            </button>
          </div>
        </div>

        {tags.length > 0 && (
          <div style={styles.todoTags}>
            {tags.map((tag) => (
              <span key={tag} style={styles.tagBadge}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {todo.description && (
          <div style={styles.descriptionWrapper}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={styles.toggleButton}
            >
              {expanded ? '收起 ▲' : '展开 ▼'}
            </button>
            {expanded && (
              <div
                style={{
                  ...styles.todoDescription,
                  animation: 'collapse 0.3s ease',
                }}
              >
                {todo.description}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedDate,
  todos,
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<{ id: number; position: 'above' | 'below' } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    todos.forEach((t) => {
      t.tags.split(',').filter(Boolean).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [todos]);

  const triggerSuccessAnimation = () => {
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 1500);
  };

  const handleCreate = async (data: TodoFormData) => {
    await onCreate(data);
    setIsCreating(false);
    triggerSuccessAnimation();
  };

  const handleUpdate = async (id: number, data: TodoFormData) => {
    await onUpdate(id, data);
    setEditingId(null);
    triggerSuccessAnimation();
  };

  const handleDragStart = (id: number) => (e: React.DragEvent) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleDragOver = (id: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingId === id || draggingId === null) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    setDragOverId({ id, position });
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = () => async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingId === null || dragOverId === null) return;

    const orderedIds = todos.map((t) => t.id);
    const fromIndex = orderedIds.indexOf(draggingId);
    const toIndex = orderedIds.indexOf(dragOverId.id);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    orderedIds.splice(fromIndex, 1);
    const insertIndex = dragOverId.position === 'below' ? toIndex : toIndex;
    orderedIds.splice(
      dragOverId.position === 'below' && fromIndex < toIndex ? toIndex : toIndex,
      0,
      draggingId
    );

    setDraggingId(null);
    setDragOverId(null);
    await onReorder(orderedIds);
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        ...styles.mobilePanel,
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        opacity: isOpen ? 1 : 0,
      }
    : {
        ...styles.panel,
        transform: isOpen ? 'translateX(0)' : 'translateX(400px)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
      };

  const editingTodo = editingId ? todos.find((t) => t.id === editingId) : null;

  return (
    <>
      {isMobile && isOpen && (
        <div style={styles.overlay} onClick={onClose} />
      )}

      <div style={panelStyle}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>{formatDisplayDate(selectedDate)}</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
          >
            ×
          </button>
        </div>

        <div style={styles.panelContent}>
          {!isCreating && !editingTodo && (
            <button
              onClick={() => setIsCreating(true)}
              style={styles.addButton}
            >
              + 新建事项
            </button>
          )}

          {isCreating && (
            <TodoForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreating(false)}
              existingTags={allTags}
            />
          )}

          {todos.length === 0 && !isCreating && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📝</div>
              <p style={styles.emptyText}>还没有事项，点击上方按钮创建一个吧</p>
            </div>
          )}

          <div style={styles.todoList}>
            {todos.map((todo) => {
              if (editingTodo && todo.id === editingTodo.id) {
                return (
                  <TodoForm
                    key={todo.id}
                    initialData={todo}
                    onSubmit={(data) => handleUpdate(todo.id, data)}
                    onCancel={() => setEditingId(null)}
                    existingTags={allTags}
                  />
                );
              }

              return (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  isDragging={draggingId === todo.id}
                  dragOver={dragOverId?.id === todo.id ? dragOverId.position : null}
                  onDragStart={handleDragStart(todo.id)}
                  onDragOver={handleDragOver(todo.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop()}
                  onEdit={() => setEditingId(todo.id)}
                  onDelete={() => onDelete(todo.id)}
                />
              );
            })}
          </div>
        </div>

        {showCheckmark && (
          <div style={styles.checkmarkOverlay}>
            <div style={styles.checkmarkIcon}>✓</div>
          </div>
        )}
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 400,
    height: '100vh',
    backgroundColor: 'var(--bg-secondary)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    transition: 'all 0.3s ease',
  },
  mobilePanel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85vh',
    backgroundColor: 'var(--bg-secondary)',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    borderTopLeftRadius: 'var(--radius-lg)',
    borderTopRightRadius: 'var(--radius-lg)',
    transition: 'all 0.3s ease',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 99,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color)',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    fontSize: 20,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast)',
  },
  panelContent: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
  },
  addButton: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'var(--accent-blue-light)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16,
    transition: 'all var(--transition-fast)',
  },
  todoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  todoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    cursor: 'grab',
  },
  todoHandle: {
    color: 'var(--text-tertiary)',
    fontSize: 14,
    cursor: 'grab',
    paddingTop: 4,
    flexShrink: 0,
    userSelect: 'none',
  },
  todoContent: {
    flex: 1,
    minWidth: 0,
  },
  todoHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  todoTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  priorityBadge: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  todoTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
  },
  todoActions: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
  },
  todoTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 10px',
    backgroundColor: 'var(--accent-purple-light)',
    color: 'var(--text-primary)',
    borderRadius: 12,
    fontSize: 12,
  },
  tagRemove: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    lineHeight: 1,
  },
  descriptionWrapper: {
    marginTop: 8,
  },
  toggleButton: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    marginBottom: 4,
  },
  todoDescription: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    backgroundColor: 'var(--bg-secondary)',
    padding: 10,
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
  },
  form: {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: 16,
    marginBottom: 12,
  },
  titleInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-secondary)',
    fontSize: 14,
    outline: 'none',
    marginBottom: 12,
    transition: 'border-color var(--transition-fast)',
  },
  priorityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  fieldLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  priorityOptions: {
    display: 'flex',
    gap: 6,
  },
  priorityOption: {
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 12,
    border: '1.5px solid',
    transition: 'all var(--transition-fast)',
  },
  fieldRow: {
    marginBottom: 12,
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tagInputWrapper: {
    position: 'relative',
  },
  tagInput: {
    padding: '2px 10px',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    backgroundColor: 'var(--bg-secondary)',
    fontSize: 12,
    outline: 'none',
    width: 120,
  },
  tagDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow-md)',
    zIndex: 10,
    minWidth: 120,
  },
  tagDropdownItem: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  descriptionInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-secondary)',
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color var(--transition-fast)',
  },
  formActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    color: 'var(--text-secondary)',
    transition: 'background-color var(--transition-fast)',
  },
  saveButton: {
    padding: '8px 20px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    backgroundColor: 'var(--accent-blue)',
    color: '#fff',
    fontWeight: 500,
    transition: 'all var(--transition-fast)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    pointerEvents: 'none',
    zIndex: 200,
  },
  checkmarkIcon: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    backgroundColor: 'var(--priority-low)',
    color: '#fff',
    fontSize: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'checkmark 0.4s ease',
  },
};

export default DetailPanel;
