import { useState } from 'react';
import { EchoComment as EchoCommentType, EMOTION_EMOJIS, Emotion } from '../PoemEngine';
import { Send, Smile } from 'lucide-react';

interface EchoCommentProps {
  echoes: EchoCommentType[];
  onSubmit: (content: string, emoji: string) => void;
  isLoggedIn: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return dateStr;
}

export default function EchoComment({ echoes, onSubmit, isLoggedIn }: EchoCommentProps) {
  const [content, setContent] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const handleSubmit = () => {
    if (!content.trim() || !selectedEmoji) return;
    onSubmit(content.trim(), selectedEmoji);
    setContent('');
    setSelectedEmoji('');
    setShowPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      {echoes.map((echo) => (
        <div
          key={echo.id}
          className="flex items-start gap-3 p-3 rounded-xl bg-white/50 backdrop-blur-md border border-white/30"
        >
          <span className="text-2xl flex-shrink-0">{echo.emoji}</span>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-serif text-amber-dark">{echo.author}</span>
            <p className="text-sm font-serif text-poem-text mt-0.5">{echo.content}</p>
            <span className="text-xs text-poem-muted mt-1 block">
              {formatRelativeTime(echo.createdAt)}
            </span>
          </div>
        </div>
      ))}

      {!isLoggedIn ? (
        <p className="text-center text-sm text-poem-muted font-serif py-4">
          登录后即可发表回声
        </p>
      ) : (
        <div className="mt-4 p-4 rounded-xl bg-white/50 backdrop-blur-md border border-white/30">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 200))}
              onKeyDown={handleKeyDown}
              placeholder="写下你的回声..."
              maxLength={200}
              className="flex-1 bg-white/60 border border-warmgray/50 rounded-lg px-3 py-2 text-sm font-serif text-poem-text placeholder:text-poem-muted/50 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition"
            />
            <button
              type="button"
              onClick={() => setShowPicker((prev) => !prev)}
              className="p-2 rounded-lg hover:bg-white/60 transition text-poem-muted"
            >
              <Smile size={20} />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!content.trim() || !selectedEmoji}
              className="p-2 rounded-lg bg-amber/20 text-amber-dark hover:bg-amber/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>

          {showPicker && (
            <div className="flex flex-wrap gap-2 mt-2 p-2 bg-white/70 rounded-lg border border-white/30">
              {EMOTION_EMOJIS.map((emoji: string) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji === selectedEmoji ? '' : emoji)}
                  className={`text-2xl cursor-pointer hover:scale-125 transition-transform p-1 rounded hover:bg-amber/10 ${
                    selectedEmoji === emoji ? 'ring-2 ring-amber' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="text-xs text-poem-muted text-right mt-1">
            {content.length}/200
          </div>
        </div>
      )}
    </div>
  );
}
