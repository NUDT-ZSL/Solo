import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { InputPanel } from './components/InputPanel';
import { ComparisonView } from './components/ComparisonView';
import { VocabDrawer } from './components/VocabDrawer';
import { useAnimation } from './hooks/useAnimation';
import { analyzeText, simplifyText } from './analyzer';
import type { TextAnalysis, SimplifiedResult, SimplifiedWord, VocabWord } from './types';

const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null);
  const [simplifiedResult, setSimplifiedResult] = useState<SimplifiedResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(3);
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const {
    gaugeValue,
    setGaugeValue,
    highlightedSentenceId,
    setHighlightedSentence,
    speakingSentenceId,
    setSpeakingSentence,
  } = useAnimation();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocabWords');
      if (saved) {
        setVocabWords(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load vocab words from localStorage');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('vocabWords', JSON.stringify(vocabWords));
    } catch (e) {
      console.error('Failed to save vocab words to localStorage');
    }
  }, [vocabWords]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleAnalyze = useCallback((text: string, level: number) => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const analysisResult = analyzeText(text);
      const simplifiedResult = simplifyText(text, level);
      
      setAnalysis(analysisResult);
      setSimplifiedResult(simplifiedResult);
      setGaugeValue(Math.min(100, (analysisResult.fleschKincaid / 20) * 100));
      setIsAnalyzing(false);
    }, 50);
  }, [setGaugeValue]);

  const handleLevelChange = useCallback((level: number) => {
    setSelectedLevel(level);
    
    if (analysis) {
      const text = analysis.sentences.join(' ');
      const simplifiedResult = simplifyText(text, level);
      setSimplifiedResult(simplifiedResult);
    }
  }, [analysis]);

  const handleWordClick = useCallback((word: SimplifiedWord) => {
    const exists = vocabWords.some(
      w => w.original.toLowerCase() === word.original.toLowerCase()
    );
    
    if (!exists) {
      const newWord: VocabWord = {
        id: uuidv4(),
        original: word.original,
        simplified: word.simplified,
        definition: word.definition,
        level: word.level,
        addedAt: Date.now(),
      };
      setVocabWords(prev => [newWord, ...prev]);
      showToast(`已添加 "${word.original}" 到生词本`);
    }
  }, [vocabWords, showToast]);

  const handleDeleteVocab = useCallback((ids: string[]) => {
    setVocabWords(prev => prev.filter(w => !ids.includes(w.id)));
    if (ids.length > 1) {
      showToast(`已删除 ${ids.length} 个生词`);
    }
  }, [showToast]);

  const handleExport = useCallback(() => {
    showToast('生词本已导出');
  }, [showToast]);

  const handleSpeak = useCallback((sentence: string, id: string) => {
    setSpeakingSentence(id);
  }, [setSpeakingSentence]);

  const handleStopSpeaking = useCallback(() => {
    setSpeakingSentence(null);
  }, [setSpeakingSentence]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="app-title">
            <span className="app-logo">📖</span>
            <h1>英文分级阅读助手</h1>
          </div>
          <button
            className="vocab-btn"
            onClick={() => setDrawerOpen(true)}
          >
            📚 生词本
            {vocabWords.length > 0 && (
              <span className="vocab-badge">{vocabWords.length}</span>
            )}
          </button>
        </div>
      </header>

      <main className="app-main">
        <InputPanel
          onAnalyze={handleAnalyze}
          analysis={analysis}
          gaugeValue={gaugeValue}
          isAnalyzing={isAnalyzing}
          selectedLevel={selectedLevel}
          onLevelChange={handleLevelChange}
        />

        <ComparisonView
          sentences={simplifiedResult?.sentences || []}
          highlightedSentenceId={highlightedSentenceId}
          onSentenceHover={setHighlightedSentence}
          speakingSentenceId={speakingSentenceId}
          onSpeak={handleSpeak}
          onStopSpeaking={handleStopSpeaking}
          onWordClick={handleWordClick}
        />
      </main>

      <VocabDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        words={vocabWords}
        onDelete={handleDeleteVocab}
        onExport={handleExport}
      />

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          background: #f5f7fa;
          color: #333;
          line-height: 1.6;
        }
        
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .app-header {
          background: #fff;
          border-bottom: 1px solid #e8e8e8;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .app-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .app-logo {
          font-size: 28px;
        }
        
        .app-title h1 {
          font-size: 20px;
          font-weight: 600;
          color: #333;
        }
        
        .vocab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
        }
        
        .vocab-btn:hover {
          border-color: #4A90D9;
          background: #f0f7ff;
        }
        
        .vocab-badge {
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: #4A90D9;
          color: #fff;
          border-radius: 10px;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
        }
        
        .app-main {
          flex: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 2000;
          animation: toastFadeIn 0.3s ease;
        }
        
        @keyframes toastFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .header-content {
            padding: 12px 16px;
          }
          
          .app-title h1 {
            font-size: 16px;
          }
          
          .app-main {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
