import React, { useState, useEffect, useCallback } from 'react';
import type { FoodRecord, RecordsResponse } from '../api/types';
import { MEAL_TYPE_LABELS, NUTRIENT_NAMES, NUTRIENT_UNITS } from '../api/types';
import { formatDisplayDate, getDateInfo, getDaysInWeek, formatDate, formatTime } from '../utils/timeHelpers';

interface WeekData {
  records: FoodRecord[];
  weekStart: string;
  weekEnd: string;
}

const DailyLogPage: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentWeek, setCurrentWeek] = useState<WeekData | null>(null);
  const [prevWeek, setPrevWeek] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [slideState, setSlideState] = useState<'idle' | 'transitioning'>('idle');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    foodName: '',
    portion: 1,
    portionUnit: '份',
    calories: 200,
    mealType: 'lunch' as FoodRecord['mealType'],
    imageUrl: '',
  });

  const fetchRecords = useCallback(async (offset: number): Promise<WeekData> => {
    const response = await fetch(`/api/records?week=${offset}`);
    const data: RecordsResponse = await response.json();
    return {
      records: data.records,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const data = await fetchRecords(0);
        setCurrentWeek(data);
      } catch (error) {
        console.error('Failed to fetch records:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchRecords]);

  const handleWeekChange = async (direction: number) => {
    if (slideState === 'transitioning' || !currentWeek) return;

    const newOffset = weekOffset + direction;
    const dir = direction > 0 ? 'left' : 'right';

    setSlideDirection(dir);
    setPrevWeek(currentWeek);
    setSlideState('transitioning');

    try {
      const newData = await fetchRecords(newOffset);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            setCurrentWeek(newData);
            setWeekOffset(newOffset);

            setTimeout(() => {
              setSlideState('idle');
              setPrevWeek(null);
            }, 400);
          }, 20);
        });
      });
    } catch (error) {
      console.error('Failed to fetch records:', error);
      setSlideState('idle');
      setPrevWeek(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const newRecord: Omit<FoodRecord, 'id' | 'createdAt'> = {
      date: formatDate(now),
      time: formatTime(now),
      mealType: formData.mealType,
      foodName: formData.foodName,
      portion: formData.portion,
      portionUnit: formData.portionUnit,
      calories: formData.calories,
      imageUrl: formData.imageUrl || undefined,
      nutrition: {
        protein: Math.round(formData.calories * 0.15 * 0.25 * 10) / 10,
        carbs: Math.round(formData.calories * 0.55 * 0.25 * 10) / 10,
        fat: Math.round(formData.calories * 0.3 * 0.11 * 10) / 10,
        fiber: Math.round(Math.random() * 5 * 10) / 10,
        vitaminC: Math.round(Math.random() * 30 * 10) / 10,
        calcium: Math.round(Math.random() * 100 * 10) / 10,
      },
    };

    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
      const savedRecord = await response.json();
      setCurrentWeek((prev) =>
        prev ? { ...prev, records: [...prev.records, savedRecord] } : prev
      );
      setShowForm(false);
      setFormData({
        foodName: '',
        portion: 1,
        portionUnit: '份',
        calories: 200,
        mealType: 'lunch',
        imageUrl: '',
      });
    } catch (error) {
      console.error('Failed to save record:', error);
    }
  };

  const groupRecordsByDate = (weekData: WeekData) => {
    if (!weekData.weekStart) return [];
    const days = getDaysInWeek(weekData.weekStart);
    return days.map((date) => ({
      date,
      records: weekData.records
        .filter((r) => r.date === date)
        .sort((a, b) => a.time.localeCompare(b.time)),
    }));
  };

  return (
    <div className="page daily-log-page">
      <div className="page-header">
        <h1 className="page-title">饮食日记</h1>
        <button
          className="btn btn-primary add-btn"
          onClick={() => setShowForm(true)}
        >
          + 添加记录
        </button>
      </div>

      <div className="week-nav">
        <button
          className="btn btn-secondary week-btn"
          onClick={() => handleWeekChange(-1)}
        >
          ← 上一周
        </button>
        <span className="week-range">
          {currentWeek
            ? `${formatDisplayDate(currentWeek.weekStart)} - ${formatDisplayDate(currentWeek.weekEnd)}`
            : '加载中...'}
        </span>
        <button
          className="btn btn-secondary week-btn"
          onClick={() => handleWeekChange(1)}
        >
          下一周 →
        </button>
      </div>

      {showForm && (
        <div className="form-overlay" onClick={() => setShowForm(false)}>
          <div className="form-card" onClick={(e) => e.stopPropagation()}>
            <h3>添加饮食记录</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>食物名称</label>
                <input
                  type="text"
                  value={formData.foodName}
                  onChange={(e) => setFormData({ ...formData, foodName: e.target.value })}
                  placeholder="例如：鸡胸肉沙拉"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>餐次</label>
                  <select
                    value={formData.mealType}
                    onChange={(e) =>
                      setFormData({ ...formData, mealType: e.target.value as FoodRecord['mealType'] })
                    }
                  >
                    <option value="breakfast">早餐</option>
                    <option value="lunch">午餐</option>
                    <option value="dinner">晚餐</option>
                    <option value="snack">加餐</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>份量</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.portion}
                    onChange={(e) => setFormData({ ...formData, portion: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>单位</label>
                  <input
                    type="text"
                    value={formData.portionUnit}
                    onChange={(e) => setFormData({ ...formData, portionUnit: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>热量估算 (千卡)</label>
                <input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>图片链接</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  保存记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading || !currentWeek ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="timeline-viewport">
          <div
            className={`timeline-slider ${slideState === 'transitioning' ? `transitioning-${slideDirection}` : ''}`}
          >
            {prevWeek && (
              <div className="timeline-pane">
                {groupRecordsByDate(prevWeek).map(({ date, records: dayRecords }) => {
                  const dateInfo = getDateInfo(date);
                  const hasRecords = dayRecords.length > 0;
                  return (
                    <div
                      className={`day-card ${hasRecords ? 'has-records' : ''}`}
                      key={`prev-${date}`}
                    >
                      <div className="day-header">
                        <div className="day-date">
                          <span className="day-number">{dateInfo.day}</span>
                          <div className="day-month-week">
                            <span className="day-month">{dateInfo.month}月</span>
                            <span className="day-weekday">{dateInfo.weekday}</span>
                          </div>
                        </div>
                      </div>
                      <div className="day-records">
                        {dayRecords.length === 0 ? (
                          <div className="empty-day">暂无记录</div>
                        ) : (
                          dayRecords.map((record) => (
                            <div className="record-card" key={record.id}>
                              {record.imageUrl && (
                                <img
                                  src={record.imageUrl}
                                  alt={record.foodName}
                                  className="record-image"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="record-content">
                                <div className="record-header">
                                  <span className="record-time">{record.time}</span>
                                  <span className="record-meal-type">
                                    {MEAL_TYPE_LABELS[record.mealType]}
                                  </span>
                                </div>
                                <h4 className="record-food-name">{record.foodName}</h4>
                                <div className="record-meta">
                                  <span>
                                    {record.portion}
                                    {record.portionUnit}
                                  </span>
                                  <span className="record-calories">
                                    {record.calories} 千卡
                                  </span>
                                </div>
                                <div className="record-nutrition">
                                  {Object.entries(record.nutrition).map(([key, value]) => (
                                    <span key={key} className="nutrition-tag">
                                      {NUTRIENT_NAMES[key as keyof typeof NUTRIENT_NAMES]}:{' '}
                                      {value}
                                      {NUTRIENT_UNITS[key as keyof typeof NUTRIENT_UNITS]}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {hasRecords && <div className="day-completion-check">✓</div>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="timeline-pane">
              {groupRecordsByDate(currentWeek).map(({ date, records: dayRecords }, index) => {
                const dateInfo = getDateInfo(date);
                const hasRecords = dayRecords.length > 0;
                return (
                  <div
                    className={`day-card ${hasRecords ? 'has-records' : ''}`}
                    key={`curr-${date}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="day-header">
                      <div className="day-date">
                        <span className="day-number">{dateInfo.day}</span>
                        <div className="day-month-week">
                          <span className="day-month">{dateInfo.month}月</span>
                          <span className="day-weekday">{dateInfo.weekday}</span>
                        </div>
                      </div>
                    </div>
                    <div className="day-records">
                      {dayRecords.length === 0 ? (
                        <div className="empty-day">暂无记录</div>
                      ) : (
                        dayRecords.map((record) => (
                          <div className="record-card" key={record.id}>
                            {record.imageUrl && (
                              <img
                                src={record.imageUrl}
                                alt={record.foodName}
                                className="record-image"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div className="record-content">
                              <div className="record-header">
                                <span className="record-time">{record.time}</span>
                                <span className="record-meal-type">
                                  {MEAL_TYPE_LABELS[record.mealType]}
                                </span>
                              </div>
                              <h4 className="record-food-name">{record.foodName}</h4>
                              <div className="record-meta">
                                <span>
                                  {record.portion}
                                  {record.portionUnit}
                                </span>
                                <span className="record-calories">
                                  {record.calories} 千卡
                                </span>
                              </div>
                              <div className="record-nutrition">
                                {Object.entries(record.nutrition).map(([key, value]) => (
                                  <span key={key} className="nutrition-tag">
                                    {NUTRIENT_NAMES[key as keyof typeof NUTRIENT_NAMES]}:{' '}
                                    {value}
                                    {NUTRIENT_UNITS[key as keyof typeof NUTRIENT_UNITS]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {hasRecords && <div className="day-completion-check">✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .daily-log-page {
          padding-bottom: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0;
        }

        .add-btn {
          padding: 0.625rem 1.25rem;
          font-size: 0.95rem;
        }

        .week-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 0.75rem 1rem;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .week-btn {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }

        .week-range {
          font-weight: 600;
          color: #4a5568;
          font-size: 0.95rem;
        }

        .timeline-viewport {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .timeline-slider {
          display: flex;
          width: 100%;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
        }

        .timeline-slider.transitioning-left {
          transform: translateX(-100%);
        }

        .timeline-slider.transitioning-right {
          transform: translateX(0%);
        }

        .timeline-pane {
          flex-shrink: 0;
          width: 100%;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1rem;
        }

        .day-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          animation: fadeInUp 0.4s ease-out backwards;
          position: relative;
          padding-bottom: 32px;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .day-header {
          padding: 1rem;
          background: linear-gradient(135deg, #4a90d9 0%, #357abd 100%);
          color: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .day-date {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .day-number {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
        }

        .day-month-week {
          display: flex;
          flex-direction: column;
        }

        .day-month {
          font-size: 0.85rem;
          opacity: 0.9;
        }

        .day-weekday {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .day-completion-check {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 32px;
          background: rgba(72, 187, 120, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          border-radius: 0 0 12px 12px;
          opacity: 0;
          animation: fadeInCheck 0.3s ease forwards;
          animation-delay: 0.5s;
        }

        @keyframes fadeInCheck {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .day-records {
          padding: 0.75rem;
          max-height: 500px;
          overflow-y: auto;
        }

        .empty-day {
          padding: 2rem 1rem;
          text-align: center;
          color: #a0aec0;
          font-size: 0.9rem;
        }

        .record-card {
          background: #f7fafc;
          border-radius: 10px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          transition: all 0.2s ease;
        }

        .record-card:last-child {
          margin-bottom: 0;
        }

        .record-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .record-image {
          width: 100%;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .record-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .record-time {
          font-size: 0.8rem;
          color: #718096;
          font-weight: 500;
        }

        .record-meal-type {
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          background: #e6fffa;
          color: #319795;
          border-radius: 12px;
          font-weight: 500;
        }

        .record-food-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0.25rem 0;
        }

        .record-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #718096;
          margin-bottom: 0.5rem;
        }

        .record-calories {
          font-weight: 600;
          color: #ed8936;
        }

        .record-nutrition {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .nutrition-tag {
          font-size: 0.7rem;
          padding: 0.1rem 0.35rem;
          background: #edf2f7;
          color: #4a5568;
          border-radius: 8px;
        }

        .form-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .form-card {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-card h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #1a202c;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.35rem;
          font-weight: 500;
          color: #4a5568;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4a90d9;
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        @media (max-width: 768px) {
          .timeline-pane {
            grid-template-columns: 1fr;
          }

          .day-card {
            width: 100%;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .week-nav {
            padding: 0.5rem;
          }

          .week-range {
            font-size: 0.85rem;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .add-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default DailyLogPage;
