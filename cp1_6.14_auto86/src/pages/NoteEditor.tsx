import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Menu,
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Image,
  Save,
  History,
  Send,
  MessageSquare,
  Clock,
  GitCompare,
} from 'lucide-react';
import http from '../http.js';
import VersionDiffPanel from '../components/VersionDiffPanel.js';

interface Chapter {
  id: string;
  courseId: string;
  name: string;
  order: number;
  hasUpdate: boolean;
}

interface Note {
  id: string;
  chapterId: string;
  content: string;
  currentVersionId: string;
}

interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  createdAt: string;
  versionNumber: number;
}

interface Comment {
  id: string;
  noteId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

const softColors = [
  '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA',
  '#FFDFBA', '#E8BAFF', '#B3FFE6', '#FFC9B3',
];

const NoteEditor = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [note, setNote] = useState<Note | null>(null);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [contentFadeKey, setContentFadeKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [newCommentId, setNewCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      loadChapters();
    }
  }, [courseId]);

  useEffect(() => {
    if (currentChapterId) {
      loadNote();
    }
  }, [currentChapterId]);

  useEffect(() => {
    if (note?.id) {
      loadVersions();
      loadComments();
    }
  }, [note?.id]);

  const loadChapters = async () => {
    try {
      const data = await http.get(`/courses/${courseId}/chapters`);
      setChapters(data);
      if (data.length > 0) {
        setCurrentChapterId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load chapters:', error);
    }
  };

  const loadNote = async () => {
    try {
      const data = await http.get(`/notes/${currentChapterId}`);
      setNote(data);
      if (editorRef.current && data.content) {
        editorRef.current.innerHTML = data.content;
      } else if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setContentFadeKey((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to load note:', error);
    }
  };

  const loadVersions = async () => {
    if (!note?.id) return;
    try {
      const data = await http.get(`/notes/${note.id}/versions`);
      setVersions(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const loadComments = async () => {
    if (!note?.id) return;
    try {
      const data = await http.get(`/notes/${note.id}/comments`);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const saveNote = async () => {
    if (!editorRef.current || !currentChapterId) return;
    setSaving(true);
    try {
      const content = editorRef.current.innerHTML;
      const result = await http.post('/notes', {
        chapterId: currentChapterId,
        content,
      });
      setNote(result.note);
      setVersions((prev) => [result.version, ...prev]);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChapterSelect = (chapterId: string) => {
    setCurrentChapterId(chapterId);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertHeading = (level: number) => {
    execCommand('formatBlock', `h${level}`);
  };

  const insertCodeBlock = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.style.fontFamily = "'Fira Code', monospace";
      code.style.backgroundColor = '#f4f4f4';
      code.style.borderRadius = '3px';
      code.style.padding = '2px 6px';
      code.textContent = selection.toString() || '// 代码块';
      pre.appendChild(code);
      range.deleteContents();
      range.insertNode(pre);
      const br = document.createElement('br');
      pre.after(br);
      range.setStartAfter(br);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const insertImage = () => {
    const url = prompt('请输入图片URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !note?.id) return;
    const userName = localStorage.getItem('userName') || '匿名用户';
    const commentId = 'temp-' + Date.now();
    const tempComment: Comment = {
      id: commentId,
      noteId: note.id,
      userId: 'user-demo',
      userName,
      content: newComment,
      createdAt: new Date().toISOString(),
    };
    setNewCommentId(commentId);
    setComments((prev) => [tempComment, ...prev]);
    setNewComment('');

    try {
      const savedComment = await http.post('/comments', {
        noteId: note.id,
        userId: 'user-demo',
        userName,
        content: newComment,
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? savedComment : c))
      );
    } catch (error) {
      console.error('Failed to submit comment:', error);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } finally {
      setTimeout(() => setNewCommentId(null), 500);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      submitComment();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRandomColor = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return softColors[Math.abs(hash) % softColors.length];
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f5f5' }}>
      <header className="h-14 px-6 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: '#2c3e50' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-1 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">NoteNest</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiff(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-white text-sm rounded-lg transition-all hover:bg-white hover:bg-opacity-10"
          >
            <GitCompare className="w-4 h-4" />
            <span className="hidden sm:inline">版本对比</span>
          </button>
          <button
            onClick={saveNote}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-70"
            style={{ backgroundColor: '#3498db' }}
            onMouseOver={(e) => !saving && (e.currentTarget.style.backgroundColor = '#2980b9')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3498db')}
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full">
        <div
          className={`fixed md:relative z-40 h-full md:h-auto transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
          style={{ width: '220px', backgroundColor: '#f8f9fa' }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h3 className="font-semibold text-gray-700">章节列表</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  onClick={() => handleChapterSelect(chapter.id)}
                  className={`h-12 px-4 flex items-center gap-3 cursor-pointer transition-colors relative ${
                    currentChapterId === chapter.id
                      ? 'bg-white border-r-4'
                      : 'hover:bg-white hover:bg-opacity-60'
                  }`}
                  style={{
                    borderRightColor:
                      currentChapterId === chapter.id ? '#3498db' : undefined,
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{
                      backgroundColor: chapter.hasUpdate ? '#3498db' : '#bdc3c7',
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {chapter.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="md:hidden flex items-center gap-3 px-4 py-2 bg-white border-b">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: '#2c3e50' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="font-medium text-gray-700">
              {chapters.find((c) => c.id === currentChapterId)?.name}
            </span>
          </div>

          <div
            key={contentFadeKey}
            className="flex-1 flex flex-col bg-white m-4 md:m-6 rounded-xl shadow-sm overflow-hidden"
            style={{
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div
              className="h-10 px-3 flex items-center gap-1 flex-shrink-0 border-b"
              style={{ backgroundColor: '#ecf0f1' }}
            >
              {[
                { icon: Bold, cmd: () => execCommand('bold') },
                { icon: Italic, cmd: () => execCommand('italic') },
                { icon: Underline, cmd: () => execCommand('underline') },
              ].map(({ icon: Icon, cmd }, i) => (
                <button
                  key={i}
                  onClick={cmd}
                  className="w-7.5 h-7.5 flex items-center justify-center rounded transition-colors hover:bg-gray-300"
                  style={{ width: '30px', height: '30px' }}
                  title="粗体"
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                </button>
              ))}
              <div className="w-px h-5 bg-gray-400 mx-1" />
              {[
                { icon: Heading1, cmd: () => insertHeading(1), size: '24px' },
                { icon: Heading2, cmd: () => insertHeading(2), size: '20px' },
                { icon: Heading3, cmd: () => insertHeading(3), size: '16px' },
              ].map(({ icon: Icon, cmd }, i) => (
                <button
                  key={i}
                  onClick={cmd}
                  className="w-7.5 h-7.5 flex items-center justify-center rounded transition-colors hover:bg-gray-300"
                  style={{ width: '30px', height: '30px' }}
                  title={`标题${i + 1}`}
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                </button>
              ))}
              <div className="w-px h-5 bg-gray-400 mx-1" />
              {[
                { icon: List, cmd: () => execCommand('insertUnorderedList') },
                { icon: ListOrdered, cmd: () => execCommand('insertOrderedList') },
              ].map(({ icon: Icon, cmd }, i) => (
                <button
                  key={i}
                  onClick={cmd}
                  className="w-7.5 h-7.5 flex items-center justify-center rounded transition-colors hover:bg-gray-300"
                  style={{ width: '30px', height: '30px' }}
                  title="列表"
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                </button>
              ))}
              <div className="w-px h-5 bg-gray-400 mx-1" />
              {[
                { icon: Code, cmd: insertCodeBlock },
                { icon: Image, cmd: insertImage },
              ].map(({ icon: Icon, cmd }, i) => (
                <button
                  key={i}
                  onClick={cmd}
                  className="w-7.5 h-7.5 flex items-center justify-center rounded transition-colors hover:bg-gray-300"
                  style={{ width: '30px', height: '30px' }}
                  title={i === 0 ? '代码块' : '插入图片'}
                >
                  <Icon className="w-4 h-4 text-gray-600" />
                </button>
              ))}
            </div>

            <div
              ref={editorRef}
              contentEditable
              className="flex-1 p-6 outline-none overflow-y-auto"
              style={{
                minHeight: '400px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: 1.8,
              }}
              suppressContentEditableWarning
            />

            {versions.length > 0 && (
              <div className="border-t p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-700">版本历史</h3>
                </div>
                <div className="relative pl-8">
                  <div
                    className="absolute left-1.5 top-0 bottom-0 w-0.5"
                    style={{ backgroundColor: '#95a5a6' }}
                  />
                  {versions.map((version, idx) => (
                    <div key={version.id} className="relative py-3">
                      <div
                        className="absolute -left-8 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{
                          backgroundColor:
                            idx === 0 ? '#3498db' : '#95a5a6',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      />
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">
                          版本 {version.versionNumber}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(version.createdAt)}
                        </span>
                        {idx === 0 && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: '#3498db' }}
                          >
                            当前
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-700">评论 ({comments.length})</h3>
              </div>

              <div className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  placeholder="添加评论... (Ctrl+Enter 提交)"
                  className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: '#ced4da',
                    minHeight: '80px',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3498db')}
                  onBlur={(e) => (e.target.style.borderColor = '#ced4da')}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={submitComment}
                    disabled={!newComment.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#3498db' }}
                    onMouseOver={(e) => newComment.trim() && (e.currentTarget.style.backgroundColor = '#2980b9')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3498db')}
                  >
                    <Send className="w-4 h-4" />
                    发送
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-3"
                    style={{
                      animation:
                        newCommentId === comment.id
                          ? 'slideIn 0.3s ease'
                          : undefined,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ backgroundColor: getRandomColor(comment.userName) }}
                    >
                      {getInitials(comment.userName)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm" style={{ fontSize: '14px' }}>
                          {comment.userName}
                        </span>
                        <span className="text-xs" style={{ color: '#7f8c8d', fontSize: '12px' }}>
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDiff && note?.id && (
        <VersionDiffPanel noteId={note.id} onClose={() => setShowDiff(false)} />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        [contenteditable] h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 16px 0 8px;
        }
        [contenteditable] h2 {
          font-size: 20px;
          font-weight: bold;
          margin: 14px 0 6px;
        }
        [contenteditable] h3 {
          font-size: 16px;
          font-weight: bold;
          margin: 12px 0 4px;
        }
        [contenteditable] ul,
        [contenteditable] ol {
          padding-left: 20px;
          margin: 8px 0;
        }
        [contenteditable] li {
          margin: 4px 0;
        }
        [contenteditable] code:not(pre code) {
          font-family: 'Fira Code', monospace;
          background-color: #f4f4f4;
          border-radius: 3px;
          padding: 2px 6px;
        }
        [contenteditable] pre {
          background-color: #f4f4f4;
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          margin: 12px 0;
        }
        [contenteditable] pre code {
          font-family: 'Fira Code', monospace;
          background: none;
          padding: 0;
        }
        [contenteditable] img {
          max-width: 100%;
          border-radius: 8px;
          margin: 12px 0;
        }
        [contenteditable] p {
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
};

export default NoteEditor;
