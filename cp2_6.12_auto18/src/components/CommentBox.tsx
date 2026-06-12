import { useStore } from '@/store/useStore';
import { Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Comment {
  id: string;
  pollId: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: number;
}

interface CommentBoxProps {
  pollId: string;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function CommentBox({ pollId }: CommentBoxProps) {
  const {
    comments: storeComments,
    nickname,
    sendComment,
    setNickname,
    isLoggedIn,
    setShowLoginModal,
    fetchCommentsPage,
  } = useStore();

  const [content, setContent] = useState('');
  const [localNickname, setLocalNickname] = useState(nickname);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const rafPending = useRef(false);
  const pendingComments = useRef<Comment[]>([]);
  const isInitialLoad = useRef(true);

  const PAGE_LIMIT = 20;

  const flushWithRAF = () => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      if (pendingComments.current.length > 0) {
        const toAdd = pendingComments.current;
        pendingComments.current = [];
        setAllComments((prev) => [...prev, ...toAdd]);
        setNewCommentIds((prev) => {
          const next = new Set(prev);
          toAdd.forEach((c) => next.add(c.id));
          return next;
        });
        setTimeout(() => {
          setNewCommentIds((prev) => {
            const next = new Set(prev);
            toAdd.forEach((c) => next.delete(c.id));
            return next;
          });
        }, 1000);
      }
      rafPending.current = false;
    });
  };

  useEffect(() => {
    let mounted = true;
    isInitialLoad.current = true;

    const loadInitial = async () => {
      try {
        setLoadingMore(true);
        const result = await fetchCommentsPage(pollId, 0, PAGE_LIMIT);
        if (!mounted) return;
        setAllComments(result.comments);
        setHasMore(result.hasMore);
        setPage(1);
      } catch (e) {
        console.error('Failed to fetch comments', e);
      } finally {
        if (mounted) {
          setLoadingMore(false);
          isInitialLoad.current = false;
        }
      }
    };

    loadInitial();

    return () => {
      mounted = false;
    };
  }, [pollId, fetchCommentsPage]);

  useEffect(() => {
    const pollStoreComments = storeComments.filter((c) => c.pollId === pollId);
    if (pollStoreComments.length === 0) return;

    const existingIds = new Set(allComments.map((c) => c.id));
    const newFromStore = pollStoreComments.filter((c) => !existingIds.has(c.id));

    if (newFromStore.length > 0) {
      pendingComments.current = [...pendingComments.current, ...newFromStore];
      flushWithRAF();
    }
  }, [storeComments, pollId, allComments]);

  const loadOlderComments = async () => {
    if (loadingMore || !hasMore) return;

    const container = containerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    const prevScrollTop = container?.scrollTop || 0;

    try {
      setLoadingMore(true);
      const offset = page * PAGE_LIMIT;
      const result = await fetchCommentsPage(pollId, offset, PAGE_LIMIT);

      setAllComments((prev) => [...result.comments, ...prev]);
      setHasMore(result.hasMore);
      setPage((p) => p + 1);

      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
        }
      });
    } catch (e) {
      console.error('Failed to load more comments', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || loadingMore || !hasMore || isInitialLoad.current) return;

    if (container.scrollTop < 50) {
      loadOlderComments();
    }
  };

  useEffect(() => {
    if (allComments.length === 0) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    const trimmedContent = content.trim();
    const trimmedNickname = localNickname.trim();
    if (!trimmedContent || !trimmedNickname) return;

    setNickname(trimmedNickname);
    sendComment(pollId, trimmedContent);
    setContent('');
  };

  const newCommentList = Array.from(newCommentIds);

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-6">
      <h3 className="font-bold text-gray-900 text-lg mb-4">评论区</h3>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-96 overflow-y-auto space-y-3 mb-4 scroll-smooth"
      >
        {loadingMore && hasMore && (
          <div className="text-center text-gray-400 py-2 text-sm">
            加载中...
          </div>
        )}

        {allComments.length === 0 && !loadingMore ? (
          <div className="text-center text-gray-400 py-6">暂无评论，快来抢沙发吧！</div>
        ) : (
          allComments.map((comment, index) => {
            const isNew = newCommentIds.has(comment.id);
            const newIndex = newCommentList.indexOf(comment.id);
            const delay = isNew && newIndex >= 0 ? `${Math.min(newIndex, 5) * 50}ms` : '0ms';

            return (
              <div
                key={comment.id || index}
                className={`comment-bubble bg-[#f0f0f0] rounded-xl px-4 py-3 ${
                  isNew ? 'slide-in-up' : ''
                }`}
                style={{
                  ...(isNew ? { animationDelay: delay } : {}),
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-800">
                    {comment.nickname}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={localNickname}
            onChange={(e) => setLocalNickname(e.target.value)}
            placeholder="你的昵称"
            maxLength={20}
            className="w-32 shrink-0 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          />
          <div className="flex-1 relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 200))}
              placeholder="写下你的想法..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
            />
            <span className="absolute bottom-1 right-2 text-xs text-gray-400">
              {content.length}/200
            </span>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!content.trim() || !localNickname.trim()}
            className="btn-interactive flex items-center gap-1.5 bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
