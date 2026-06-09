import { useState, useRef, useEffect } from 'react';
import { POEMS, getAllChars, Poem } from './data/poems';
import PracticePanel from './components/PracticePanel';
import Sidebar from './components/Sidebar';

export interface CharScore {
  char: string;
  index: number;
  score: number;
}

function App() {
  const [selectedPoemId, setSelectedPoemId] = useState<string>(POEMS[0].id);
  const [scores, setScores] = useState<CharScore[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [username, setUsername] = useState<string>('书法学习者');

  const selectedPoem: Poem = POEMS.find(p => p.id === selectedPoemId) || POEMS[0];
  const allChars = getAllChars(selectedPoem);

  useEffect(() => {
    setScores([]);
    setStartTime(Date.now());
  }, [selectedPoemId]);

  const handleScoreUpdate = (charIndex: number, char: string, score: number) => {
    setScores(prev => {
      const existing = prev.find(s => s.index === charIndex);
      if (existing) {
        return prev.map(s => s.index === charIndex ? { ...s, score } : s);
      }
      return [...prev, { char, index: charIndex, score }];
    });
  };

  const totalChars = allChars.length;
  const completedCount = scores.length;
  const averageScore = completedCount > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / completedCount)
    : 0;

  const handleGenerateReport = async () => {
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    const reportData = {
      username,
      date: new Date().toLocaleDateString('zh-CN'),
      poemTitle: selectedPoem.title,
      poemAuthor: selectedPoem.author,
      totalChars,
      completedCount,
      averageScore,
      timeSpent,
      scores: scores.sort((a, b) => a.index - b.index)
    };

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `书法临摹报告_${selectedPoem.title}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('生成报告失败:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      padding: '24px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        background: '#e8e0ce',
        borderRadius: '16px',
        boxShadow: '0px 8px 32px rgba(0,0,0,0.3)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
            <h2 style={{ color: '#2c1810', marginBottom: '16px', fontSize: '20px' }}>古诗词书法临摹</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#2c1810', marginBottom: '8px', fontSize: '14px' }}>
                选择古诗：
              </label>
              <select
                value={selectedPoemId}
                onChange={(e) => setSelectedPoemId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #c9bfa8',
                  background: '#fff',
                  fontSize: '14px',
                  color: '#2c1810',
                  cursor: 'pointer'
                }}
              >
                {POEMS.map(poem => (
                  <option key={poem.id} value={poem.id}>
                    {poem.title} - {poem.author}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#2c1810', marginBottom: '8px', fontSize: '14px' }}>
                用户昵称：
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #c9bfa8',
                  background: '#fff',
                  fontSize: '14px',
                  color: '#2c1810'
                }}
              />
            </div>
            <div style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#5d4e37'
            }}>
              <p style={{ marginBottom: '6px' }}><strong>{selectedPoem.title}</strong> - {selectedPoem.author}</p>
              {selectedPoem.content.map((line, i) => (
                <p key={i} style={{ margin: '2px 0' }}>{line}</p>
              ))}
            </div>
          </div>

          <div style={{ flex: '2 1 500px', minWidth: '500px' }}>
            <PracticePanel
              poem={selectedPoem}
              chars={allChars}
              onScoreUpdate={handleScoreUpdate}
              scores={scores}
            />
          </div>

          <div style={{ flex: '0 0 260px', minWidth: '260px' }}>
            <Sidebar
              totalChars={totalChars}
              completedCount={completedCount}
              averageScore={averageScore}
              scores={scores}
              chars={allChars}
              onGenerateReport={handleGenerateReport}
            />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="min-height: 100vh"] {
            padding: 10px !important;
          }
          div[style*="flex: 0 0 260px"] {
            flex: 1 1 100% !important;
            min-width: 100% !important;
          }
          div[style*="flex: 2 1 500px"] {
            min-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
