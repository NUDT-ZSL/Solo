import React, { useState, useCallback } from 'react';
import { MoodTea, TeaType, TEA_CATALOG, TEA_TYPES, loadAllMoods, createMood } from './TeaHouseEngine';
import EmotionTea from './EmotionTea';
import PersonalPage from './PersonalPage';

type Page = 'home' | 'personal';

const MAX_MOOD_LEN = 200;

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [moods, setMoods] = useState<MoodTea[]>(() => loadAllMoods());
  const [selectedTea, setSelectedTea] = useState<TeaType>('green');
  const [moodText, setMoodText] = useState('');

  const refreshMoods = useCallback(() => {
    setMoods(loadAllMoods());
  }, []);

  const handleTeaUpdate = useCallback((updated: MoodTea) => {
    setMoods(prev => prev.map(t => (t.id === updated.id ? updated : t)));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!moodText.trim()) return;
    createMood(selectedTea, moodText.trim());
    setMoodText('');
    refreshMoods();
  }, [moodText, selectedTea, refreshMoods]);

  const charLen = moodText.length;
  const overLimit = charLen > MAX_MOOD_LEN;

  return (
    <>
      <div className="page-container">
        <header className="header">
          <h1>雾隐茶舍</h1>
          <p>择一盏茶，写下此刻心绪</p>
        </header>

        <nav className="nav-bar">
          <button
            className={`nav-btn ${page === 'home' ? 'active' : ''}`}
            onClick={() => setPage('home')}
          >
            茶舍
          </button>
          <button
            className={`nav-btn ${page === 'personal' ? 'active' : ''}`}
            onClick={() => setPage('personal')}
          >
            我的茶盏
          </button>
        </nav>

        {page === 'home' && (
          <>
            <div className="submit-panel glass-card">
              <div className="tea-select-row">
                {TEA_TYPES.map(t => {
                  const m = TEA_CATALOG[t];
                  return (
                    <button
                      key={t}
                      className={`tea-select-btn ${selectedTea === t ? 'selected' : ''}`}
                      style={{
                        color: m.color,
                        borderColor: selectedTea === t ? m.color : 'transparent',
                      }}
                      onClick={() => setSelectedTea(t)}
                    >
                      {m.emoji} {m.label}·{m.desc}
                    </button>
                  );
                })}
              </div>
              <textarea
                className="mood-textarea"
                value={moodText}
                onChange={e => setMoodText(e.target.value.slice(0, MAX_MOOD_LEN + 10))}
                placeholder="写下此刻的心情..."
                maxLength={MAX_MOOD_LEN + 10}
              />
              <div className={`char-count ${overLimit ? 'over' : ''}`}>
                {charLen}/{MAX_MOOD_LEN}
              </div>
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={!moodText.trim() || overLimit}
              >
                封茶入盏
              </button>
            </div>

            {moods.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🫖</div>
                <p>茶舍尚无客来，写下第一杯心情吧</p>
              </div>
            ) : (
              <div className="tea-grid">
                {moods.map((tea, i) => (
                  <EmotionTea
                    key={tea.id}
                    tea={tea}
                    index={i}
                    onUpdate={handleTeaUpdate}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {page === 'personal' && <PersonalPage />}
      </div>
    </>
  );
};

export default App;
