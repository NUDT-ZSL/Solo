/*
 * StagePlayer.tsx — 舞台播放器组件
 *
 * 【数据流向】
 *   输入 (props):
 *     ← sortedEvents[]       来自 App.tsx (已按 startTime 排序的事件数组)
 *     ← selectedEvent        来自 App.tsx (当前选中的事件对象，用于手动预览)
 *     ← playingEventId       来自 App.tsx state (正在播放的事件ID)
 *     ← isPlaying            来自 App.tsx state (是否处于自动播放中)
 *
 *   输出 (callbacks):
 *     → onPlayToggle()       → App.tsx 切换播放/暂停 — 触发自动播放时序的启动与停止
 *     → onProgressUpdate()   → App.tsx setPlayingEventId() — 自动播放切换到下一事件时回调
 *
 * 【调用关系】
 *   被调用方: App.tsx (父组件，负责统一的状态管理)
 *   内部依赖: eventsData (类型定义)
 *
 * 【关键功能】
 *   - 三种事件类型的模拟画面 (页面卡片 / 语音波形 / 互动问题)
 *   - 切换动画: opacity + transform scale(0.98→1) + 背景色 #E8F0FE → 白，总 600ms
 *   - 自动播放: 按 sortedEvents 顺序依次播放，每段 duration 秒后自动进入下一段
 *   - 播放中: 金色边框 + 呼吸发光动画 (样式在 styles.css .event-block.playing)
 *
 * 【性能优化】
 *   - React.memo 浅比较 props
 *   - 自动播放计时器用 useRef + cleanup 避免重复触发
 *   - 动画切换通过 key + CSS，完全交由浏览器 compositor 线程
 */
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { TimelineEvent, EVENT_TYPE_COLORS } from './eventsData';

interface StagePlayerProps {
  sortedEvents: TimelineEvent[];
  selectedEvent: TimelineEvent | null;
  playingEventId: string | null;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onProgressUpdate: (eventId: string | null) => void;
}

const StagePlayerInner: React.FC<StagePlayerProps> = ({
  sortedEvents,
  selectedEvent,
  playingEventId,
  isPlaying,
  onPlayToggle,
  onProgressUpdate
}) => {
  /* 展示用事件：播放中优先显示正在播放的，否则显示选中的 */
  const displayEvent = playingEventId
    ? sortedEvents.find(ev => ev.id === playingEventId) || null
    : selectedEvent;

  /* 动画 key：每次事件切换强制重挂载，触发 CSS 动画 */
  const animKey = displayEvent?.id || 'empty';

  /* ---------- 自动播放计时器 ---------- */
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isPlaying || !playingEventId) return;

    const current = sortedEvents.find(ev => ev.id === playingEventId);
    if (!current) return;

    timerRef.current = window.setTimeout(() => {
      const idx = sortedEvents.findIndex(ev => ev.id === playingEventId);
      const next = sortedEvents[idx + 1];
      if (next) {
        onProgressUpdate(next.id);
      } else {
        /* 播放完毕 */
        onProgressUpdate(null);
      }
    }, current.duration * 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, playingEventId, sortedEvents, onProgressUpdate]);

  /* ---------- 渲染器 ---------- */
  const renderContent = useCallback((ev: TimelineEvent) => {
    if (ev.type === 'page') {
      return (
        <div className="page-card">
          <div className="page-card-label">PAGE SLIDE</div>
          <div className="page-card-title">{ev.content?.chapter || ev.name}</div>
        </div>
      );
    }
    if (ev.type === 'voice') {
      const bars = Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className="voice-wave-bar"
          style={{ animationDelay: `${(i % 8) * 0.08}s` }}
        />
      ));
      return (
        <div className="voice-content">
          <div className="voice-wave">{bars}</div>
          <p className="voice-text">
            {ev.content?.voiceText || `${ev.name} — 正在播放自动语音解说...`}
          </p>
        </div>
      );
    }
    if (ev.type === 'quiz') {
      const options = ev.content?.options || ['选项 A', '选项 B', '选项 C', '选项 D'];
      return (
        <div className="quiz-content">
          <h3 className="quiz-question">
            {ev.content?.question || ev.name}
          </h3>
          <div className="quiz-options">
            {options.map((opt, i) => (
              <div key={i} className="quiz-option">{opt}</div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }, []);

  /* ---------- 空状态 ---------- */
  const renderEmpty = () => (
    <div className="empty-stage">
      <div className="empty-stage-icon">🎬</div>
      <div className="empty-stage-text">点击时间轴上的事件块预览内容，或点击播放按钮自动播放</div>
    </div>
  );

  return (
    <div className="stage-area">
      {/* stage-content 负责背景色闪烁动画 */}
      <div className="stage-content" key={`bg-${animKey}`}>
        {/* stage-content-inner 负责 opacity + scale 动画 */}
        <div className="stage-content-inner" key={`inner-${animKey}`}>
          {displayEvent ? renderContent(displayEvent) : renderEmpty()}
        </div>
      </div>

      {/* 播放/暂停按钮 */}
      <button
        className="play-button"
        onClick={onPlayToggle}
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? (
          <div className="pause-icon">
            <span /><span />
          </div>
        ) : (
          <div className="play-icon" />
        )}
      </button>
    </div>
  );
};

const StagePlayer = memo(StagePlayerInner);
export default StagePlayer;
