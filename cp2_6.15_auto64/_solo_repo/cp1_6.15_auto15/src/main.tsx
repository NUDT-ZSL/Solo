import { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import QuizPanel from './components/QuizPanel';
import AnalysisDashboard, { type AnalysisData, type QuizResult } from './components/AnalysisDashboard';
import '../src/styles.css';

type View = 'quiz' | 'analysis' | 'intro';

interface AppState {
  view: View;
  quizResult: QuizResult | null;
  reviewTag?: string;
  reviewMode?: boolean;
  reviewIds?: string[];
}

function App() {
  const [state, setState] = useState<AppState>({
    view: 'intro',
    quizResult: null,
  });

  useEffect(() => {
    document.title = '自适应题库训练系统';
  }, []);

  const handleQuizComplete = useCallback((result: QuizResult) => {
    setState(prev => ({
      ...prev,
      view: 'analysis',
      quizResult: result,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleStartQuiz = useCallback(() => {
    setState({
      view: 'quiz',
      quizResult: null,
      reviewTag: undefined,
      reviewMode: false,
      reviewIds: undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTagPractice = useCallback((tag: string) => {
    setState({
      view: 'quiz',
      quizResult: null,
      reviewTag: tag,
      reviewMode: false,
      reviewIds: undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleWrongPractice = useCallback((ids: string[]) => {
    setState({
      view: 'quiz',
      quizResult: null,
      reviewTag: undefined,
      reviewMode: true,
      reviewIds: ids,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackToIntro = useCallback(() => {
    setState({ view: 'intro', quizResult: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>🎯 自适应题库训练系统</h1>
        <p>
          {state.view === 'intro' && '智能抽取 · 即时反馈 · 薄弱点分析，助你高效掌握核心知识点'}
          {state.view === 'quiz' && '认真作答，每一题都是进步！💪'}
          {state.view === 'analysis' && '薄弱点一目了然，针对性训练更高效 📊'}
        </p>
      </header>

      <main style={{ position: 'relative' }}>
        {state.view === 'intro' && (
          <div className="card">
            <h2 className="card-title">📝 开始答题</h2>
            <div style={{ marginBottom: 20, color: '#64748b', lineHeight: 1.8, fontSize: 'clamp(13px, 2vw, 15px)' }}>
              <p style={{ marginBottom: 12 }}>✨ 系统将从 <strong style={{ color: '#3b82f6' }}>300+</strong> 道精选题目中按知识点和难度均衡抽取 10 道题进行测试</p>
              <p style={{ marginBottom: 12 }}>⏱️ 每题限时 <strong>30 秒</strong>，超时自动判错并自动下一题</p>
              <p style={{ marginBottom: 12 }}>📊 完成后自动生成薄弱点分析报告，推荐专项练习</p>
              <p style={{ marginBottom: 12 }}>📝 错题自动收录，支持错题重练模式，直到全对</p>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleStartQuiz}>
                🚀 开始训练
              </button>
            </div>
          </div>
        )}

        {state.view === 'quiz' && (
          <div key={(state.reviewTag || 'all') + (state.reviewMode ? '-wrong' : '-normal')}>
            <QuizPanel
              onComplete={handleQuizComplete}
              onBack={handleBackToIntro}
              filterTag={state.reviewTag}
              wrongIds={state.reviewIds}
            />
          </div>
        )}

        {state.view === 'analysis' && state.quizResult && (
          <AnalysisDashboard
            result={state.quizResult}
            onTagPractice={handleTagPractice}
            onWrongPractice={handleWrongPractice}
            onBack={handleBackToIntro}
          />
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '24px 8px', color: '#94a3b8', fontSize: 12 }}>
        💡 提示：小步快跑，反复练习，掌握更牢固
      </footer>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;
