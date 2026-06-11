import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AlertTriangle, TrendingUp, Users, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useStore } from './store';
import CharacterGraph from './CharacterGraph';
import type { ConflictItem, SentenceSentiment } from './types';

interface PanelProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AnalysisCard: React.FC<PanelProps> = ({ title, icon, expanded, onToggle, children }) => (
  <div className={`analysis-card ${expanded ? 'expanded' : ''}`}>
    <div className="analysis-card-header" onClick={onToggle}>
      <div className="analysis-card-title">
        <span className="icon">{icon}</span>
        {title}
      </div>
      <button className="collapse-btn">
        <ChevronDown size={16} />
      </button>
    </div>
    <div className="analysis-card-body">{children}</div>
  </div>
);

const SentimentChart: React.FC<{ data: SentenceSentiment[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; text: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const margin = { top: 20, right: 20, bottom: 30, left: 30 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    if (data.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-muted)')
        .attr('font-size', 12)
        .text('输入内容后将显示情感分析');
      return;
    }

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, data.length - 1]).range([0, innerW]);
    const y = d3.scaleLinear().domain([-1, 1]).range([innerH, 0]);

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'areaGrad').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#e94560').attr('stop-opacity', 0.4);
    grad.append('stop').attr('offset', '50%').attr('stop-color', '#4da6ff').attr('stop-opacity', 0.2);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#4da6ff').attr('stop-opacity', 0.4);

    g.append('g')
      .attr('transform', `translate(0,${innerH / 2})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(() => ''))
      .selectAll('text,line').remove();
    g.selectAll('.domain').attr('stroke', 'var(--divider)');

    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', 'var(--divider)')
      .attr('stroke-dasharray', '4,4');

    const line = d3.line<SentenceSentiment>()
      .x((d, i) => x(i))
      .y((d) => y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const area = d3.area<SentenceSentiment>()
      .x((d, i) => x(i))
      .y0(y(0))
      .y1((d) => y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#areaGrad)')
      .attr('d', area)
      .style('opacity', 0.6);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#e94560')
      .attr('stroke-width', 2.5)
      .attr('d', line)
      .style('filter', 'drop-shadow(0 0 4px rgba(233,69,96,0.6))');

    g.selectAll('.sent-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'sent-dot')
      .attr('cx', (d, i) => x(i))
      .attr('cy', (d) => y(d.value))
      .attr('r', 4)
      .attr('fill', (d) => d.value >= 0 ? '#10b981' : '#e94560')
      .attr('stroke', 'var(--bg-primary)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        const rect = containerRef.current!.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          value: d.value,
          text: d.text,
        });
      })
      .on('mouseleave', () => setTooltip(null));
  }, [data]);

  return (
    <div ref={containerRef} className="sentiment-chart" style={{ position: 'relative' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      {tooltip && (
        <div
          className="sentiment-tooltip"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          <div style={{ fontWeight: 600, color: tooltip.value >= 0 ? '#10b981' : '#e94560' }}>
            情感值: {tooltip.value.toFixed(2)}
          </div>
          <div style={{ color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tooltip.text}
          </div>
        </div>
      )}
    </div>
  );
};

const AnalysisPanel: React.FC = () => {
  const project = useStore((s) => s.project);
  const currentChapterId = useStore((s) => s.currentChapterId);
  const characterGraph = useStore((s) => s.characterGraph);
  const setConflicts = useStore((s) => s.setConflicts);
  const setSentiments = useStore((s) => s.setSentiments);
  const setCharacterGraph = useStore((s) => s.setCharacterGraph);
  const conflicts = useStore((s) => s.conflicts);
  const sentiments = useStore((s) => s.sentiments);

  const [expanded, setExpanded] = useState({ conflict: true, sentiment: true, graph: true });

  const currentChapter = project?.chapters.find((c) => c.id === currentChapterId);

  useEffect(() => {
    if (!currentChapter || !project) return;

    let active = true;
    const controller = new AbortController();

    const runAnalysis = async () => {
      try {
        const [conflictRes, sentimentRes, charRes] = await Promise.all([
          axios.post('/api/analysis/conflict', {
            projectId: project.id,
            chapterId: currentChapterId,
            content: currentChapter.content,
          }, { signal: controller.signal }),
          axios.post('/api/analysis/sentiment', { content: currentChapter.content }, { signal: controller.signal }),
          axios.post('/api/analysis/characters', {
            projectId: project.id,
            content: project.chapters.map((c) => c.content).join('\n\n'),
            characters: project.characters,
          }, { signal: controller.signal }),
        ]);
        if (active) {
          setConflicts(conflictRes.data.conflicts || []);
          setSentiments(sentimentRes.data.sentences || []);
          setCharacterGraph(charRes.data);
        }
      } catch (e) {
        if ((e as any).name !== 'CanceledError') {
          console.error('Analysis error:', e);
        }
      }
    };

    const timeout = setTimeout(runAnalysis, 800);
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [currentChapter?.content, project?.characters, currentChapterId, project?.id]);

  useEffect(() => {
    if (!project) return;
    const interval = setInterval(async () => {
      try {
        const [conflictRes, sentimentRes, charRes] = await Promise.all([
          axios.post('/api/analysis/conflict', {
            projectId: project.id,
            chapterId: currentChapterId,
            content: currentChapter?.content || '',
          }),
          axios.post('/api/analysis/sentiment', { content: currentChapter?.content || '' }),
          axios.post('/api/analysis/characters', {
            projectId: project.id,
            content: project.chapters.map((c) => c.content).join('\n\n'),
            characters: project.characters,
          }),
        ]);
        setConflicts(conflictRes.data.conflicts || []);
        setSentiments(sentimentRes.data.sentences || []);
        setCharacterGraph(charRes.data);
      } catch (e) {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [project, currentChapter?.content, currentChapterId]);

  return (
    <>
      <div className="analysis-panels-container">
        <AnalysisCard
          title="情节冲突检测"
          icon={<AlertTriangle size={16} />}
          expanded={expanded.conflict}
          onToggle={() => setExpanded({ ...expanded, conflict: !expanded.conflict })}
        >
          {conflicts.length === 0 ? (
            <div className="empty-state">暂无检测到的情节冲突</div>
          ) : (
            <div className="conflict-list">
              {conflicts.map((c: ConflictItem, i: number) => (
                <div key={i} className="conflict-item">
                  <div className="conflict-chars">
                    <span>⚔</span>
                    <span>{c.characters[0]}</span>
                    <span>vs</span>
                    <span>{c.characters[1]}</span>
                  </div>
                  <div className="conflict-reason">{c.reason}</div>
                </div>
              ))}
            </div>
          )}
        </AnalysisCard>

        <AnalysisCard
          title="情感极性分析"
          icon={<TrendingUp size={16} />}
          expanded={expanded.sentiment}
          onToggle={() => setExpanded({ ...expanded, sentiment: !expanded.sentiment })}
        >
          <SentimentChart data={sentiments} />
        </AnalysisCard>

        <AnalysisCard
          title="角色共现关系"
          icon={<Users size={16} />}
          expanded={expanded.graph}
          onToggle={() => setExpanded({ ...expanded, graph: !expanded.graph })}
        >
          <CharacterGraph data={characterGraph} />
        </AnalysisCard>
      </div>
    </>
  );
};

export default AnalysisPanel;
