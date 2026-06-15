import React, { useState, useEffect } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ComposedChart,
} from 'recharts';
import type { StatsResponse, NutritionSummary, DailyNutrition } from '../api/types';
import { NUTRIENT_NAMES, NUTRIENT_UNITS } from '../api/types';
import { formatDisplayDate } from '../utils/timeHelpers';
import AnimatedNumber from '../components/AnimatedNumber';
import AnimatedTooltip from '../components/AnimatedTooltip';

const StatsPage: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedNutrient, setExpandedNutrient] = useState<keyof NutritionSummary | null>(null);
  const [cardsVisible, setCardsVisible] = useState<string[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/stats?week=${weekOffset}`);
        const data: StatsResponse = await response.json();
        setStats(data);
        setExpandedNutrient(null);
        setCardsVisible([]);

        const nutrients: (keyof NutritionSummary)[] = [
          'protein',
          'carbs',
          'fat',
          'fiber',
          'vitaminC',
          'calcium',
        ];
        nutrients.forEach((nutrient, index) => {
          setTimeout(() => {
            setCardsVisible((prev) => [...prev, nutrient]);
          }, index * 200);
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [weekOffset]);



  const getRadarData = () => {
    if (!stats) return [];
    const nutrients: (keyof NutritionSummary)[] = [
      'protein',
      'carbs',
      'fat',
      'fiber',
      'vitaminC',
      'calcium',
    ];

    return nutrients.map((nutrient) => ({
      nutrient: NUTRIENT_NAMES[nutrient],
      actual: stats.weeklyTotal[nutrient],
      recommended: stats.weeklyRecommended[nutrient],
      actualRatio: Math.min((stats.weeklyTotal[nutrient] / stats.weeklyRecommended[nutrient]) * 100, 150),
      recommendedRatio: 100,
    }));
  };

  const getTrendData = (nutrient: keyof NutritionSummary) => {
    if (!stats) return [];
    return stats.dailyData.map((item: DailyNutrition) => ({
      date: formatDisplayDate(item.date),
      value: item.nutrition[nutrient],
      recommended: stats.weeklyRecommended[nutrient] / 7,
    }));
  };

  const radarData = getRadarData();

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#e53e3e';
  };

  return (
    <div className="page stats-page">
      <div className="page-header">
        <h1 className="page-title">营养分析</h1>
        <div className="week-nav">
          <button
            className="btn btn-secondary week-btn"
            onClick={() => setWeekOffset((prev) => prev - 1)}
          >
            ← 上一周
          </button>
          <button
            className="btn btn-secondary week-btn"
            onClick={() => setWeekOffset((prev) => prev + 1)}
          >
            下一周 →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : stats ? (
        <>
          <div className="score-card" style={{ backgroundColor: getScoreColor(stats.balanceScore) }}>
            <div className="score-label">本周营养均衡评分</div>
            <div className="score-value">
              <AnimatedNumber value={stats.balanceScore} duration={500} />
            </div>
            <div className="score-max">/ 100</div>
          </div>

          <div className="chart-card">
            <h3 className="card-title">营养素摄入对比</h3>
            <div className="radar-chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="nutrient"
                    tick={{ fill: '#4a5568', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 150]}
                    tick={{ fill: '#a0aec0', fontSize: 10 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Radar
                    name="推荐量"
                    dataKey="recommendedRatio"
                    stroke="#e2e8f0"
                    fill="#e2e8f0"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="实际摄入"
                    dataKey="actualRatio"
                    stroke="#4a90d9"
                    fill="#4a90d9"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'actualRatio') return [`${value.toFixed(1)}%`, '实际摄入'];
                      if (name === 'recommendedRatio') return [`${value}%`, '推荐量'];
                      return [value, name];
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="nutrients-grid">
            {(Object.keys(NUTRIENT_NAMES) as (keyof NutritionSummary)[]).map((nutrient, index) => {
              const total = stats.weeklyTotal[nutrient];
              const recommended = stats.weeklyRecommended[nutrient];
              const ratio = (total / recommended) * 100;
              const unit = NUTRIENT_UNITS[nutrient];
              const isVisible = cardsVisible.includes(nutrient);
              const isExpanded = expandedNutrient === nutrient;

              return (
                <div
                  key={nutrient}
                  className={`nutrient-card ${isVisible ? 'visible' : ''} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setExpandedNutrient(isExpanded ? null : nutrient)}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="nutrient-header">
                    <h4 className="nutrient-name">{NUTRIENT_NAMES[nutrient]}</h4>
                    <span className="expand-icon">{isExpanded ? '↑' : '↓'}</span>
                  </div>
                  <div className="nutrient-values">
                    <div className="nutrient-actual">
                      <span className="value">{total.toFixed(1)}</span>
                      <span className="unit">{unit}</span>
                    </div>
                    <div className="nutrient-recommended">
                      / {recommended.toFixed(0)} {unit}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(ratio, 100)}%`,
                        backgroundColor: ratio >= 90 && ratio <= 110 ? '#48bb78' : ratio < 70 ? '#e53e3e' : '#ed8936',
                      }}
                    />
                  </div>
                  <div className="nutrient-percentage">
                    {ratio.toFixed(1)}%
                  </div>

                  {isExpanded && (
                    <div className="trend-chart">
                      <div className="trend-title">本周摄入趋势</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart data={getTrendData(nutrient)}>
                          <defs>
                            <linearGradient id={`gradient-${nutrient}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4a90d9" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#4a90d9" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: '#718096', fontSize: 10 }}
                            tickFormatter={(value) => value.split(' ')[0]}
                          />
                          <YAxis tick={{ fill: '#718096', fontSize: 10 }} />
                          <Tooltip
                            content={<AnimatedTooltip unit={unit} />}
                            animationDuration={0}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#4a90d9"
                            strokeWidth={2}
                            fill={`url(#gradient-${nutrient})`}
                            dot={{ fill: '#4a90d9', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#357abd' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="recommended"
                            stroke="#e53e3e"
                            strokeDasharray="5 5"
                            strokeWidth={1}
                            dot={false}
                            name="推荐量"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <style>{`
        .stats-page {
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

        .week-nav {
          display: flex;
          gap: 0.5rem;
        }

        .week-btn {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }

        .score-card {
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          color: #fff;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .score-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .score-label {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-bottom: 0.5rem;
          position: relative;
        }

        .score-value {
          font-size: 4rem;
          font-weight: 700;
          line-height: 1;
          position: relative;
          display: inline-block;
        }

        .score-max {
          font-size: 1.5rem;
          opacity: 0.7;
          display: inline-block;
          margin-left: 0.5rem;
          position: relative;
        }

        .chart-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 1rem 0;
        }

        .radar-chart-container {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .nutrients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .nutrient-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          cursor: pointer;
          transition: box-shadow 0.3s ease;
          opacity: 0;
          transform: translateY(30px);
        }

        .nutrient-card.visible {
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .nutrient-card.expanded {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .nutrient-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .nutrient-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0;
        }

        .expand-icon {
          font-size: 1.25rem;
          color: #a0aec0;
          transition: transform 0.3s ease;
        }

        .nutrient-card.expanded .expand-icon {
          transform: rotate(180deg);
        }

        .nutrient-values {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .nutrient-actual .value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a202c;
        }

        .nutrient-actual .unit {
          font-size: 0.9rem;
          color: #718096;
          margin-left: 0.25rem;
        }

        .nutrient-recommended {
          font-size: 0.9rem;
          color: #a0aec0;
        }

        .progress-bar {
          height: 8px;
          background: #edf2f7;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .nutrient-percentage {
          font-size: 0.85rem;
          font-weight: 600;
          color: #4a5568;
          text-align: right;
        }

        .trend-chart {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 250px;
            transform: translateY(0);
          }
        }

        .trend-title {
          font-size: 0.9rem;
          font-weight: 500;
          color: #4a5568;
          margin-bottom: 0.75rem;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #a0aec0;
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .nutrients-grid {
            grid-template-columns: 1fr;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .score-value {
            font-size: 3rem;
          }

          .radar-chart-container {
            height: 350px;
          }
        }
      `}</style>
    </div>
  );
};

export default StatsPage;
