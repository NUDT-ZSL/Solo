import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EventManager, TimelineEvent } from './EventManager';
import { TimelineEngine, LayoutMode, TimelineLayout } from './TimelineEngine';
import { CanvasRenderer } from './CanvasRenderer';
import { UIOverlay } from './UIOverlay';

const SAMPLE_EVENTS: Omit<TimelineEvent, 'id'>[] = [
  {
    title: '金字塔建造',
    year: 2560,
    isBCE: true,
    description: '古埃及人在吉萨高原上建造了大金字塔，这是古代世界七大奇迹中唯一幸存至今的建筑。它的建造技术至今仍是未解之谜。',
    icon: '🏛️',
    color: '#c9a84c',
  },
  {
    title: '罗马帝国建立',
    year: 27,
    isBCE: true,
    description: '屋大维获元老院授予"奥古斯都"称号，罗马从共和国转变为帝国，开启了长达数百年的罗马和平时期。',
    icon: '👑',
    color: '#e06040',
  },
  {
    title: '丝绸之路开通',
    year: 130,
    isBCE: true,
    description: '张骞出使西域，正式打通了东西方贸易与文化交流的通道，丝绸之路成为连接文明的重要纽带。',
    icon: '⚓',
    color: '#4ca8e0',
  },
  {
    title: '文艺复兴开始',
    year: 1400,
    isBCE: false,
    description: '意大利佛罗伦萨掀起了文艺复兴运动，人文主义思潮席卷欧洲，开创了艺术与科学的新纪元。',
    icon: '🎨',
    color: '#a060e0',
  },
  {
    title: '工业革命',
    year: 1760,
    isBCE: false,
    description: '蒸汽机的改良和广泛应用引发了工业革命，人类社会从农业时代迈向工业时代，深刻改变了世界面貌。',
    icon: '⚒️',
    color: '#e08040',
  },
  {
    title: '人类登月',
    year: 1969,
    isBCE: false,
    description: '阿波罗11号成功将人类送上月球。尼尔·阿姆斯特朗迈出的"一小步"成为人类太空探索的里程碑。',
    icon: '🚀',
    color: '#60e0c0',
  },
];

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventManagerRef = useRef(new EventManager());
  const engineRef = useRef(new TimelineEngine());
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('horizontal');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);

  const getDisplayEvents = useCallback((): TimelineEvent[] => {
    if (filteredEvents.length > 0) return filteredEvents;
    return eventManagerRef.current.getEventsOrdered();
  }, [filteredEvents]);

  useEffect(() => {
    const em = eventManagerRef.current;
    for (const evt of SAMPLE_EVENTS) {
      em.addEvent(evt);
    }
    setFilteredEvents(em.getEventsOrdered());
  }, []);

  useEffect(() => {
    const em = eventManagerRef.current;
    const unsub = em.addListener(() => {
      setFilteredEvents(em.getEventsOrdered());
      forceUpdate((n) => n + 1);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.resize(w, h);
      engineRef.current.setViewport(w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    const renderer = rendererRef.current;
    if (!renderer) return;

    engine.setLayoutMode(layoutMode);
    engine.setOnFrame((layout: TimelineLayout) => {
      renderer.render(layout, layoutMode);
    });

    const events = getDisplayEvents();
    engine.stop();
    engine.start(events);

    return () => engine.stop();
  }, [layoutMode, filteredEvents]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const layout = engine.computeLayout(getDisplayEvents());
    const hitId = engine.hitTest(x, y, layout);

    if (hitId) {
      setSelectedEventId(hitId);
      engine.setSelected(hitId);
    } else {
      setSelectedEventId(null);
      engine.setSelected(null);
    }
  }, [getDisplayEvents]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const layout = engine.computeLayout(getDisplayEvents());
    const hitId = engine.hitTest(x, y, layout);
    engine.setHovered(hitId);

    canvas.style.cursor = hitId ? 'pointer' : 'default';
  }, [getDisplayEvents]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const engine = engineRef.current;
    engine.scrollBy(e.deltaY * 0.8);
  }, []);

  const handleLayoutModeChange = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
    setSelectedEventId(null);
    engineRef.current.setSelected(null);
  }, []);

  const handleEventClick = useCallback((id: string | null) => {
    setSelectedEventId(id);
    engineRef.current.setSelected(id);
    if (id) {
      engineRef.current.scrollToEvent(id);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    (canvas as any)._touchStartX = x;
    (canvas as any)._touchStartY = y;
    (canvas as any)._scrollStart = engineRef.current.scrollOffset;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const startX = (canvas as any)._touchStartX || 0;
    const startY = (canvas as any)._touchStartY || 0;
    const scrollStart = (canvas as any)._scrollStart || 0;

    const isH = layoutMode === 'horizontal';
    const delta = isH ? (startX - x) : (startY - y);
    engineRef.current.scrollBy(scrollStart + delta - engineRef.current.scrollOffset);
  }, [layoutMode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0f',
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <UIOverlay
        eventManager={eventManagerRef.current}
        layoutMode={layoutMode}
        onLayoutModeChange={handleLayoutModeChange}
        onEventClick={handleEventClick}
        selectedEventId={selectedEventId}
      />
    </div>
  );
};
