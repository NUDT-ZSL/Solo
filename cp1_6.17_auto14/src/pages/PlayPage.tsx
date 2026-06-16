import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Player from '../components/Player';
import type { Mixtape, Comment, Sticker } from '../types';

const PlayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [mixtape, setMixtape] = useState<Mixtape | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const response = await fetch(`/api/mixtapes/${id}`);
        if (!response.ok) {
          throw new Error('混音带不存在');
        }
        const data = await response.json();
        setMixtape(data.mixtape);
        setComments(data.comments);
        setStickers(data.stickers);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '16px',
        color: 'var(--text-secondary)'
      }}>
        <span style={{ animation: 'pulse 1s infinite' }}>加载中...</span>
      </div>
    );
  }

  if (error || !mixtape) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😢</div>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{error || '混音带不存在'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          请检查链接是否正确，或返回广场浏览其他混音带
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 32px',
            background: 'var(--accent)',
            borderRadius: 'var(--border-radius)',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          返回广场
        </button>
      </div>
    );
  }

  return <Player mixtape={mixtape} initialComments={comments} initialStickers={stickers} />;
};

export default PlayPage;
