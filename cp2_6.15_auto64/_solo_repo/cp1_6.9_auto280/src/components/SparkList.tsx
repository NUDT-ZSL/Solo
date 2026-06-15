import { useState, useEffect, useCallback } from 'react';
import type { TopSpark } from '../types';
import { sparkApi } from '../api';
import { hslToString, mixHue } from '../utils';

interface SparkListProps {
  onSparkClick?: (spark: TopSpark) => void;
}

export default function SparkList({ onSparkClick }: SparkListProps) {
  const [sparks, setSparks] = useState<TopSpark[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSparks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sparkApi.getTop();
      setSparks(data);
    } catch (e) {
      console.error('获取火花榜失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSparks();
    const timer = setInterval(fetchSparks, 5000);
    return () => clearInterval(timer);
  }, [fetchSparks]);

  const cardGradient = (fromHue: number, toHue: number) => {
    const midHue = mixHue(fromHue, toHue, 0.5);
    return `linear-gradient(135deg, ${hslToString(fromHue, 70, 55, 0.45)} 0%, ${hslToString(midHue, 70, 50, 0.4)} 50%, ${hslToString(toHue, 70, 55, 0.45)} 100%)`;
  };

  return (
    <aside className="spark-list">
      <div className="spark-list-header">
        <span className="spark-list-title">✨ 火花榜</span>
        <button
          className={`spark-list-refresh ${loading ? 'spinning' : ''}`}
          onClick={fetchSparks}
          title="刷新榜单"
        >
          ↻
        </button>
      </div>

      {sparks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💫</div>
          <div className="empty-state-text">
            {loading ? '加载中...' : '暂无火花，快去连接节点创造灵感吧！'}
          </div>
        </div>
      ) : (
        sparks.map((spark, index) => (
          <div
            key={spark.id}
            className="spark-card"
            style={{ background: cardGradient(spark.fromHue, spark.toHue) }}
            onClick={() => onSparkClick?.(spark)}
          >
            <span className="spark-card-rank">#{index + 1}</span>
            <div className="spark-card-content">
              <div className="spark-card-text">{spark.spark}</div>
              <div className="spark-card-meta">
                <div className="spark-card-nodes">
                  <span className="spark-card-node">{spark.fromText}</span>
                  <span>→</span>
                  <span className="spark-card-node">{spark.toText}</span>
                </div>
                <div className="spark-card-likes">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="#ff6584"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  {spark.likes}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </aside>
  );
}
