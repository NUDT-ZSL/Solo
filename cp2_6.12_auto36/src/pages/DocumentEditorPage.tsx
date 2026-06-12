import { useEffect, useState, useDeferredValue, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Save,
  History,
  MessageSquarePlus,
  X,
  ChevronRight,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { cn } from '@/lib/utils';
import VersionDiff from '@/components/VersionDiff';
import AnnotationBubble from '@/components/AnnotationBubble';
import type { Annotation } from '@/types';

interface LocationState {
  searchQuery?: string;
  matchIndex?: number;
}

export default function DocumentEditorPage() {
  const { docId } = useParams<{ docId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const currentDocument = useKnowledgeStore((s) => s.currentDocument);
  const versions = useKnowledgeStore((s) => s.versions);
  const annotations = useKnowledgeStore((s) => s.annotations);
  const versionPanelOpen = useKnowledgeStore((s) => s.versionPanelOpen);
  const fetchDocument = useKnowledgeStore((s) => s.fetchDocument);
  const updateDocument = useKnowledgeStore((s) => s.updateDocument);
  const fetchVersions = useKnowledgeStore((s) => s.fetchVersions);
  const fetchVersion = useKnowledgeStore((s) => s.fetchVersion);
  const fetchAnnotations = useKnowledgeStore((s) => s.fetchAnnotations);
  const addAnnotation = useKnowledgeStore((s) => s.addAnnotation);
  const setVersionPanelOpen = useKnowledgeStore((s) => s.setVersionPanelOpen);

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedVersionContent, setSelectedVersionContent] = useState<string>('');
  const [activeParagraphIdx, setActiveParagraphIdx] = useState<number | null>(null);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState<HTMLElement | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const searchQueryDeferred = useDeferredValue(state?.searchQuery || '');

  const deferredContent = useDeferredValue(editContent);

  useEffect(() => {
    if (docId) {
      fetchDocument(docId);
      fetchVersions(docId);
      fetchAnnotations(docId);
    }
  }, [docId, fetchDocument, fetchVersions, fetchAnnotations]);

  useEffect(() => {
    if (currentDocument) {
      setEditTitle(currentDocument.title);
      setEditContent(currentDocument.content);
    }
  }, [currentDocument]);

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [versions]
  );

  const paragraphAnnotations = useMemo(() => {
    const map = new Map<number, Annotation[]>();
    annotations.forEach((a) => {
      if (a.parentId) return;
      const list = map.get(a.paragraphIndex) || [];
      list.push(a);
      map.set(a.paragraphIndex, list);
    });
    return map;
  }, [annotations]);

  const handleEditorScroll = () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (editor && preview) {
      const scrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
      preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight);
    }
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  };

  const handleSave = async () => {
    if (!docId) return;
    await updateDocument(docId, editTitle.trim() || '无标题文档', editContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSelectVersion = async (versionId: string) => {
    if (!docId) return;
    setSelectedVersionId(versionId);
    const version = await fetchVersion(docId, versionId);
    if (version) {
      setSelectedVersionContent(version.content);
    }
  };

  const handleAddAnnotation = async () => {
    if (!docId || activeParagraphIdx === null || !newAnnotationText.trim()) return;
    await addAnnotation(docId, activeParagraphIdx, newAnnotationText.trim());
    setNewAnnotationText('');
    setShowAnnotationInput(false);
    setActiveParagraphIdx(null);
  };

  useEffect(() => {
    if (!searchQueryDeferred || !previewRef.current) return;

    const cleanupHighlight = () => {
      if (highlightedNode && highlightedNode.parentNode) {
        const textNode = document.createTextNode(highlightedNode.textContent || '');
        highlightedNode.parentNode.replaceChild(textNode, highlightedNode);
        setHighlightedNode(null);
      }
    };
    cleanupHighlight();

    const container = previewRef.current;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const query = searchQueryDeferred.toLowerCase();
    let matchCount = 0;
    const targetIndex = state?.matchIndex || 0;

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.toLowerCase() || '';
      const idx = text.indexOf(query);
      if (idx >= 0) {
        if (matchCount === targetIndex) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + query.length);

          const mark = document.createElement('mark');
          mark.style.backgroundColor = '#FEF08A';
          mark.style.borderRadius = '3px';
          mark.style.padding = '1px 2px';
          mark.textContent = node.textContent?.slice(idx, idx + query.length) || '';

          const before = node.textContent?.slice(0, idx) || '';
          const after = node.textContent?.slice(idx + query.length) || '';

          const parent = node.parentNode;
          if (parent) {
            const beforeNode = document.createTextNode(before);
            const afterNode = document.createTextNode(after);
            parent.replaceChild(afterNode, node);
            parent.insertBefore(mark, afterNode);
            parent.insertBefore(beforeNode, mark);
          }

          setHighlightedNode(mark);
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

          setTimeout(() => {
            mark.animate(
              [
                { backgroundColor: '#FEF08A' },
                { backgroundColor: '#FFFFFF' },
                { backgroundColor: '#FEF08A' },
                { backgroundColor: '#FFFFFF' },
                { backgroundColor: '#FEF08A' },
              ],
              { duration: 1500, iterations: 1 }
            );
          }, 400);

          setTimeout(() => {
            cleanupHighlight();
          }, 6000);

          return;
        }
        matchCount++;
      }
    }
  }, [searchQueryDeferred, state?.matchIndex, currentDocument]);

  const renderMarkdownWithAnnotations = () => {
    const blocks = deferredContent.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    return (
      <div className="markdown-preview text-text" style={{ fontSize: '16px', lineHeight: 1.8 }}>
        {blocks.map((block, idx) => {
          const paras = paragraphAnnotations.get(idx) || [];
          const isActive = activeParagraphIdx === idx;

          return (
            <div key={idx} className="relative group">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveParagraphIdx(isActive ? null : idx);
                  setShowAnnotationInput(false);
                }}
                className={cn(
                  'absolute -left-10 top-1 p-1 rounded transition-all',
                  'opacity-0 group-hover:opacity-100',
                  paras.length > 0 ? 'opacity-100 text-primary' : 'text-slate-400 hover:text-primary hover:bg-blue-50'
                )}
                title={paras.length > 0 ? `${paras.length} 条批注` : '添加批注'}
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>

              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>

              {isActive && (
                <div className="absolute right-0 top-0 w-72 translate-x-full pl-3 z-20">
                  <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 space-y-3 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        批注 ({paras.length})
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveParagraphIdx(null);
                          setShowAnnotationInput(false);
                          setNewAnnotationText('');
                        }}
                        className="p-0.5 text-slate-400 hover:text-text rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {paras.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">暂无批注</p>
                    )}

                    {paras.map((a) => (
                      <AnnotationBubble key={a.id} annotation={a} docId={docId || ''} />
                    ))}

                    {showAnnotationInput ? (
                      <div className="space-y-2">
                        <textarea
                          value={newAnnotationText}
                          onChange={(e) => setNewAnnotationText(e.target.value)}
                          placeholder="输入批注内容..."
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded resize-none h-16 focus:outline-none focus:border-primary"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAnnotationInput(false);
                              setNewAnnotationText('');
                            }}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-text"
                          >
                            取消
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddAnnotation();
                            }}
                            disabled={!newAnnotationText.trim()}
                            className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
                          >
                            发送
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAnnotationInput(true);
                        }}
                        className="w-full px-3 py-1.5 text-xs text-primary bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        + 添加批注
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col bg-white"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-blue-50 transition-colors shrink-0"
            title="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="font-bold text-text bg-transparent outline-none focus:bg-slate-50 focus:border-b focus:border-primary rounded px-1 py-0.5 min-w-0"
            style={{ fontSize: '24px' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setVersionPanelOpen(!versionPanelOpen);
              if (!versionPanelOpen) {
                setSelectedVersionId(null);
                setSelectedVersionContent('');
              }
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              versionPanelOpen
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-text hover:bg-slate-200'
            )}
          >
            <History className="w-4 h-4" />
            版本历史
            <ChevronRight
              className={cn(
                'w-3.5 h-3.5 transition-transform',
                versionPanelOpen && 'rotate-90'
              )}
            />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-dark transition-colors"
          >
            <Save className="w-4 h-4" />
            保存
            <span className="text-xs opacity-70 ml-1">Ctrl+S</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div
          className={cn(
            'flex transition-all duration-300 min-w-0 h-full',
            versionPanelOpen ? 'flex-[2]' : 'flex-1'
          )}
        >
          <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">编辑</span>
            </div>
            <textarea
              ref={editorRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onScroll={handleEditorScroll}
              onKeyDown={handleKeyDown}
              className={cn(
                'flex-1 p-4 resize-none outline-none text-text',
                'text-base leading-[1.8] font-mono',
                'bg-white'
              )}
              placeholder="开始编写 Markdown 文档..."
              spellCheck={false}
            />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">预览</span>
            </div>
            <div
              ref={previewRef}
              className="flex-1 overflow-y-auto p-6 bg-white"
            >
              {renderMarkdownWithAnnotations()}
            </div>
          </div>
        </div>

        {versionPanelOpen && (
          <div className="w-96 shrink-0 border-l border-slate-200 bg-white flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                历史版本
              </span>
              <button
                onClick={() => {
                  setVersionPanelOpen(false);
                  setSelectedVersionId(null);
                  setSelectedVersionContent('');
                }}
                className="p-1 text-slate-400 hover:text-text rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedVersionId ? (
              <div className="flex-1 flex flex-col min-h-0">
                <button
                  onClick={() => {
                    setSelectedVersionId(null);
                    setSelectedVersionContent('');
                  }}
                  className="px-4 py-2 text-xs text-primary hover:bg-blue-50 border-b border-slate-100 text-left"
                >
                  ← 返回版本列表
                </button>
                <div className="flex-1 min-h-0">
                  <VersionDiff
                    oldContent={selectedVersionContent}
                    newContent={editContent}
                    oldLabel={`v${sortedVersions.find((v) => v.id === selectedVersionId)?.versionNumber || ''}`}
                    newLabel="当前编辑"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {sortedVersions.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    暂无历史版本
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sortedVersions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleSelectVersion(v.id)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text">
                            版本 v{v.versionNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(v.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
