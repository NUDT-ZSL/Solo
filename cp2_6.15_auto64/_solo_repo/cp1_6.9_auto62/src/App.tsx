import { useState, useEffect, useCallback } from 'react';
import EmotionCurve from './components/EmotionCurve';
import DetailCard from './components/DetailCard';

export type EmotionTag = '喜' | '怒' | '哀' | '乐' | '平静';
export type TasteTag = '甜' | '咸' | '辣' | '苦';

export interface Food {
  id: string;
  name: string;
  emoji: string;
  color: string;
  taste: TasteTag;
}

export interface Entry {
  id: string;
  date: string;
  moodKeywords: string[];
  emotion: EmotionTag;
  emotionIntensity: number;
  food: Food;
}

const emotionColorMap: Record<EmotionTag, string> = {
  '喜': '#FFD700',
  '怒': '#FF4444',
  '哀': '#4A90D9',
  '乐': '#66BB6A',
  '平静': '#B0BEC5'
};

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [flyFromPoint, setFlyFromPoint] = useState<{ x: number; y: number } | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchFoods();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/entries');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error('获取数据失败:', err);
    }
  };

  const fetchFoods = async () => {
    try {
      const res = await fetch('/api/foods');
      const data = await res.json();
      setFoods(data);
      if (data.length > 0) {
        setSelectedFoodId(data[0].id);
      }
    } catch (err) {
      console.error('获取食物列表失败:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordsInput.trim() || !selectedFoodId) {
      alert('请填写心情关键词并选择食物');
      return;
    }

    const keywords = keywordsInput
      .split(/[,，、\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 3);

    if (keywords.length === 0) {
      alert('请至少输入一个心情关键词');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          moodKeywords: keywords,
          foodId: selectedFoodId
        })
      });

      if (res.ok) {
        setKeywordsInput('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || '提交失败');
      }
    } catch (err) {
      console.error('提交失败:', err);
      alert('提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selectedEntry?.id === id) {
          setSelectedEntry(null);
        }
        fetchData();
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handlePointClick = useCallback((entry: Entry, point: { x: number; y: number }) => {
    setFlyFromPoint(point);
    setSelectedEntry(entry);
  }, []);

  const handleCloseCard = () => {
    setSelectedEntry(null);
    setFlyFromPoint(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="app-container">
      <div className="left-panel">
        <div className="card">
          <div className="header">
            <div>
              <h1>味觉记忆图谱</h1>
              <p className="app-subtitle">记录每日心情与饮食，发现它们的微妙关联</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>📝 今日记录</h2>
          <form onSubmit={handleSubmit} className="input-form">
            <div className="form-group">
              <label>日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>心情关键词（1-3个，用逗号或空格分隔）</label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="如：开心、满足"
              />
              <span className="keyword-hint">
                可选关键词：开心/快乐/喜悦/生气/愤怒/烦躁/伤心/难过/悲伤/愉快/满足/幸福/平静/淡定
              </span>
            </div>
            <div className="form-group">
              <label>今日饮食</label>
              <select
                value={selectedFoodId}
                onChange={(e) => setSelectedFoodId(e.target.value)}
              >
                {foods.map(food => (
                  <option key={food.id} value={food.id}>
                    {food.emoji} {food.name} ({food.taste}味)
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ alignSelf: 'flex-start' }}
            >
              {loading ? '提交中...' : '✍️ 记录今日'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-title">
            <h2>📈 情绪曲线图</h2>
          </div>
          <EmotionCurve
            entries={entries}
            onPointClick={handlePointClick}
          />
        </div>

        <div className="card">
          <div className="section-title">
            <h2>📋 历史记录</h2>
            <span style={{ fontSize: '13px', color: '#888' }}>共 {entries.length} 条</span>
          </div>
          {entries.length === 0 ? (
            <div className="empty-state">暂无记录，开始记录你的第一天吧～</div>
          ) : (
            <ul className="entry-list">
              {[...entries].reverse().map(entry => (
                <li
                  key={entry.id}
                  className="entry-item"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="entry-info">
                    <span className="entry-date">{formatDate(entry.date)}</span>
                    <span className="entry-food">{entry.food.emoji}</span>
                    <div>
                      <div style={{ marginBottom: 4 }}>
                        <span className="emotion-tag" style={{ backgroundColor: emotionColorMap[entry.emotion] }}>
                          {entry.emotion}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: '12px', color: '#999' }}>
                          强度 {entry.emotionIntensity}
                        </span>
                      </div>
                      <span className="entry-keywords">
                        {entry.moodKeywords.join('、')} · {entry.food.name}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="right-panel">
        {selectedEntry ? (
          <DetailCard
            entry={selectedEntry}
            emotionColorMap={emotionColorMap}
            onClose={handleCloseCard}
            flyFromPoint={flyFromPoint}
          />
        ) : (
          <div className="card" style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state" style={{ padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌸</div>
              <p>点击曲线图上的数据点</p>
              <p>或左侧历史记录查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
