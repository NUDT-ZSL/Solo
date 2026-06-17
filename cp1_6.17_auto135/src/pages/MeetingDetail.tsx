import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Meeting, Note, TodoItem, TodoPriority, Participant, Attachment } from '../types';

const priorityColors: Record<TodoPriority, string> = {
  urgent: '#E74C3C',
  high: '#F39C12',
  medium: '#3498DB',
  low: '#BDC3C7',
};

const priorityLabels: Record<TodoPriority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    assigneeId: '',
    priority: 'medium' as TodoPriority,
    dueDate: '',
  });
  const noteEditorRef = useRef<HTMLDivElement>(null);
  const draggedTodo = useRef<string | null>(null);

  useEffect(() => {
    if (id) {
      loadMeeting();
      loadNotes();
      loadTodos();
    }
  }, [id]);

  const loadMeeting = async () => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      const data = await res.json();
      setMeeting(data);
    } catch (err) {
      console.error('加载会议详情失败:', err);
    }
  };

  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/meetings/${id}/notes`);
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error('加载笔记失败:', err);
    }
  };

  const loadTodos = async () => {
    try {
      const res = await fetch(`/api/meetings/${id}/todos`);
      const data = await res.json();
      setTodos(data);
    } catch (err) {
      console.error('加载待办事项失败:', err);
    }
  };

  const handleSaveNote = async () => {
    if (!newNoteContent.trim()) return;
    
    try {
      const res = await fetch(`/api/meetings/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNoteContent,
          authorId: meeting?.participants[0]?.id || 'c1',
        }),
      });
      if (res.ok) {
        setNewNoteContent('');
        if (noteEditorRef.current) {
          noteEditorRef.current.innerHTML = '';
        }
        loadNotes();
      }
    } catch (err) {
      console.error('保存笔记失败:', err);
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setEditingNote(null);
        loadNotes();
      }
    } catch (err) {
      console.error('更新笔记失败:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('确定删除这条笔记吗？')) return;
    try {
      await fetch(`/api/meetings/${id}/notes/${noteId}`, { method: 'DELETE' });
      loadNotes();
    } catch (err) {
      console.error('删除笔记失败:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        const type = file.type.startsWith('image/') ? 'image' : 'pdf';
        
        try {
          await fetch(`/api/meetings/${id}/notes/${noteId}/attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              type,
              url,
              size: file.size,
            }),
          });
          loadNotes();
        } catch (err) {
          console.error('上传附件失败:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/meetings/${id}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      });
      if (res.ok) {
        setShowTodoModal(false);
        setNewTodo({ title: '', assigneeId: '', priority: 'medium', dueDate: '' });
        loadTodos();
      }
    } catch (err) {
      console.error('创建待办失败:', err);
    }
  };

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    try {
      await fetch(`/api/meetings/${id}/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });
      loadTodos();
    } catch (err) {
      console.error('更新待办状态失败:', err);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!confirm('确定删除这个待办吗？')) return;
    try {
      await fetch(`/api/meetings/${id}/todos/${todoId}`, { method: 'DELETE' });
      loadTodos();
    } catch (err) {
      console.error('删除待办失败:', err);
    }
  };

  const handleDragStart = (todoId: string) => {
    draggedTodo.current = todoId;
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTodo.current || draggedTodo.current === targetId) return;
    
    const draggedIndex = todos.findIndex(t => t.id === draggedTodo.current);
    const targetIndex = todos.findIndex(t => t.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newTodos = [...todos];
      const [removed] = newTodos.splice(draggedIndex, 1);
      newTodos.splice(targetIndex, 0, removed);
      setTodos(newTodos);
    }
  };

  const handleDragEnd = () => {
    draggedTodo.current = null;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAssigneeName = (assigneeId: string) => {
    return meeting?.participants.find(p => p.id === assigneeId)?.name || '未分配';
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (noteEditorRef.current) {
      setNewNoteContent(noteEditorRef.current.innerHTML);
    }
  };

  if (!meeting) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="meeting-detail-page">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <div className="detail-title-section">
          <h1 className="detail-title">{meeting.title}</h1>
          <div className="detail-meta">
            <span>📅 {formatDateTime(meeting.dateTime)}</span>
            <span>📍 {meeting.location || '未设置'}</span>
            <span className={`status-badge status-${meeting.status}`}>
              {meeting.status === 'upcoming' && '即将开始'}
              {meeting.status === 'ongoing' && '进行中'}
              {meeting.status === 'finished' && '已结束'}
            </span>
          </div>
        </div>
      </div>

      <div className="detail-participants">
        <span className="participants-label">参与人：</span>
        <div className="participants-list">
          {meeting.participants.map(p => (
            <div key={p.id} className="participant-tag">
              <div className="avatar avatar-xsmall">{p.name.charAt(0)}</div>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {meeting.agenda && (
        <div className="detail-agenda">
          <h3>会议议程</h3>
          <p>{meeting.agenda}</p>
        </div>
      )}

      <div className="detail-panels">
        <div className="panel notes-panel">
          <div className="panel-header">
            <h2>📝 会议笔记</h2>
          </div>

          <div className="note-editor">
            <div className="editor-toolbar">
              <button onClick={() => execCommand('bold')} title="加粗">
                <strong>B</strong>
              </button>
              <button onClick={() => execCommand('insertUnorderedList')} title="无序列表">
                • 列表
              </button>
              <button onClick={() => execCommand('insertOrderedList')} title="有序列表">
                1. 列表
              </button>
              <button onClick={() => execCommand('formatBlock', 'pre')} title="代码块">
                {'</>'}
              </button>
            </div>
            <div
              ref={noteEditorRef}
              className="editor-content"
              contentEditable
              onInput={(e) => setNewNoteContent((e.target as HTMLDivElement).innerHTML)}
              placeholder="输入会议笔记..."
            />
            <div className="editor-actions">
              <button className="btn btn-primary" onClick={handleSaveNote}>
                保存笔记
              </button>
            </div>
          </div>

          <div className="notes-list">
            {notes.map(note => (
              <div key={note.id} className="note-item">
                <div className="note-header">
                  <div className="note-author">
                    <div className="avatar avatar-xsmall">{note.author.charAt(0)}</div>
                    <div>
                      <span className="author-name">{note.author}</span>
                      <span className="note-time">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="note-actions">
                    <button onClick={() => setEditingNote(editingNote?.id === note.id ? null : note)}>
                      编辑
                    </button>
                    <button onClick={() => handleDeleteNote(note.id)}>删除</button>
                  </div>
                </div>
                
                {editingNote?.id === note.id ? (
                  <div className="note-edit">
                    <div
                      className="editor-content"
                      contentEditable
                      dangerouslySetInnerHTML={{ __html: note.content }}
                      onInput={(e) => {
                        note.content = (e.target as HTMLDivElement).innerHTML;
                      }}
                    />
                    <button 
                      className="btn btn-primary btn-small"
                      onClick={() => handleUpdateNote(note.id, note.content)}
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <div className="note-content" dangerouslySetInnerHTML={{ __html: note.content }} />
                )}

                {note.attachments.length > 0 && (
                  <div className="attachments-list">
                    {note.attachments.map(att => (
                      <div key={att.id} className="attachment-item">
                        {att.type === 'image' ? (
                          <img src={att.url} alt={att.name} className="attachment-thumb" />
                        ) : (
                          <div className="attachment-thumb pdf-thumb">📄</div>
                        )}
                        <span className="attachment-name">{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="note-attachment-upload">
                  <label className="btn-upload">
                    + 添加附件
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleFileUpload(e, note.id)}
                      hidden
                    />
                  </label>
                </div>
              </div>
            ))}
            
            {notes.length === 0 && (
              <div className="empty-state">
                <p>暂无笔记，开始记录吧！</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel todos-panel">
          <div className="panel-header">
            <h2>✅ 待办事项</h2>
            <button className="btn btn-primary btn-small" onClick={() => setShowTodoModal(true)}>
              + 新建
            </button>
          </div>

          <div className="todos-list">
            {todos.map(todo => (
              <div
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''}`}
                draggable
                onDragStart={() => handleDragStart(todo.id)}
                onDragOver={(e) => handleDragOver(e, todo.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="todo-checkbox">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(todo.id, todo.completed)}
                  />
                </div>
                <div 
                  className="priority-dot"
                  style={{ backgroundColor: priorityColors[todo.priority] }}
                  title={priorityLabels[todo.priority]}
                />
                <div className="todo-content">
                  <span className="todo-title">{todo.title}</span>
                  <div className="todo-meta">
                    <span className="todo-assignee">
                      负责人: {getAssigneeName(todo.assigneeId)}
                    </span>
                    <span className="todo-due">
                      截止: {new Date(todo.dueDate).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
                <button 
                  className="todo-delete"
                  onClick={() => handleDeleteTodo(todo.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            
            {todos.length === 0 && (
              <div className="empty-state">
                <p>暂无待办事项</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTodoModal && (
        <div className="modal-overlay" onClick={() => setShowTodoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>新建待办事项</h2>
              <button className="modal-close" onClick={() => setShowTodoModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTodo}>
              <div className="form-group">
                <label>标题 *</label>
                <input
                  type="text"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>负责人 *</label>
                <select
                  value={newTodo.assigneeId}
                  onChange={(e) => setNewTodo({ ...newTodo, assigneeId: e.target.value })}
                  required
                >
                  <option value="">请选择负责人</option>
                  {meeting.participants.map((p: Participant) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>优先级</label>
                <div className="priority-options">
                  {(['urgent', 'high', 'medium', 'low'] as TodoPriority[]).map(priority => (
                    <label key={priority} className={`priority-option ${newTodo.priority === priority ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="priority"
                        value={priority}
                        checked={newTodo.priority === priority}
                        onChange={() => setNewTodo({ ...newTodo, priority })}
                      />
                      <span className="priority-dot" style={{ backgroundColor: priorityColors[priority] }} />
                      <span>{priorityLabels[priority]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>截止日期 *</label>
                <input
                  type="date"
                  value={newTodo.dueDate}
                  onChange={(e) => setNewTodo({ ...newTodo, dueDate: new Date(e.target.value).toISOString() })}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTodoModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
