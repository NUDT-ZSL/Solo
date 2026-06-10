import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { renderMarkdown } from '@/utils/markdown';
import { emotionNames, emotionColors } from '@/utils/emotion';
import { playUnlockSound } from '@/utils/audio';
import type { Letter } from '../../shared/types';

export default function ViewLetter() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const fetchLetter = async () => {
      if (!token || !id) return;
      try {
        const res = await fetch(`/api/letters/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLetter(data);
          if (data.isUnlocked && !hasPlayed) {
            playUnlockSound();
            setHasPlayed(true);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLetter();
  }, [id, token, hasPlayed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[var(--color-text-muted)]">加载中...</div>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="glass-card-strong p-12">
          <p className="text-[var(--color-text-secondary)] mb-6">信件不存在或你没有权限查看</p>
          <Link to="/dashboard" className="text-[var(--color-primary)] hover:underline">
            返回个人面板
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="glass-card-strong p-8">
        <div className="mb-6 pb-6 border-b border-[var(--color-border)]">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span
              className="px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: emotionColors[letter.emotion] }}
            >
              {emotionNames[letter.emotion]}
            </span>
            <span className="text-sm text-[var(--color-text-muted)]">
              {new Date(letter.createdAt).toLocaleString('zh-CN')} 封存
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-family-serif)' }}>
            {letter.title}
          </h1>
        </div>

        {letter.isUnlocked ? (
          <div
            className="prose prose-lg max-w-none"
            style={{ fontFamily: 'var(--font-family-serif)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(letter.content) }}
          />
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔒</div>
            <p className="text-[var(--color-text-secondary)] mb-2">这封信还在时光中封存</p>
            <p className="text-[var(--color-primary-dark)] font-medium">
              解锁时间：{new Date(letter.unlockAt).toLocaleString('zh-CN')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
