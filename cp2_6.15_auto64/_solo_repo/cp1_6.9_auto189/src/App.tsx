import { useState, useEffect, useCallback } from 'react';
import AnalysisPanel from './AnalysisPanel';
import type { EvaluateResponse, HistoryRecord } from './types';

const HISTORY_STORAGE_KEY = 'shenyue_writing_history';

function getScoreColor(score: number): string {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  return '#F44336';
}

function App() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [history]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      setError('请输入要评估的文章内容');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setError('');
    setActiveHistoryId(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '评估失败');
      }

      const evalResult = data as EvaluateResponse;
      setResult(evalResult);

      const summary = text.trim().slice(0, 50).replace(/\s+/g, ' ');
      const highlightIndices = evalResult.issues.map(i => i.sentenceIndex);
      const record: HistoryRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        summary: summary.length < text.trim().length ? summary + '...' : summary,
        text,
        totalScore: evalResult.totalScore,
        dimensions: evalResult.dimensions,
        issues: evalResult.issues,
        sentences: evalResult.sentences,
        wordCount: evalResult.wordCount,
        highlightIndices
      };

      setHistory(prev => [record, ...prev].slice(0, 20));
    } catch (err) {
      const message = err instanceof Error ? err.message : '评估过程中发生错误';
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [text, isLoading]);

  const handleHistoryClick = useCallback((record: HistoryRecord) => {
    setActiveHistoryId(record.id);
    setText(record.text);
    setResult({
      totalScore: record.totalScore,
      dimensions: record.dimensions,
      issues: record.issues,
      sentences: record.sentences,
      wordCount: record.wordCount
    });
    setError('');
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      padding: '40px 15%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        padding: '32px',
        marginBottom: '24px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#333',
          marginBottom: '16px',
          fontFamily: 'sans-serif'
        }}>
          深阅·写作评估器
        </h1>
        <div style={{
          height: '2px',
          backgroundColor: '#E0E0E0',
          marginBottom: '28px'
        }} />

        <div style={{ width: '60%', textAlign: 'left' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <label style={{
              fontSize: '14px',
              color: '#666',
              fontWeight: 500
            }}>
              文章内容
            </label>
            <span style={{
              fontSize: '12px',
              color: '#999'
            }}>
              {text.split(/\s+/).filter(Boolean).length} 词
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请粘贴你的英文文章，字数500-1500字"
            disabled={isLoading}
            rows={10}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '14px',
              color: '#555',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.3s ease',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              backgroundColor: isLoading ? '#FAFAFA' : '#FFFFFF',
              cursor: isLoading ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#FF6F61';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E0E0E0';
            }}
          />

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: '#FFEBEE',
              color: '#F44336',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLoading || !text.trim()}
            style={{
              marginTop: '16px',
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: isLoading || !text.trim() ? '#CCCCCC' : '#FF6F61',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || !text.trim() ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease, transform 0.1s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '140px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading && text.trim()) {
                e.currentTarget.style.backgroundColor = '#FF5252';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && text.trim()) {
                e.currentTarget.style.backgroundColor = '#FF6F61';
              }
            }}
          >
            {isLoading ? (
              <>
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span style={{ marginLeft: '8px' }}>评估中</span>
              </>
            ) : (
              '开始评估'
            )}
          </button>
        </div>

        {result && (
          <AnalysisPanel
            result={result}
            originalText={text}
          />
        )}

        {history.length > 0 && (
          <div style={{
            marginTop: '36px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#333'
              }}>
                历史记录 ({history.length})
              </h2>
              <button
                onClick={handleClearHistory}
                style={{
                  fontSize: '12px',
                  color: '#999',
                  backgroundColor: 'transparent',
                  border: '1px solid #E0E0E0',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#F44336';
                  e.currentTarget.style.borderColor = '#F44336';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#999';
                  e.currentTarget.style.borderColor = '#E0E0E0';
                }}
              >
                清空记录
              </button>
            </div>
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              scrollBehavior: 'smooth'
            }}>
              {history.map((record, index) => (
                <div
                  key={record.id}
                  onClick={() => handleHistoryClick(record)}
                  style={{
                    height: '60px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: index < history.length - 1 ? '1px solid #E0E0E0' : 'none',
                    backgroundColor: activeHistoryId === record.id ? '#FFF3E0' : 'transparent',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeHistoryId !== record.id) {
                      e.currentTarget.style.backgroundColor = '#FAFAFA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeHistoryId !== record.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    marginRight: '16px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#666',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {record.summary}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#999',
                      marginTop: '4px'
                    }}>
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                      {' · '}
                      {record.wordCount} 词
                    </div>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: getScoreColor(record.totalScore)
                  }}>
                    {record.totalScore}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
