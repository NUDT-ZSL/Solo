import { useState } from 'react';
import useActivityStore from '@/store';
import { getSocket } from '@/App';

interface OptionInput {
  id: string;
  text: string;
}

let optIdCounter = 0;
function nextOptId() {
  return `opt_${++optIdCounter}_${Date.now()}`;
}

export default function HostPanel() {
  const isHost = useActivityStore((s) => s.isHost);
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<OptionInput[]>([
    { id: nextOptId(), text: '' },
    { id: nextOptId(), text: '' },
  ]);
  const [voteType, setVoteType] = useState<'single' | 'multiple'>('single');
  const [duration, setDuration] = useState(60);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isHost) return null;

  const addOption = () => {
    setOptions([...options, { id: nextOptId(), text: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((o) => o.id !== id));
  };

  const updateOptionText = (id: string, text: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const handleCreateVote = async () => {
    if (!title.trim()) return;
    const validOptions = options.filter((o) => o.text.trim());
    if (validOptions.length < 2) return;

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          options: validOptions.map((o) => o.text.trim()),
          type: voteType,
          duration,
        }),
      });
      if (res.ok) {
        setTitle('');
        setOptions([{ id: nextOptId(), text: '' }, { id: nextOptId(), text: '' }]);
      }
    } catch (err) {
      console.error('Failed to create vote:', err);
    }
  };

  const handleEmojiRain = (type: string) => {
    const socket = getSocket();
    socket.emit('trigger_emoji_rain', { type });
  };

  const voteForm = (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-lg font-bold text-white">发起投票</h3>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="投票标题"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-primary/50 focus:shadow-[0_0_10px_rgba(0,210,255,0.3)]"
      />

      <div className="flex flex-col gap-2">
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input
              value={opt.text}
              onChange={(e) => updateOptionText(opt.id, e.target.value)}
              placeholder={`选项 ${idx + 1}`}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-primary/50 focus:shadow-[0_0_10px_rgba(0,210,255,0.3)]"
            />
            <button
              onClick={() => removeOption(opt.id)}
              disabled={options.length <= 2}
              className="ripple-btn h-8 w-8 overflow-hidden rounded-lg bg-red-500/20 text-sm text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addOption}
          className="ripple-btn overflow-hidden rounded-lg border border-dashed border-white/20 py-2 text-sm text-gray-400 transition-colors hover:border-primary/40 hover:text-primary"
        >
          + 添加选项
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">类型</span>
        <button
          onClick={() => setVoteType('single')}
          className={`ripple-btn overflow-hidden rounded-lg px-3 py-1.5 text-sm transition-colors ${
            voteType === 'single'
              ? 'bg-primary/20 text-primary'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          单选
        </button>
        <button
          onClick={() => setVoteType('multiple')}
          className={`ripple-btn overflow-hidden rounded-lg px-3 py-1.5 text-sm transition-colors ${
            voteType === 'multiple'
              ? 'bg-primary/20 text-primary'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          多选
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">时长</span>
          <span className="text-sm font-bold text-primary">{duration}s</span>
        </div>
        <input
          type="range"
          min={10}
          max={300}
          step={10}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <button
        onClick={handleCreateVote}
        className="ripple-btn overflow-hidden rounded-xl bg-gradient-to-r from-primary to-secondary py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        发起投票
      </button>

      <div className="border-t border-white/10 pt-4">
        <h3 className="mb-3 font-display text-lg font-bold text-white">表情雨</h3>
        <div className="flex gap-3">
          {['❤️', '🎉', '🔥'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiRain(emoji)}
              className="ripple-btn flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-2xl transition-colors hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block">
        <div className="glass-panel h-full overflow-y-auto rounded-2xl p-5">
          {voteForm}
        </div>
      </div>

      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-lg font-bold text-white shadow-lg shadow-primary/30"
        >
          {mobileOpen ? '✕' : '⚙️'}
        </button>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <div
          className={`fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-darkLight/95 p-5 shadow-2xl backdrop-blur-md transition-transform duration-300 ${
            mobileOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
          {voteForm}
        </div>
      </div>
    </>
  );
}
