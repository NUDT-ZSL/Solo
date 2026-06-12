import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    const margin = { top: 24, right: 20, bottom: 30, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    if (data.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6b7280')
        .attr('font-size', 12)
        .text('输入内容后将显示情感分析');
      return;
    }

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, data.length - 1]).range([0, innerW]);
    const y = d3.scaleLinear().domain([-1, 1]).range([innerH, 0]);

    const defs = svg.append('defs');
    const areaGrad = defs.append('linearGradient')
      .attr('id', 'sentAreaGrad')
      .attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.35);
    areaGrad.append('stop').attr('offset', '50%').attr('stop-color', '#4da6ff').attr('stop-opacity', 0.05);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#e94560').attr('stop-opacity', 0.35);

    const lineGrad = defs.append('linearGradient')
      .attr('id', 'sentLineGrad')
      .attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1');
    lineGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
    lineGrad.append('stop').attr('offset', '50%').attr('stop-color', '#4da6ff');
    lineGrad.append('stop').attr('offset', '100%').attr('stop-color', '#e94560');

    const yAxis = d3.axisLeft(y)
      .ticks(5)
      .tickFormat((d: d3.NumberValue) => Number(d).toFixed(1));
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#6b7280')
      .attr('font-size', 10);
    g.selectAll('.domain').attr('stroke', '#2a2a4e');
    g.selectAll('.tick line').attr('stroke', '#2a2a4e');

    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', '#2a2a4e')
      .attr('stroke-dasharray', '4,4');

    const positiveArea = d3.area<SentenceSentiment>()
      .x((d, i) => x(i))
      .y0(y(0))
      .y1((d) => y(Math.max(0, d.value)))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const negativeArea = d3.area<SentenceSentiment>()
      .x((d, i) => x(i))
      .y0(y(0))
      .y1((d) => y(Math.min(0, d.value)))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(data.filter(d => d.value >= 0))
      .attr('fill', 'rgba(16, 185, 129, 0.15)')
      .attr('d', positiveArea);

    g.append('path')
      .datum(data.filter(d => d.value <= 0))
      .attr('fill', 'rgba(233, 69, 96, 0.15)')
      .attr('d', negativeArea);

    const area = d3.area<SentenceSentiment>()
      .x((d, i) => x(i))
      .y0(y(0))
      .y1((d) => y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#sentAreaGrad)')
      .attr('d', area)
      .style('opacity', 0.5);

    const line = d3.line<SentenceSentiment>()
      .x((d, i) => x(i))
      .y((d) => y(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'url(#sentLineGrad)')
      .attr('stroke-width', 2.5)
      .attr('d', line)
      .style('filter', 'drop-shadow(0 0 6px rgba(77,166,255,0.4))');

    g.selectAll('.sent-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'sent-dot')
      .attr('cx', (d, i) => x(i))
      .attr('cy', (d) => y(d.value))
      .attr('r', 4)
      .attr('fill', (d) => d.value >= 0 ? '#10b981' : '#e94560')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          value: d.value,
          text: d.text,
        });
      })
      .on('mouseleave', () => setTooltip(null));

    g.append('text')
      .attr('x', -margin.left + 4)
      .attr('y', y(1) + 4)
      .attr('fill', '#10b981')
      .attr('font-size', 9)
      .text('+1');

    g.append('text')
      .attr('x', -margin.left + 4)
      .attr('y', y(-1) + 4)
      .attr('fill', '#e94560')
      .attr('font-size', 9)
      .text('-1');

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
  const drawerOpen = useStore((s) => s.drawerOpen);
  const setDrawerOpen = useStore((s) => s.setDrawerOpen);

  const [expanded, setExpanded] = useState({ conflict: true, sentiment: true, graph: true });
  const [isMobile, setIsMobile] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(300);
  const [drawerDragging, setDrawerDragging] = useState(false);

  const currentChapter = project?.chapters.find((c) => c.id === currentChapterId);

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    if (!drawerDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      setDrawerHeight(Math.max(150, Math.min(window.innerHeight * 0.7, newHeight)));
    };
    const handleTouchMove = (e: TouchEvent) => {
      const newHeight = window.innerHeight - e.touches[0].clientY;
      setDrawerHeight(Math.max(150, Math.min(window.innerHeight * 0.7, newHeight)));
    };
    const handleEnd = () => setDrawerDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [drawerDragging]);

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
            characters: project.characters,
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
            characters: project.characters,
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

  const panelsContent = (
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
  );

  if (isMobile) {
    return (
      <>
        <div style={{ display: 'none' }}>{panelsContent}</div>
        {createPortal(
          <>
            <button
              className="btn btn-primary ripple"
              style={{
                position: 'fixed',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                padding: '10px 24px',
                borderRadius: 24,
                fontSize: 13,
                fontWeight: 600,
                display: drawerOpen ? 'none' : 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => setDrawerOpen(true)}
            >
              <TrendingUp size={16} />
              智能分析
            </button>
            <div
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                background: '#16213e',
                borderTop: '1px solid #2a2a4e',
                borderRadius: '20px 20px 0 0',
                zIndex: 50,
                boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
                transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                height: drawerOpen ? drawerHeight : 0,
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'ns-resize',
                  flexShrink: 0,
                }}
                onMouseDown={() => setDrawerDragging(true)}
                onTouchStart={() => setDrawerDragging(true)}
                onDoubleClick={() => setDrawerOpen(!drawerOpen)}
              >
                <div style={{
                  width: 40,
                  height: 4,
                  background: '#2a2a4e',
                  borderRadius: 2,
                }} />
              </div>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 16px 16px',
              }}>
                {panelsContent}
              </div>
            </div>
            {drawerOpen && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.3)',
                  zIndex: 45,
                }}
                onClick={() => setDrawerOpen(false)}
              />
            )}
          </>,
          document.body
        )}
      </>
    );
  }

  return panelsContent;
};

export default AnalysisPanel;
