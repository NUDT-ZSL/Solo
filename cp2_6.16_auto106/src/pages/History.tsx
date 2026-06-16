import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DishRecord } from '../types';

function getRatingGradient(rating: number): string {
  if (rating === 5) return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
  if (rating === 4) return 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)';
  if (rating === 3) return 'linear-gradient(135deg, #fefce8 0%, #fde047 100%)';
  return 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)';
}

function DishCard({ record }: { record: DishRecord }) {
  const navigate = useNavigate();
  const shownIngredients = record.ingredients.slice(0, 4);
  const extraCount = record.ingredients.length - 4;

  return (
    <div
      onClick={() => navigate(`/history/${record.id}`)}
      className="card-hover"
      style={{
        width: 300,
        height: 160,
        maxWidth: '100%',
        borderRadius: 12,
        background: getRatingGradient(record.rating),
        padding: 16,
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          fontSize: 11,
          color: 'rgba(28, 25, 23, 0.5)',
          fontWeight: 500,
        }}
      >
        {new Date(record.createdAt).toLocaleDateString('zh-CN', {
          month: 'numeric',
          day: 'numeric',
        })}
      </div>

      <div style={{ display: 'flex', flex: 1, gap: 12 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 8,
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              paddingRight: 60,
            }}
          >
            {record.name}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 10,
            }}
          >
            {record.textureTags.map((t) => (
              <span
                key={t}
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: '#f97316',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                style={{
                  fontSize: 14,
                  color: i < record.rating ? '#f59e0b' : 'rgba(28, 25, 23, 0.2)',
                }}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            width: '45%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: 5,
          }}
        >
          {shownIngredients.map((ing, idx) => (
            <span
              key={idx}
              style={{
                padding: '2px 6px',
                borderRadius: 8,
                background: 'rgba(28, 25, 23, 0.08)',
                color: 'var(--color-text)',
                fontSize: 11,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ing}
            </span>
          ))}
          {extraCount > 0 && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 8,
                background: 'rgba(249, 115, 22, 0.2)',
                color: 'var(--color-primary)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              +{extraCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const [records, setRecords] = useState<DishRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  useEffect(() => {
    fetch('/api/records')
      .then((r) => r.json())
      .then((data: DishRecord[]) => setRecords(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterRating === 'all' ? records : records.filter((r) => r.rating === filterRating);

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-light)' }}>
          正在加载历史记录...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>📚</span> 美食历史
        <span
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--color-text-light)',
            background: 'var(--color-gray-100)',
            padding: '4px 12px',
            borderRadius: 999,
          }}
        >
          共 {records.length} 条
        </span>
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {(['all', 5, 4, 3, 2] as const).map((f) => (
          <button
            key={String(f)}
            onClick={() => setFilterRating(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              transition: 'var(--transition)',
              background: filterRating === f ? 'var(--color-primary)' : 'white',
              color: filterRating === f ? 'white' : 'var(--color-text)',
              border: '1px solid',
              borderColor: filterRating === f ? 'var(--color-primary)' : 'var(--color-gray-200)',
              boxShadow: filterRating === f ? '0 4px 12px rgba(249, 115, 22, 0.3)' : 'none',
            }}
          >
            {f === 'all' ? '全部' : `${f}星`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '60px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>🍽️</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {records.length === 0 ? '还没有任何记录' : '没有符合条件的记录'}
          </h3>
          <p style={{ color: 'var(--color-text-light)', marginBottom: 20, fontSize: 14 }}>
            {records.length === 0
              ? '开始探索美食世界，记录你的第一次风味体验吧！'
              : '试试其他筛选条件看看'}
          </p>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, 300px)',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {filtered.map((r) => (
            <DishCard key={r.id} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}
