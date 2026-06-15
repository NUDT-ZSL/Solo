import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useMindMapStore, NoteVersion } from '../store';

interface NoteEditorProps {
  nodeId: string;
  onClose: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ nodeId, onClose }) => {
  const noteData = useMindMapStore(s => s.noteData);
  const loadNote = useMindMapStore(s => s.loadNote);
  const saveNote = useMindMapStore(s => s.saveNote);
  const restoreVersion = useMindMapStore(s => s.restoreVersion);
  const searchQuery = useMindMapStore(s => s.searchQuery);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    loadNote(nodeId);
  }, [nodeId]);

  useEffect(() => {
    if (noteData) {
      setTitle(noteData.title || '');
      setContent(noteData.content || '');
      setVersions(noteData.versions || []);
    } else {
      setTitle('');
      setContent('');
      setVersions([]);
    }
  }, [noteData]);

  const debouncedSave = useCallback((newTitle: string, newContent: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNote(nodeId, newTitle, newContent);
    }, 300);
  }, [nodeId, saveNote]);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    debouncedSave(title, value);
  }, [title, debouncedSave]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave(newTitle, content);
  }, [content, debouncedSave]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    await restoreVersion(nodeId, versionId);
    setShowVersions(false);
  }, [nodeId, restoreVersion]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        alert('图片大小不能超过500KB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', base64);
          quill.setSelection(range.index + 1);
        }
      };
      reader.readAsDataURL(file);
    };
  }, []);

  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['image'],
        ['clean'],
      ],
      handlers: {
        image: handleImageUpload,
      },
    },
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getPreviewText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    return text.slice(0, 20) + (text.length > 20 ? '...' : '');
  };

  const highlightText = (html: string, query: string) => {
    if (!query.trim()) return html;
    const div = document.createElement('div');
    div.innerHTML = html;
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }
    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      let idx = lowerText.indexOf(lowerQuery);
      if (idx === -1) return;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      while (idx !== -1) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
        const mark = document.createElement('mark');
        mark.style.background = '#ffff00';
        mark.textContent = text.slice(idx, idx + query.length);
        frag.appendChild(mark);
        lastIdx = idx + query.length;
        idx = lowerText.indexOf(lowerQuery, lastIdx);
      }
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      textNode.parentNode?.replaceChild(frag, textNode);
    });
    return div.innerHTML;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#333333', margin: 0 }}>笔记</h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999999', padding: 4 }}
        >
          ✕
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="笔记标题"
        style={{
          width: '100%',
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 14,
          outline: 'none',
          marginBottom: 8,
        }}
      />

      {noteData && (
        <div style={{ fontSize: 12, color: '#999999', marginBottom: 8 }}>
          最后更新: {formatTime(noteData.updatedAt)}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', marginBottom: 8 }}>
        <div className="ql-editor-wrapper" style={{ height: '100%' }}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={searchQuery ? highlightText(content, searchQuery) : content}
            onChange={handleContentChange}
            modules={modules}
            style={{ height: 'calc(100% - 42px)' }}
          />
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 8 }}>
        <button
          onClick={() => setShowVersions(!showVersions)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: 13,
            color: '#666666',
          }}
        >
          历史版本 ({versions.length})
        </button>
        {showVersions && versions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 10,
            }}
          >
            {versions.map(v => (
              <div
                key={v.id}
                onClick={() => handleRestoreVersion(v.id)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f5f5f5',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
              >
                <div style={{ fontSize: 11, color: '#999999' }}>{formatTime(v.createdAt)}</div>
                <div style={{ fontSize: 13, color: '#333333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getPreviewText(v.content)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteEditor;
