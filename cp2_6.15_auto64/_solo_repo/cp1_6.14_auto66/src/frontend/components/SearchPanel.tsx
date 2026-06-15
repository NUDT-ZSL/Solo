import React, { useState } from 'react';
import { MapPin, Calendar, Tags, Wallet, Sparkles } from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import { PREFERENCE_TAGS, BUDGET_OPTIONS } from '../utils/types';
import type { PlanRequest } from '../utils/types';

const SearchPanel: React.FC = () => {
  const { generatePlan, isLoading } = useTravel();
  const [destination, setDestination] = useState('京都');
  const [days, setDays] = useState(5);
  const [preferences, setPreferences] = useState<string[]>(['文化', '美食']);
  const [budget, setBudget] = useState('中等');

  const togglePreference = (tag: string) => {
    setPreferences(prev =>
      prev.includes(tag)
        ? prev.filter(p => p !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || preferences.length === 0) return;

    const request: PlanRequest = {
      destination: destination.trim(),
      days,
      preferences,
      budget,
    };

    generatePlan(request);
  };

  return (
    <aside className="search-panel">
      <div className="panel-header">
        <h1 className="panel-title">
          <Sparkles className="title-icon" size={24} />
          智能旅行规划
        </h1>
        <p className="panel-subtitle">输入您的偏好，一键生成专属行程</p>
      </div>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-group">
          <label className="form-label">
            <MapPin size={16} />
            旅行目的地
          </label>
          <input
            type="text"
            className="form-input"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="例如：京都、东京、大阪"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <Calendar size={16} />
            旅行天数
          </label>
          <div className="days-selector">
            <input
              type="range"
              min="1"
              max="14"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="days-slider"
            />
            <div className="days-display">
              <span>{days}</span>
              <span className="days-unit">天</span>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Tags size={16} />
            旅行偏好（多选）
          </label>
          <div className="preference-tags">
            {PREFERENCE_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                className={`preference-tag ${preferences.includes(tag) ? 'active' : ''}`}
                onClick={() => togglePreference(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Wallet size={16} />
            预算范围
          </label>
          <select
            className="form-select"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          >
            {BUDGET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="generate-btn"
          disabled={isLoading || !destination.trim() || preferences.length === 0}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner"></span>
              生成中...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              生成计划
            </>
          )}
        </button>
      </form>
    </aside>
  );
};

export default SearchPanel;
