import { useState } from 'react';
import { MessageSquare, Reply, Trash2, X } from 'lucide-react';
import type { Annotation } from '@/types';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { cn } from '@/lib/utils';

interface AnnotationBubbleProps {
  annotation: Annotation;
  docId: string;
}

export default function AnnotationBubble({ annotation, docId }: AnnotationBubbleProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const updateAnnotation = useKnowledgeStore((s) => s.updateAnnotation);
  const deleteAnnotation = useKnowledgeStore((s) => s.deleteAnnotation);
  const replyToAnnotation = useKnowledgeStore((s) => s.replyToAnnotation);

  const toggleRead = () => {
    updateAnnotation(annotation.id, { isRead: !annotation.isRead } as Partial<Annotation>);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    await replyToAnnotation(annotation.id, replyContent.trim());
    setReplyContent('');
    setShowReplyForm(false);
  };

  const handleDelete = () => {
    deleteAnnotation(annotation.id);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'bg-annotation-bg rounded-lg p-3 shadow-sm border border-yellow-200',
          'transition-all duration-200'
        )}
      >
        {!annotation.isRead && (
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        )}

        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              {annotation.userId.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-text">{annotation.userId}</span>
            <span className="text-xs text-slate-400">{formatTime(annotation.createdAt)}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleRead}
              className={cn(
                'p-1 rounded transition-colors text-xs',
                annotation.isRead
                  ? 'text-slate-400 hover:text-primary'
                  : 'text-primary hover:text-primary-dark'
              )}
              title={annotation.isRead ? '标记为未读' : '标记为已读'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
              title="删除批注"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-sm text-text leading-relaxed">{annotation.content}</p>

        {annotation.replies && annotation.replies.length > 0 && (
          <div className="mt-2 ml-3 pl-3 border-l-2 border-yellow-300 space-y-2">
            {annotation.replies.map((reply) => (
              <div key={reply.id} className="text-sm">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-medium text-text">{reply.userId}</span>
                  <span className="text-xs text-slate-400">{formatTime(reply.createdAt)}</span>
                </div>
                <p className="text-text leading-relaxed">{reply.content}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
          >
            <Reply className="w-3 h-3" />
            回复
          </button>
        </div>

        {showReplyForm && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              placeholder="输入回复..."
              className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-primary"
              autoFocus
            />
            <button
              onClick={handleReply}
              disabled={!replyContent.trim()}
              className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              发送
            </button>
            <button
              onClick={() => { setShowReplyForm(false); setReplyContent(''); }}
              className="p-1 text-slate-400 hover:text-text transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
