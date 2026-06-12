import { useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export default function MarkdownEditor({ value, onChange, onSave }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const handleEditorScroll = useCallback(() => {
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
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave();
    }
  };

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">编辑</span>
        </div>
        <textarea
          ref={editorRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
          <div className="markdown-preview max-w-none text-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
