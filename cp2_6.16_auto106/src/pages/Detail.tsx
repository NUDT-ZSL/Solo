import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DishRecord, FLAVOR_AXES, FLAVOR_LABELS } from '../types';
import RadarChart from '../components/RadarChart';

function getRatingGradient(rating: number): string {
  if (rating === 5) return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
  if (rating === 4) return 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)';
  if (rating === 3) return 'linear-gradient(135deg, #fefce8 0%, #fde047 100%)';
  return 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)';
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<DishRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetch('/api/records')
      .then((r) => r.json())
      .then((data: DishRecord[]) => {
        const found = data.find((r) => r.id === id);
        setRecord(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => navigate('/history'), 250);
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-light)' }}>
          正在加载详情...
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="page">
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>❓</div>
          <h3 style={{ marginBottom: 8 }}>未找到该记录</h3>
          <button className="btn btn-primary" onClick={() => navigate('/history')}>
            返回历史列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        padding: 0,
        background: 'rgba(28, 25, 23, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
        animation: closing ? 'fadeOut 0.25s ease forwards' : 'fadeIn 0.3s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slideOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(20px); } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: getRatingGradient(record.rating),
          borderRadius: 24,
          padding: 32,
          width: '92%',
          maxWidth: 820,
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          animation: closing ? 'slideOut 0.25s ease forwards' : 'slideIn 0.3s ease',
        }}
      >
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: 'var(--color-text)',
            transition: 'var(--transition)',
            fontWeight: 300,
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.6)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)';
          }}
        >
          ×
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              flexShrink: 0,
            }}
          >
            🍽️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 800,
                marginBottom: 6,
                color: 'var(--color-text)',
              }}
            >
              {record.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 18,
                      color: i < record.rating ? '#f59e0b' : 'rgba(28, 25, 23, 0.2)',
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'var(--color-text-light)' }}>
                {new Date(record.createdAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: 24 }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              backdropFilter: 'blur(8px)',
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🏷️</span> 口感标签
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {record.textureTags.map((t) => (
                <span
                  key={t}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 16,
                    background: 'var(--color-primary)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginTop: 24,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🥬</span> 食材列表
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {record.ingredients.map((ing, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: 'var(--color-gray-100)',
                    color: 'var(--color-text)',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {ing}
                </span>
              ))}
              {record.ingredients.length === 0 && (
                <span style={{ fontSize: 13, color: 'var(--color-text-light)' }}>暂无食材信息</span>
              )}
            </div>

            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginTop: 24,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📝</span> 烹饪心得
            </h3>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: 'var(--color-text)',
                whiteSpace: 'pre-wrap',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                minHeight: 60,
              }}
            >
              {record.note || '暂无备注'}
            </p>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🎯</span> 风味分析
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart data={record.flavor} size={280} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {FLAVOR_AXES.map((key) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--color-gray-50)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: 'var(--color-text-light)' }}>{FLAVOR_LABELS[key]}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: record.flavor[key] >= 7 ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    {record.flavor[key]}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 28,
            gap: 12,
          }}
        >
          <button
            onClick={handleClose}
            className="btn btn-secondary"
            style={{ padding: '10px 22px' }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
