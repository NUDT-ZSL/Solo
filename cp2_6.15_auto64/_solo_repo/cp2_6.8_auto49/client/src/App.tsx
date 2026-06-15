import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart as ChartJS } from 'chart.js';
import WordCloud from './components/WordCloud';
import TrendChart from './components/TrendChart';
import HeatmapTab from './components/HeatmapTab';
import { KeywordData, HistoryRecord } from './types';

type TabType = 'wordcloud' | 'trend' | 'heatmap';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCurrentTime(): string {
  return formatTime(new Date().toISOString());
}

function getDateLabels(): string[] {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return labels;
}

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [currentResult, setCurrentResult] = useState<HistoryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('wordcloud');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(formatCurrentTime());
  const [tabKey, setTabKey] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const trendChartRef = useRef<any>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(data => setHistory(data))
      .catch(() => {});
  }, []);

  const fetchTextFromUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      return doc.body.textContent || doc.title || url;
    } catch {
      return null;
    }
  };

  const handleAnalyze = useCallback(async () => {
    const urlRegex = /^(https?:\/\/[^\s]+)/i;
    let text = inputText.trim();
    setError(null);

    if (!text) {
      setError('请输入文本或URL');
      return;
    }

    if (urlRegex.test(text)) {
      setLoading(true);
      const fetched = await fetchTextFromUrl(text);
      if (fetched && fetched.length >= 20) {
        text = fetched;
      } else if (text.length < 20) {
        setLoading(false);
        setError('URL无法获取或文本长度不足，请直接输入不少于20字的文本');
        return;
      }
    } else if (text.length < 20) {
      setError('文本长度不能少于20字');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '分析失败');
      }
      const data: HistoryRecord = await res.json();
      setCurrentResult(data);
      setSelectedKeywords([]);
      setActiveTab('wordcloud');
      setTabKey(k => k + 1);
      const histRes = await fetch('/api/history');
      if (histRes.ok) {
        const hist = await histRes.json();
        setHistory(hist);
      }
    } catch (e: any) {
      setError(e.message || '请求失败');
    } finally {
      setLoading(false);
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const handleKeywordClick = (keyword: string) => {
    setSelectedKeywords(prev => {
      if (prev.includes(keyword)) {
        const next = prev.filter(k => k !== keyword);
        return next.length === 0 ? [] : next;
      }
      return [...prev, keyword];
    });
  };

  const handleLoadHistory = async (record: HistoryRecord) => {
    setCurrentResult(record);
    setSelectedKeywords([]);
    setActiveTab('wordcloud');
    setTabKey(k => k + 1);
    setError(null);
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(h => h.filter(r => r.id !== id));
        if (currentResult?.id === id) {
          setCurrentResult(null);
        }
      }
    } catch {}
    setConfirmDeleteId(null);
  };

  const handleExportReport = () => {
    if (!currentResult) return;
    const trendDataUrl = trendChartRef.current?.canvas?.toDataURL('image/png') || '';
    const heatmapDataUrl = heatmapCanvasRef.current?.toDataURL('image/png') || '';
    const labels = getDateLabels();

    const keywordsHtml = currentResult.keywords.map((k, i) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #ccc;">${i + 1}</td>
        <td style="padding:8px 12px;border:1px solid #ccc;">${k.keyword}</td>
        <td style="padding:8px 12px;border:1px solid #ccc;text-align:center;">${k.weight}</td>
        <td style="padding:8px 12px;border:1px solid #ccc;text-align:center;">${k.trend.join(', ')}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>话题热度分析报告</title>
<style>
  body { font-family: -apple-system, sans-serif; padding: 40px; max-width: 1100px; margin: 0 auto; color: #222; }
  h1 { color: #16213E; border-bottom: 2px solid #6C63FF; padding-bottom: 12px; }
  .meta { color: #666; margin-bottom: 30px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
  th { background:#16213E; color:#fff; padding:10px 12px; text-align:left; }
  img { max-width: 100%; border: 1px solid #eee; border-radius: 8px; margin: 16px 0; }
  .section { margin: 30px 0; }
  h2 { color: #16213E; margin-bottom: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <h1>话题热度分析报告</h1>
  <div class="meta">分析时间：${formatTime(currentResult.timestamp)}</div>
  <div class="section">
    <h2>原始文本</h2>
    <p style="background:#f5f5f5;padding:16px;border-radius:8px;line-height:1.7;">${currentResult.text}</p>
  </div>
  <div class="section">
    <h2>关键词列表及权重</h2>
    <table>
      <thead><tr><th>#</th><th>关键词</th><th>权重</th><th>7日热度(${labels.join('/')})</th></tr></thead>
      <tbody>${keywordsHtml}</tbody>
    </table>
  </div>
  <div class="section">
    <h2>热度趋势图</h2>
    ${trendDataUrl ? `<img src="${trendDataUrl}" alt="趋势图"/>` : '<p>无数据</p>'}
  </div>
  <div class="section">
    <h2>热度热力图</h2>
    ${heatmapDataUrl ? `<img src="${heatmapDataUrl}" alt="热力图"/>` : '<p>无数据</p>'}
  </div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setTabKey(k => k + 1);
    }
  };

  const tabStyle = (tab: TabType): React.CSSProperties => ({
    padding: '12px 24px',
    cursor: 'pointer',
    color: activeTab === tab ? '#E0E0E0' : '#9E9E9E',
    borderBottom: activeTab === tab ? '2px solid #6C63FF' : '2px solid transparent',
    transition: 'all 0.2s ease',
    fontWeight: activeTab === tab ? 600 : 400,
    fontSize: 14,
    userSelect: 'none',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A2E' }}>
      <nav style={{
        background: '#16213E',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #2a2a4a',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#E0E0E0' }}>话题热度分析</h1>
        <span style={{ color: '#9E9E9E', fontSize: 13, fontFamily: 'monospace' }}>{currentTime}</span>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div
          className="fade-in-up"
          style={{
            background: '#16213E',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            animationDelay: '0.1s',
          }}
        >
          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请粘贴文本（不少于20字）或输入URL链接..."
              style={{
                flex: '1 1 60%',
                minWidth: 280,
                padding: '14px 18px',
                borderRadius: 8,
                border: '1px solid #2a2a4a',
                background: '#1A1A2E',
                color: '#E0E0E0',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#6C63FF'}
              onBlur={e => e.target.style.borderColor = '#2a2a4a'}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{
                padding: '14px 32px',
                background: loading ? '#4a4599' : '#6C63FF',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                minWidth: 120,
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#7C73FF'; }}
              onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#6C63FF'; }}
            >
              {loading ? '分析中...' : '分析'}
            </button>
          </div>
          {error && (
            <div style={{
              marginTop: 12,
              padding: '10px 16px',
              background: 'rgba(255,59,59,0.15)',
              color: '#FF8080',
              borderRadius: 6,
              fontSize: 13,
            }}>{error}</div>
          )}
        </div>

        {(loading || currentResult) && (
          <div
            className="fade-in-up"
            style={{
              background: '#16213E',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              animationDelay: '0.2s',
              position: 'relative',
            }}
          >
            {currentResult && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <div>
                  <h3 style={{ color: '#E0E0E0', fontSize: 16, marginBottom: 4 }}>
                    分析结果
                  </h3>
                  <div style={{ color: '#9E9E9E', fontSize: 12 }}>
                    {formatTime(currentResult.timestamp)} · 共 {currentResult.keywords.length} 个关键词
                    {selectedKeywords.length > 0 && ` · 已筛选 ${selectedKeywords.length} 个`}
                  </div>
                </div>
                <button
                  onClick={handleExportReport}
                  title="导出报告"
                  style={{
                    background: 'transparent',
                    border: '1px solid #2a2a4a',
                    color: '#E0E0E0',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#6C63FF'; e.currentTarget.style.color = '#6C63FF'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.color = '#E0E0E0'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <polyline points="9 15 12 12 15 15"/>
                  </svg>
                  导出报告
                </button>
              </div>
            )}

            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 400,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 16px' }} />
                  <div style={{ color: '#9E9E9E', fontSize: 14 }}>正在分析文本，请稍候...</div>
                </div>
              </div>
            ) : currentResult && (
              <>
                <div style={{
                  display: 'flex',
                  gap: 4,
                  marginBottom: 20,
                  borderBottom: '1px solid #2a2a4a',
                }}>
                  <div style={tabStyle('wordcloud')} onClick={() => handleTabChange('wordcloud')}>词云图</div>
                  <div style={tabStyle('trend')} onClick={() => handleTabChange('trend')}>折线图</div>
                  <div style={tabStyle('heatmap')} onClick={() => handleTabChange('heatmap')}>热力图</div>
                </div>
                <div key={tabKey} className="slide-in" style={{ minHeight: 400 }}>
                  {activeTab === 'wordcloud' && (
                    <WordCloud
                      keywords={currentResult.keywords}
                      onKeywordClick={handleKeywordClick}
                      selectedKeywords={selectedKeywords}
                    />
                  )}
                  {activeTab === 'trend' && (
                    <TrendChart
                      keywords={currentResult.keywords}
                      selectedKeywords={selectedKeywords}
                      chartRef={trendChartRef}
                    />
                  )}
                  {activeTab === 'heatmap' && (
                    <HeatmapTab
                      keywords={currentResult.keywords}
                      canvasRef={heatmapCanvasRef}
                    />
                  )}
                </div>
                {selectedKeywords.length > 0 && (
                  <button
                    onClick={() => setSelectedKeywords([])}
                    style={{
                      marginTop: 12,
                      background: 'transparent',
                      color: '#6C63FF',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      textDecoration: 'underline',
                    }}
                  >
                    清除筛选，显示全部关键词
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div
          className="fade-in-up"
          style={{
            background: '#16213E',
            borderRadius: 12,
            padding: 24,
            animationDelay: '0.3s',
          }}
        >
          <h3 style={{ color: '#E0E0E0', fontSize: 16, marginBottom: 16 }}>
            历史记录 <span style={{ color: '#9E9E9E', fontWeight: 400, fontSize: 13 }}>({history.length}/50)</span>
          </h3>
          {history.length === 0 ? (
            <div style={{ color: '#9E9E9E', textAlign: 'center', padding: 40, fontSize: 13 }}>
              暂无历史记录
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((record, idx) => (
                <div
                  key={record.id}
                  className="fade-in-up"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    background: '#1A1A2E',
                    borderRadius: 8,
                    border: currentResult?.id === record.id ? '1px solid #6C63FF' : '1px solid transparent',
                    animationDelay: `${0.1 + idx * 0.02}s`,
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#1f1f3a'}
                  onMouseOut={e => e.currentTarget.style.background = '#1A1A2E'}
                >
                  <div
                    style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
                    onClick={() => handleLoadHistory(record)}
                  >
                    <div style={{
                      color: '#E0E0E0',
                      fontSize: 14,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {record.text.substring(0, 20)}{record.text.length > 20 ? '...' : ''}
                    </div>
                    <div style={{ color: '#9E9E9E', fontSize: 12, marginTop: 4 }}>
                      {formatTime(record.timestamp)} · {record.keywords.length} 关键词
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(record.id); }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#FF3B3B',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                      marginLeft: 12,
                      flexShrink: 0,
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#cc2e2e'}
                    onMouseOut={e => e.currentTarget.style.background = '#FF3B3B'}
                    title="删除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#16213E',
              padding: 32,
              borderRadius: 12,
              minWidth: 320,
              border: '1px solid #2a2a4a',
            }}
          >
            <h4 style={{ color: '#E0E0E0', fontSize: 16, marginBottom: 12 }}>确认删除</h4>
            <p style={{ color: '#9E9E9E', fontSize: 14, marginBottom: 24 }}>确定删除此记录？</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  padding: '8px 20px',
                  background: 'transparent',
                  color: '#9E9E9E',
                  border: '1px solid #2a2a4a',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteHistory(confirmDeleteId)}
                style={{
                  padding: '8px 20px',
                  background: '#FF3B3B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          nav { padding: 12px 16px !important; }
          h1 { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
