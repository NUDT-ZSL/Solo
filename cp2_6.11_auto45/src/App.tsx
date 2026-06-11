import React, { useState, useEffect, useCallback } from 'react';
import type { Rating, CategoryStats, Category, RatingsResponse } from './shared/types';
import { CATEGORIES } from './shared/types';
import Form from './Form';
import Heatmap from './Heatmap';
import TrendChart from './TrendChart';
import Toolbar from './Toolbar';

const COMMENTS = [
  '团队配合很默契',
  '响应速度很快',
  '文档质量有待提高',
  '创新思路很棒',
  '技术能力强',
  '沟通效率高',
  '需要更多细节',
  '整体表现不错',
];

export default function App() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [recentRatings, setRecentRatings] = useState<Rating[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/ratings');
      const data: RatingsResponse = await response.json();
      setRatings(data.ratings);
      setStats(data.stats);
      setRecentRatings(data.recentRatings);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, []);

  const handleSubmit = async (data: { category: Category; score: number; comment?: string }) => {
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const result: RatingsResponse = await response.json();
      setRatings(result.ratings);
      setStats(result.stats);
      setRecentRatings(result.recentRatings);
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  const handleClear = async () => {
    try {
      const response = await fetch('/api/ratings', {
        method: 'DELETE',
      });
      const result: RatingsResponse = await response.json();
      setRatings(result.ratings);
      setStats(result.stats);
      setRecentRatings(result.recentRatings);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  const generateMockData = async () => {
    setIsGenerating(true);
    try {
      for (let i = 0; i < 20; i++) {
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const score = Math.floor(Math.random() * 5) + 1;
        const hasComment = Math.random() > 0.5;
        const comment = hasComment ? COMMENTS[Math.floor(Math.random() * COMMENTS.length)] : undefined;

        const response = await fetch('/api/ratings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ category, score, comment }),
        });
        const result: RatingsResponse = await response.json();
        setRatings(result.ratings);
        setStats(result.stats);
        setRecentRatings(result.recentRatings);

        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Failed to generate mock data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="app-container">
      <h1>评价热流</h1>
      <p className="subtitle">跨部门匿名互评仪表板</p>
      <div className="main-layout">
        <div className="left-panel">
          <Form onSubmit={handleSubmit} />
        </div>
        <div className="right-panel">
          <Toolbar
            onGenerate={generateMockData}
            onClear={handleClear}
            isGenerating={isGenerating}
            ratingsCount={ratings.length}
          />
          <Heatmap ratings={ratings} stats={stats} />
          <TrendChart stats={stats} />
        </div>
      </div>
    </div>
  );
}
