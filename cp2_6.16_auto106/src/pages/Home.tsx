import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RadarChart from '../components/RadarChart';
import { DishRecord, FlavorRating, FLAVOR_AXES, FLAVOR_LABELS } from '../types';

const emptyFlavor: FlavorRating = { spicy: 0, sweet: 0, salty: 0, sour: 0, umami: 0 };

function calcAvgFlavor(records: DishRecord[]): FlavorRating {
  if (records.length === 0) return emptyFlavor;
  const recent = records.slice(0, 5);
  const avg = { ...emptyFlavor };
  for (const key of FLAVOR_AXES) {
    const sum = recent.reduce((s, r) => s + (r.flavor[key] || 0), 0);
    avg[key] = Math.round((sum / recent.length) * 10) / 10;
  }
  return avg;
}

function getRecentLabels(records: DishRecord[]): string[] {
  const recent = records.slice(0, 5);
  return FLAVOR_AXES.map((_, i) => {
    const r = recent[i];
    return r ? r.name : FLAVOR_LABELS[FLAVOR_AXES[i]];
  });
}

export default function Home() {
  const [records, setRecords] = useState<DishRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [flavorData, setFlavorData] = useState<FlavorRating>(emptyFlavor);
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    const start = performance.now();
    fetch('/api/records')
      .then((r) => r.json())
      .then((data: DishRecord[]) => {
        setRecords(data);
        setFlavorData(calcAvgFlavor(data));
        setLabels(getRecentLabels(data));
        const elapsed = performance.now() - start;
        console.log(`Home data load took ${elapsed}ms`);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const recentRecords = records.slice(0, 3);
  const totalCount = records.length;
  const avgRating =
    totalCount > 0
      ? (records.reduce((s, r) => s + r.rating, 0) / totalCount).toFixed(1)
      : '0.0';

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-light)' }}>
          正在加载风味数据...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div
        style={{
          background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #f97316 100%)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -20,
            fontSize: 120,
            opacity: 0.15,
          }}
        >
          🍽️
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#7c2d12',
            marginBottom: 8,
            position: 'relative',
            zIndex: 1,
          }}
        >
          你好，美食探索者！
        </h1>
        <p style={{ color: '#9a3412', fontSize: 15, position: 'relative', zIndex: 1 }}>
          记录每一次风味奇遇，品味生活的美好
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginTop: 24,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.85)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ea580c' }}>{totalCount}</div>
            <div style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>累计记录</div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.85)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ea580c' }}>⭐ {avgRating}</div>
            <div style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>平均评分</div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.85)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ea580c' }}>
              {new Set(records.flatMap((r) => r.ingredients)).size}
            </div>
            <div style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>探索食材</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🎯</span> 风味雷达图
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart data={flavorData} labels={labels} size={360} />
          </div>
          <p
            style={{
              marginTop: 16,
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--color-text-light)',
            }}
          >
            基于最近 {Math.min(records.length, 5)} 条记录的平均风味评分
          </p>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span> 最近记录
            </h2>
            <Link
              to="/history"
              style={{
                fontSize: 13,
                color: 'var(--color-primary)',
                fontWeight: 500,
              }}
            >
              查看全部 →
            </Link>
          </div>

          {recentRecords.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 0',
                color: 'var(--color-text-light)',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🍱</div>
              <p style={{ marginBottom: 16 }}>还没有任何记录</p>
              <Link
                to="/record"
                className="btn btn-primary"
                style={{ display: 'inline-flex' }}
              >
                + 开始记录
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentRecords.map((r) => (
                <Link
                  key={r.id}
                  to={`/history/${r.id}`}
                  className="card-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: 'var(--color-gray-50)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                      {r.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.textureTags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: 'var(--color-primary)',
                            color: 'white',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#f59e0b', fontSize: 14 }}>
                      {'⭐'.repeat(r.rating)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-light)', marginTop: 4 }}>
                      {new Date(r.createdAt).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 32,
          textAlign: 'center',
        }}
      >
        <Link
          to="/record"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 32px',
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 15,
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.35)',
            transition: 'var(--transition)',
          }}
          className="card-hover"
        >
          <span style={{ fontSize: 18 }}>+</span>
          记录新菜品
        </Link>
      </div>
    </div>
  );
}
