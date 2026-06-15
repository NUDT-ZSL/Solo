import { useState, useEffect, useCallback } from 'react';
import MainPage from './components/MainPage';
import DetailPage from './components/DetailPage';
import { getRiddles, createRiddle, attemptRiddle, type Riddle } from './api';

type Page = 'main' | 'detail';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('main');
  const [riddles, setRiddles] = useState<Riddle[]>([]);
  const [selectedRiddleId, setSelectedRiddleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRiddles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRiddles();
      setRiddles(data);
    } catch (error) {
      console.error('加载谜语失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRiddles();
  }, [loadRiddles]);

  const handleSelectRiddle = (id: string) => {
    setSelectedRiddleId(id);
    setCurrentPage('detail');
  };

  const handleBackToMain = () => {
    setSelectedRiddleId(null);
    setCurrentPage('main');
    loadRiddles();
  };

  const handleCreateRiddle = async (question: string, answer: string, thanks?: string) => {
    try {
      const newRiddle = await createRiddle({ question, answer, thanks });
      setRiddles((prev) => [newRiddle, ...prev]);
      return true;
    } catch (error) {
      console.error('创建谜语失败:', error);
      return false;
    }
  };

  const handleAttemptRiddle = async (id: string, guess: string) => {
    try {
      const result = await attemptRiddle(id, guess);
      setRiddles((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            return {
              ...r,
              attempts: r.attempts + 1,
              correctCount: result.correct ? r.correctCount + 1 : r.correctCount,
              solved: result.correct ? true : r.solved,
            };
          }
          return r;
        })
      );
      return result;
    } catch (error) {
      console.error('猜谜失败:', error);
      return { correct: false };
    }
  };

  const selectedRiddle = riddles.find((r) => r.id === selectedRiddleId) || null;

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      {currentPage === 'main' ? (
        <MainPage
          riddles={riddles}
          loading={loading}
          onSelectRiddle={handleSelectRiddle}
          onCreateRiddle={handleCreateRiddle}
        />
      ) : (
        <DetailPage
          riddle={selectedRiddle}
          onBack={handleBackToMain}
          onAttempt={handleAttemptRiddle}
        />
      )}
    </div>
  );
}

export default App;
