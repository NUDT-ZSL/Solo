import { useStore } from '@/store/useStore';
import { Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
  const { comments, nickname, sendComment, setNickname } = useStore();
  const [content, setContent] = useState('');
  const [localNickname, setLocalNickname] = useState(nickname);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = content.trim();
    const trimmedNickname = localNickname.trim();
    if (!trimmedContent || !trimmedNickname) return;

    setNickname(trimmedNickname);
    sendComment(pollId, trimmedContent);
    setContent('');
  };

  const pollComments = comments.filter((c) => c.pollId === pollId);

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-6">
      <h3 className="font-bold text-gray-900 text-lg mb-4">评论区</h3>

      <div className="max-h-96 overflow-y-auto space-y-3 mb-4">
        {pollComments.length === 0 ? (
          <div className="text-center text-gray-400 py-6">暂无评论，快来抢沙发吧！</div>
        ) : (
          pollComments.map((comment, index) => (
            <div
              key={comment.id || index}
              className="comment-bubble bg-[#f0f0f0] rounded-xl px-4 py-3 slide-in-up"
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
          ))
        )}
        <div ref={commentsEndRef} />
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
