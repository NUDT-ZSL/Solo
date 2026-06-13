import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { projectApi, feedbackApi, Project, Feedback } from '../utils/api';

const PART_COLORS: Record<string, string> = {
  '第一小提琴': '#f59e0b',
  '第二小提琴': '#f59e0b',
  '小提琴': '#f59e0b',
  '大提琴': '#10b981',
  '低音提琴': '#ef4444',
  '中提琴': '#8b5cf6',
  '长笛': '#06b6d4',
};

const getPartColor = (part: string): string => {
  return PART_COLORS[part] || '#6b7280';
};

interface PartAverage {
  part: string;
  average: number;
  count: number;
}

export default function Review() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadFeedbacks();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (feedbacks.length > 0) {
      renderChart();
    }
  }, [feedbacks]);

  const loadData = async () => {
    try {
      const res = await projectApi.getAll();
      setProjects(res.data);
      if (res.data.length > 0) {
        setSelectedProjectId(res.data[0].id);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const loadFeedbacks = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await feedbackApi.getByProject(selectedProjectId);
      setFeedbacks(res.data);
    } catch (e) {
      console.error('Failed to load feedbacks:', e);
    }
  };

  const calculatePartAverages = (): PartAverage[] => {
    const partMap: Record<string, { total: number; count: number }> = {};

    feedbacks.forEach((f) => {
      if (!partMap[f.part]) {
        partMap[f.part] = { total: 0, count: 0 };
      }
      partMap[f.part].total += f.rating;
      partMap[f.part].count += 1;
    });

    return Object.entries(partMap).map(([part, data]) => ({
      part,
      average: data.total / data.count,
      count: data.count,
    }));
  };

  const renderChart = () => {
    if (!chartRef.current || feedbacks.length === 0) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();

    const data = calculatePartAverages();
    if (data.length === 0) return;

    const containerWidth = chartRef.current.parentElement?.offsetWidth || 800;
    const width = containerWidth - 40;
    const height = 280;
    const margin = { top: 20, right: 20, bottom: 60, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const barWidth = 40;
    const barGap = 12;
    const totalBarWidth = data.length * barWidth + (data.length - 1) * barGap;
    const offsetX = (innerWidth - totalBarWidth) / 2;

    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.part))
      .range([offsetX, offsetX + totalBarWidth])
      .padding(0);

    const yScale = d3.scaleLinear().domain([0, 5]).range([innerHeight, 0]);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '12px')
      .attr('transform', 'rotate(-15)')
      .style('text-anchor', 'end');

    g.selectAll('.domain, .tick line').attr('stroke', '#333');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.1f')))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '12px');

    g.selectAll('.domain').attr('stroke', '#333');
    g.selectAll('.tick line').attr('stroke', '#333');

    const bars = g
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'bar');

    bars
      .append('rect')
      .attr('x', (d) => xScale(d.part)! + (xScale.bandwidth() - barWidth) / 2)
      .attr('y', innerHeight)
      .attr('width', barWidth)
      .attr('height', 0)
      .attr('fill', (d) => getPartColor(d.part))
      .attr('rx', 6)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => yScale(d.average))
      .attr('height', (d) => innerHeight - yScale(d.average));

    bars
      .append('text')
      .attr('x', (d) => xScale(d.part)! + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.average) - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .style('opacity', 0)
      .transition()
      .duration(800)
      .delay(400)
      .style('opacity', 1)
      .text((d) => d.average.toFixed(1));

    bars
      .append('text')
      .attr('x', (d) => xScale(d.part)! + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.average) + (innerHeight - yScale(d.average)) / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', '10px')
      .style('opacity', 0)
      .transition()
      .duration(800)
      .delay(600)
      .style('opacity', 1)
      .text((d) => `${d.count}次`);
  };

  const getRatingStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const partAverages = calculatePartAverages();
  const overallAverage =
    feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">排练回顾</h1>
            <p className="page-subtitle">查看各声部排练评分和反馈记录</p>
          </div>
          <select
            className="form-select"
            style={{ width: '200px' }}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProject && (
        <div className="grid grid-cols-3">
          <div className="card stat-card">
            <div className="stat-value">{feedbacks.length}</div>
            <div className="stat-label">反馈总数</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{overallAverage.toFixed(1)}</div>
            <div className="stat-label">平均评分</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{partAverages.length}</div>
            <div className="stat-label">参与声部</div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          各声部平均评分
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
          柱状图展示各声部的平均评分趋势，柱宽40px，间距12px
        </p>
        <div className="chart-container">
          <svg ref={chartRef}></svg>
        </div>
        {feedbacks.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-secondary)',
            }}
          >
            暂无反馈数据，请先提交排练反馈
          </div>
        )}
      </div>

      {partAverages.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            声部评分详情
          </h2>
          <div className="grid grid-cols-2">
            {partAverages.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  background: '#0f172a',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              >
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: '500' }}>{item.part}</span>
                  <div
                    style={{
                      color: getPartColor(item.part),
                      fontWeight: '700',
                      fontSize: '18px',
                    }}
                  >
                    {item.average.toFixed(1)}
                  </div>
                </div>
                <div style={{ color: 'var(--accent-yellow)', marginBottom: '4px' }}>
                  {getRatingStars(Math.round(item.average))}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  共 {item.count} 条反馈
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedbacks.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            反馈记录
          </h2>
          {feedbacks.map((feedback) => (
            <div key={feedback.id} className="feedback-item">
              <div className="feedback-header">
                <div className="flex gap-2">
                  <span className="feedback-author">{feedback.memberName}</span>
                  <span className="badge badge-info">{feedback.part}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-yellow)', fontSize: '16px' }}>
                    {getRatingStars(feedback.rating)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {new Date(feedback.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
              {feedback.note && (
                <p className="feedback-note">{feedback.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
