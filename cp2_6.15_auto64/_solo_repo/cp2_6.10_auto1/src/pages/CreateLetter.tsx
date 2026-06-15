import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function CreateLetter() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<'happy' | 'sad' | 'expect' | 'emotion'>('happy');
  const [unlockDate, setUnlockDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          emotion,
          unlockAt: new Date(unlockDate).getTime(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/letter/${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="glass-card-strong p-8">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-family-serif)' }}>
          写一封时光信件
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">
              信件标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这封信起个名字..."
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">
              信件内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下你想对未来说的话..."
              rows={10}
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all resize-none"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">
                此刻心情
              </label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all"
              >
                <option value="happy">喜悦</option>
                <option value="sad">忧伤</option>
                <option value="expect">期待</option>
                <option value="emotion">感动</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">
                解锁时间
              </label>
              <input
                type="datetime-local"
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            }}
          >
            {loading ? '封存中...' : '封存信件，等待时光'}
          </button>
        </form>
      </div>
    </div>
  );
}
