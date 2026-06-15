import React, { useState, useEffect } from 'react';
import type { UserSettings, NutritionSummary } from '../api/types';
import { ACTIVITY_LEVEL_LABELS, NUTRIENT_NAMES, NUTRIENT_UNITS } from '../api/types';
import { calculateRecommendations } from '../utils/nutritionAnalysis';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    age: 28,
    gender: 'male',
    activityLevel: 'moderate',
  });
  const [recommendations, setRecommendations] = useState<NutritionSummary | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsRes, recommendationsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/recommendations'),
        ]);
        const settingsData = await settingsRes.json();
        const recommendationsData = await recommendationsRes.json();
        setSettings(settingsData);
        setRecommendations(recommendationsData.daily);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    const newRecommendations = calculateRecommendations(
      settings.age,
      settings.gender,
      settings.activityLevel
    );
    setRecommendations(newRecommendations);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 600);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h1 className="page-title">个人设置</h1>
      </div>

      <form onSubmit={handleSave}>
        <div className="settings-card">
          <h3 className="card-title">基本信息</h3>

          <div className="form-group">
            <label>年龄</label>
            <input
              type="number"
              min="1"
              max="120"
              value={settings.age}
              onChange={(e) => setSettings({ ...settings, age: parseInt(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label>性别</label>
            <div className="radio-group">
              <label className="radio-item">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={settings.gender === 'male'}
                  onChange={(e) =>
                    setSettings({ ...settings, gender: e.target.value as 'male' | 'female' })
                  }
                />
                <span>男性</span>
              </label>
              <label className="radio-item">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={settings.gender === 'female'}
                  onChange={(e) =>
                    setSettings({ ...settings, gender: e.target.value as 'male' | 'female' })
                  }
                />
                <span>女性</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>活动量等级</label>
            <select
              value={settings.activityLevel}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  activityLevel: e.target.value as UserSettings['activityLevel'],
                })
              }
            >
              {Object.entries(ACTIVITY_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {recommendations && (
          <div className="recommendations-card">
            <h3 className="card-title">每日推荐摄入量</h3>
            <div className="recommendations-grid">
              {(Object.keys(NUTRIENT_NAMES) as (keyof NutritionSummary)[]).map((nutrient) => (
                <div key={nutrient} className="recommendation-item">
                  <span className="nutrient-label">{NUTRIENT_NAMES[nutrient]}</span>
                  <span className="nutrient-value">
                    {recommendations[nutrient]} {NUTRIENT_UNITS[nutrient]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
          {loading ? '保存中...' : '保存设置'}
        </button>
      </form>

      {showSuccess && (
        <div className="success-overlay">
          <div className="success-checkmark">
            <svg viewBox="0 0 52 52">
              <circle
                className="checkmark-circle"
                cx="26"
                cy="26"
                r="25"
                fill="none"
                stroke="#48bb78"
                strokeWidth="3"
              />
              <path
                className="checkmark-check"
                fill="none"
                stroke="#48bb78"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l7 7 16-16"
              />
            </svg>
          </div>
        </div>
      )}

      <style>{`
        .settings-page {
          padding-bottom: 2rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 1.5rem;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0;
        }

        .settings-card,
        .recommendations-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .card-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 1.25rem 0;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #4a5568;
          font-size: 0.95rem;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
          background: #fafafa;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4a90d9;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
        }

        .radio-group {
          display: flex;
          gap: 2rem;
        }

        .radio-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          flex: 1;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .radio-item input {
          width: auto;
          margin: 0;
          accent-color: #4a90d9;
        }

        .radio-item:has(input:checked) {
          border-color: #4a90d9;
          background: #ebf8ff;
        }

        .radio-item span {
          font-weight: 500;
          color: #4a5568;
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .recommendation-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: #f7fafc;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .recommendation-item:hover {
          background: #edf2f7;
        }

        .nutrient-label {
          font-size: 0.9rem;
          color: #718096;
        }

        .nutrient-value {
          font-size: 1rem;
          font-weight: 600;
          color: #4a90d9;
        }

        .submit-btn {
          width: 100%;
          padding: 0.875rem 1.5rem;
          font-size: 1.05rem;
          font-weight: 600;
        }

        .success-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeInOverlay 0.6s ease forwards;
        }

        @keyframes fadeInOverlay {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }

        .success-checkmark {
          width: 120px;
          height: 120px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: scaleInOut 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          box-shadow: 0 4px 20px rgba(72, 187, 120, 0.4);
        }

        @keyframes scaleInOut {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          30% {
            transform: scale(1.1);
            opacity: 1;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
          70% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .success-checkmark svg {
          width: 80px;
          height: 80px;
        }

        .checkmark-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: stroke 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.1s forwards;
        }

        .checkmark-check {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.25s forwards;
        }

        @keyframes stroke {
          to {
            stroke-dashoffset: 0;
          }
        }

        @media (max-width: 768px) {
          .radio-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .recommendations-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
