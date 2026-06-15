import React, { useState } from 'react';
import { generateItinerary } from '../services/budgetService';
import { useItinerary } from '../context/ItineraryContext';
import './BudgetInput.css';

type Preference = 'budget' | 'balanced' | 'luxury';

const BudgetInput: React.FC = () => {
  const [budget, setBudget] = useState<number>(5000);
  const [days, setDays] = useState<number>(5);
  const [preference, setPreference] = useState<Preference>('balanced');
  const [isFolding, setIsFolding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setItinerary, setSelectedDay } = useItinerary();

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value >= 0) {
      setBudget(value);
    }
  };

  const handleDaysChange = (delta: number) => {
    const newDays = days + delta;
    if (newDays >= 1 && newDays <= 30) {
      setDays(newDays);
    }
  };

  const handleGenerate = async () => {
    if (budget <= 0 || days <= 0) return;

    setIsLoading(true);
    try {
      const result = await generateItinerary({ budget, days, preference });
      setItinerary(result);
      setSelectedDay(1);
      setIsFolding(true);
    } catch (error) {
      console.error('生成行程失败:', error);
      alert('生成行程失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const preferences: { value: Preference; label: string }[] = [
    { value: 'budget', label: '省钱' },
    { value: 'balanced', label: '均衡' },
    { value: 'luxury', label: '奢华' },
  ];

  return (
    <div className={`budget-input-container ${isFolding ? 'folding' : ''}`}>
      <div className="budget-input-card">
        <h1 className="budget-input-title">智能旅行预算规划器</h1>
        <p className="budget-input-subtitle">输入预算和偏好，为您定制完美行程</p>

        <div className="input-row">
          <div className="input-group">
            <label className="input-label">总预算金额</label>
            <div className="budget-input-wrapper">
              <span className="currency-symbol">¥</span>
              <input
                type="number"
                value={budget}
                onChange={handleBudgetChange}
                className="budget-input"
                placeholder="输入预算"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">旅行天数</label>
            <div className="days-input">
              <button
                className="days-btn minus"
                onClick={() => handleDaysChange(-1)}
                disabled={days <= 1}
              >
                −
              </button>
              <span className="days-value">{days}</span>
              <button
                className="days-btn plus"
                onClick={() => handleDaysChange(1)}
                disabled={days >= 30}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="input-group preference-group">
          <label className="input-label">旅行偏好</label>
          <div className="preference-buttons">
            {preferences.map((p) => (
              <button
                key={p.value}
                className={`preference-btn ${preference === p.value ? 'active' : ''}`}
                onClick={() => setPreference(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={isLoading || budget <= 0 || days <= 0}
        >
          {isLoading ? '生成中...' : '生成行程'}
        </button>
      </div>
    </div>
  );
};

export default BudgetInput;
