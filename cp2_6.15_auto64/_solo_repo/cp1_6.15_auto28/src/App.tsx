/**
 * src/App.tsx
 *
 * 主组件 —— 状态管理与数据分发中心
 *
 * 调用关系与数据流向：
 *   1. 本组件通过 fetch('/api/votings') 获取主题列表（→ vite proxy → server.ts → mockData.ts）
 *   2. 选中主题后通过 fetch('/api/votings/:id') 获取详情
 *   3. 将数据通过 props 分发给子组件：
 *      - data (options) → VoteDistributionChart.tsx（得票分布图表）
 *      - records        → VoteTimelineChart.tsx（投票趋势折线图）
 *      - summary数据    → VoteSummaryPanel.tsx（统计摘要面板）
 *   4. 本组件管理状态：selectedTopicId、detail、fadeTransition（动画控制）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VotingTopic, VotingDetail } from './types';
import VoteDistributionChart from './VoteDistributionChart';
import VoteTimelineChart from './VoteTimelineChart';
import VoteSummaryPanel from './VoteSummaryPanel';

export default function App() {
  const [topics, setTopics] = useState<VotingTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [detail, setDetail] = useState<VotingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fadeKey, setFadeKey] = useState(0);
  const [titleAnimating, setTitleAnimating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/votings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setTopics(json.data);
          setSelectedTopicId(json.data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedTopicId) return;
    setLoading(true);
    fetch(`/api/votings/${selectedTopicId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDetail(json.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedTopicId]);

  const handleTopicChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTitleAnimating(true);
    setTimeout(() => setTitleAnimating(false), 300);
    setFadeKey((prev) => prev + 1);
    setSelectedTopicId(e.target.value);
  }, []);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-content">
          <h1 className={`app-title ${titleAnimating ? 'title-bounce' : ''}`}>
            投票结果可视化分析面板
          </h1>
          <div className="topic-selector">
            <label htmlFor="topic-select">选择投票主题：</label>
            <select
              id="topic-select"
              value={selectedTopicId}
              onChange={handleTopicChange}
              className="topic-select"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selectedTopic && (
          <p className={`topic-desc ${titleAnimating ? 'title-bounce' : ''}`}>
            {selectedTopic.description}
          </p>
        )}
      </header>

      {loading && !detail ? (
        <div className="loading-spinner">
          <div className="spinner" />
          <span>加载中...</span>
        </div>
      ) : detail ? (
        <div
          key={fadeKey}
          ref={panelRef}
          className="charts-panel fade-enter"
        >
          <div className="charts-grid">
            <div className="chart-card">
              <VoteDistributionChart options={detail.options} records={detail.records} />
            </div>
            <div className="chart-card chart-card-timeline">
              <VoteTimelineChart records={detail.records} options={detail.options} />
            </div>
            <div className="chart-card">
              <VoteSummaryPanel detail={detail} panelRef={panelRef} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
