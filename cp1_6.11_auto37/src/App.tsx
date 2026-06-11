import { useState, useEffect, useCallback } from 'react';
import type { Idea, FilterType, IdeaType } from './types';
import { fetchIdeas, createIdea } from './api';
import TeamWall from './components/TeamWall';
import IdeaInput from './components/IdeaInput';

function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [members, setMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  const loadIdeas = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchIdeas();
      setIdeas(data);
      const uniqueMembers = Array.from(
        new Set(data.map((idea) => idea.memberName))
      );
      setMembers(uniqueMembers);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIdeas();
  }, [loadIdeas]);

  const handleSubmit = useCallback(
    async (
      memberName: string,
      content: string,
      type: IdeaType,
      voiceBase64?: string
    ) => {
      try {
        const newIdea = await createIdea({
          memberName,
          content,
          type,
          voiceBase64,
        });
        setIdeas((prev) => [newIdea, ...prev]);
        setMembers((prev) =>
          prev.includes(memberName) ? prev : [...prev, memberName]
        );

        setShowToast(true);
        setTimeout(() => {
          setToastFading(true);
          setTimeout(() => {
            setShowToast(false);
            setToastFading(false);
          }, 300);
        }, 1500);
      } catch (error) {
        console.error('提交失败:', error);
        alert('提交失败，请重试');
      }
    },
    []
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🎙️ 声流站会</h1>
        <p className="app-subtitle">异步协作，让团队随时同步进展</p>
      </header>

      {showToast && (
        <div className={`submit-success-toast${toastFading ? ' fade-out' : ''}`}>
          ✓ 已提交成功！
        </div>
      )}

      <IdeaInput onSubmit={handleSubmit} members={members} />

      <TeamWall
        ideas={ideas}
        filter={filter}
        onFilterChange={setFilter}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
