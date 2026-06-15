import React, { useState, useEffect } from 'react';

interface Prediction {
  id: string;
  name: string;
  category: string;
  recentConsumption: number;
  predictedConsumption: number;
  suggestedReplenishment: number;
}

function PredictionPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictionDays, setPredictionDays] = useState(7);
  const [replenishFactor, setReplenishFactor] = useState(1.2);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/inventory/prediction?days=${predictionDays}&factor=${replenishFactor}`)
      .then((r) => r.json())
      .then((data) => {
        setPredictions(data);
        setLoading(false);
        setFadeKey((prev) => prev + 1);
      })
      .catch(() => setLoading(false));
  }, [predictionDays, replenishFactor]);

  const needsReplenishment = predictions.filter((p) => p.suggestedReplenishment > 0);
  const noReplenishment = predictions.filter((p) => p.suggestedReplenishment === 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 700, color: '#fff' }}>补货预测</h2>

      <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f0f4f8', marginBottom: 16 }}>预测参数设置</h3>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, color: '#8899aa' }}>预测天数</label>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                background: 'rgba(74, 158, 255, 0.15)',
                color: '#4a9eff',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                minWidth: 40,
                textAlign: 'center',
              }}>
                {predictionDays} 天
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={predictionDays}
              onChange={(e) => setPredictionDays(parseInt(e.target.value))}
              style={{ width: '100%', height: 6, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7f94', marginTop: 4 }}>
              <span>1 天</span>
              <span>30 天</span>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, color: '#8899aa' }}>建议补货系数</label>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                minWidth: 40,
                textAlign: 'center',
              }}>
                {replenishFactor.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={replenishFactor}
              onChange={(e) => setReplenishFactor(parseFloat(e.target.value))}
              style={{ width: '100%', height: 6, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7f94', marginTop: 4 }}>
              <span>0.5</span>
              <span>2.0</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#8899aa' }}>需补货物品:</span>
            <span style={{ fontSize: 14, color: '#fbbf24', fontWeight: 600 }}>{needsReplenishment.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#8899aa' }}>库存充足物品:</span>
            <span style={{ fontSize: 14, color: '#34d399', fontWeight: 600 }}>{noReplenishment.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#8899aa' }}>预测总补货量:</span>
            <span style={{ fontSize: 14, color: '#4a9eff', fontWeight: 600 }}>
              {needsReplenishment.reduce((sum, p) => sum + p.suggestedReplenishment, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div
        key={fadeKey}
        className="glass-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          overflowX: 'auto',
          animation: 'fadeIn 0.5s ease-out',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8899aa' }}>加载中...</div>
        ) : (
          <table>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                {[
                  { label: '物品名称', width: '26%' },
                  { label: '类别', width: '16%' },
                  { label: `最近${Math.min(predictionDays, 7)}天实际消耗`, width: '18%' },
                  { label: `未来${predictionDays}天预测消耗`, width: '18%' },
                  { label: '建议补货量', width: '18%' },
                ].map((h) => (
                  <th
                    key={h.label}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: 13,
                      color: '#8899aa',
                      fontWeight: 500,
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      width: h.width,
                    }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {needsReplenishment.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#34d399', fontSize: 14 }}>
                    ✓ 所有物品库存充足，无需补货
                  </td>
                </tr>
              ) : (
                needsReplenishment.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontSize: 14, color: '#f0f4f8' }}>{p.name}</td>
                    <td style={{ padding: '12px', fontSize: 14, color: '#8899aa' }}>{p.category}</td>
                    <td style={{ padding: '12px', fontSize: 14, color: '#f0f4f8' }}>
                      {p.recentConsumption.toLocaleString()}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: 14,
                      color: '#4a9eff',
                      background: 'rgba(74, 158, 255, 0.06)',
                      fontWeight: 500,
                    }}>
                      {p.predictedConsumption.toLocaleString()}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: 14,
                      color: '#fbbf24',
                      fontWeight: 700,
                      background: p.suggestedReplenishment > 100 ? 'rgba(251, 191, 36, 0.08)' : 'transparent',
                    }}>
                      {p.suggestedReplenishment.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {noReplenishment.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#8899aa', marginBottom: 12 }}>
            库存充足 ({noReplenishment.length} 项)
          </h3>
          <div
            key={`norep-${fadeKey}`}
            className="glass-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              overflowX: 'auto',
              animation: 'fadeIn 0.5s ease-out',
            }}
          >
            <table>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: 13, color: '#8899aa', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.1)', width: '30%' }}>
                    物品名称
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: 13, color: '#8899aa', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.1)', width: '22%' }}>
                    类别
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: 13, color: '#8899aa', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.1)', width: '24%' }}>
                    未来{predictionDays}天预测消耗
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: 13, color: '#8899aa', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.1)', width: '24%' }}>
                    状态
                  </th>
                </tr>
              </thead>
              <tbody>
                {noReplenishment.slice(0, 10).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 14, color: '#8899aa' }}>{p.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 14, color: '#6b7f94' }}>{p.category}</td>
                    <td style={{ padding: '10px 12px', fontSize: 14, color: '#6b7f94' }}>
                      {p.predictedConsumption.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 14 }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 12,
                        background: 'rgba(52, 211, 153, 0.12)',
                        color: '#34d399',
                        fontWeight: 500,
                      }}>
                        库存充足
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictionPage;
