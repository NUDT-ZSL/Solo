import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGalleryStore } from '@/lib/store';
import { ArrowLeft, Copy, Check, MessageCircle, Send } from 'lucide-react';

function TypewriterComment({ content, delay }: { content: string; delay: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayed(content.slice(0, idx));
      if (idx >= content.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [started, content]);

  if (!started) return null;

  return (
    <div className="comment-bubble animate-slide-up">
      <p className="text-sm text-gray-700 font-body leading-relaxed">
        {displayed}
        {displayed.length < content.length && (
          <span className="inline-block w-0.5 h-4 bg-[#7C83FD] ml-0.5 animate-pulse align-middle" />
        )}
      </p>
    </div>
  );
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { detail, detailLoading, loadDetail, submitComment } = useGalleryStore();
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const commentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadDetail(id);
  }, [id, loadDetail]);

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.comments.length]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id || submitting) return;
    setSubmitting(true);
    try {
      await submitComment(id, commentText.trim());
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!detail) return;
    const url = `${window.location.origin}/detail/${detail.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (detailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#7C83FD] border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 font-body">加载中...</span>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-gray-500 font-body">图片不存在</p>
          <button onClick={() => navigate('/')} className="btn-gradient mt-4 px-5 py-2 text-sm">
            返回画廊
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-[#7C83FD] transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-body hidden sm:inline">返回画廊</span>
          </button>
          <h1 className="font-display text-lg font-bold bg-gradient-to-r from-[#7C83FD] to-[#A855F7] bg-clip-text text-transparent truncate">
            图片详情
          </h1>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="glass-panel p-4 sm:p-6 animate-fade-in-up">
          <img
            src={detail.image_url}
            alt={detail.description || '画廊图片'}
            className="w-full rounded-xl object-contain max-h-[70vh] animate-fade-in"
          />

          {detail.description && (
            <p className="mt-4 text-gray-700 font-body text-base leading-relaxed">
              {detail.description}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm glass-card hover:bg-white/60 transition-colors"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              <span className="text-gray-500 font-body">{copied ? '已复制' : '复制链接'}</span>
            </button>
            <span className="text-xs text-gray-300 font-body">
              {new Date(detail.created_at).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <h2 className="font-display text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MessageCircle size={18} className="text-[#7C83FD]" />
            匿名评论
            {detail.comments.length > 0 && (
              <span className="text-sm font-body font-normal text-gray-400">({detail.comments.length})</span>
            )}
          </h2>

          {detail.comments.length === 0 && (
            <p className="text-sm text-gray-300 font-body py-4 text-center">
              还没有评论，来说点什么吧
            </p>
          )}

          <div className="space-y-3">
            {detail.comments.map((comment, i) => (
              <TypewriterComment key={comment.id} content={comment.content} delay={i * 150} />
            ))}
            <div ref={commentEndRef} />
          </div>

          <div className="mt-6 flex gap-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => {
                if (e.target.value.length <= 50) setCommentText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitComment();
              }}
              placeholder="写下你的评论（最多50字）"
              maxLength={50}
              className="flex-1 px-4 py-3 rounded-full border border-gray-200/60 bg-white/50
                text-sm font-body text-gray-700 placeholder:text-gray-300
                focus:outline-none focus:border-[#7C83FD]/40 focus:ring-2 focus:ring-[#7C83FD]/10
                transition-all"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
              className="btn-gradient px-5 py-3 text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              <Send size={14} />
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-300 font-body text-right">
            {commentText.length}/50
          </p>
        </div>
      </main>
    </div>
  );
}
