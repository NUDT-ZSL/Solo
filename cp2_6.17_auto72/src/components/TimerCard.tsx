import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project } from '../types';
import { useAppContext } from '../App';
import { formatTime, formatDate } from '../utils/dateUtils';

interface TimerCardProps {
  project: Project;
}

type TimerState = 'idle' | 'running' | 'paused';

const TimerCard: React.FC<TimerCardProps> = ({ project }) => {
  const { selectedProjectId, setSelectedProjectId, addLog, getAverageDuration, logs } = useAppContext();
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const isSelected = selectedProjectId === project.id;

  const projectLogs = logs.filter(l => l.projectId === project.id);
  const totalMinutes = projectLogs.reduce((sum, l) => sum + l.duration, 0);
  const avgMinutes = getAverageDuration(project.id);
  const todayLogs = projectLogs.filter(l => l.date.startsWith(formatDate(new Date())));
  const todayMinutes = todayLogs.reduce((sum, l) => sum + l.duration, 0);
  const todayProgress = Math.min(100, (todayMinutes / project.targetDuration) * 100);

  const cleanupInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleStart = useCallback(() => {
    setSelectedProjectId(project.id);
    setTimerState('running');
    startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 100);
  }, [project.id, elapsedSeconds, setSelectedProjectId]);

  const handlePause = () => {
    setTimerState('paused');
    cleanupInterval();
  };

  const handleResume = () => {
    setTimerState('running');
    startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 100);
  };

  const handleStop = () => {
    cleanupInterval();
    const durationMinutes = Math.round(elapsedSeconds / 60);
    if (durationMinutes > 0) {
      addLog({
        projectId: project.id,
        date: formatDate(new Date()),
        duration: durationMinutes,
        tag: project.tags[0] || '未分类'
      });
    }
    setTimerState('idle');
    setElapsedSeconds(0);
  };

  const handleCardClick = () => {
    if (timerState === 'idle') {
      setSelectedProjectId(isSelected ? null : project.id);
    }
  };

  useEffect(() => {
    return () => cleanupInterval();
  }, []);

  const radius = 80;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const targetSeconds = project.targetDuration * 60;
  const progressPercent = targetSeconds > 0 ? Math.min(1, elapsedSeconds / targetSeconds) : 0;
  const progressOffset = circumference * (1 - progressPercent);

  return (
    <div
      className={`timer-card ${isSelected ? 'selected' : ''}`}
      style={{ backgroundColor: project.color }}
      onClick={handleCardClick}
    >
      {isSelected && <div className="selected-indicator" />}
      <div className="card-header">
        <h3 className="project-name">{project.name}</h3>
        <div className="project-tags">
          {project.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag-chip small">{tag}</span>
          ))}
        </div>
      </div>

      {timerState !== 'idle' && (
        <div className="timer-display" onClick={e => e.stopPropagation()}>
          <svg width="200" height="200" className="timer-svg">
            <defs>
              <linearGradient id={`gradient-${project.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c4dff" />
                <stop offset="100%" stopColor="#00bcd4" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth={strokeWidth}
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={`url(#gradient-${project.id})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.2s ease' }}
            />
            <text x="100" y="95" textAnchor="middle" className="timer-text">
              {formatTime(elapsedSeconds)}
            </text>
            <text x="100" y="118" textAnchor="middle" className="timer-subtext">
              目标 {project.targetDuration}分钟
            </text>
          </svg>
        </div>
      )}

      {timerState === 'idle' && (
        <div className="card-stats" onClick={e => e.stopPropagation()}>
          <div className="stat-row">
            <span className="stat-label">今日目标</span>
            <span className="stat-value">{todayMinutes}/{project.targetDuration}分钟</span>
          </div>
          <div className="mini-progress-bar">
            <div
              className="mini-progress-fill"
              style={{
                width: `${todayProgress}%`,
                background: todayProgress >= 100 ? '#4caf50' : '#7c4dff'
              }}
            />
          </div>
          <div className="stat-row">
            <span className="stat-label">累计学习</span>
            <span className="stat-value">{totalMinutes}分钟</span>
          </div>
          {avgMinutes > 0 && (
            <div className="stat-row">
              <span className="stat-label">平均时长</span>
              <span className="stat-value">{avgMinutes.toFixed(0)}分钟</span>
            </div>
          )}
        </div>
      )}

      <div className="card-actions" onClick={e => e.stopPropagation()}>
        {timerState === 'idle' && (
          <button className="btn btn-primary btn-block" onClick={handleStart}>
            开始专注
          </button>
        )}
        {timerState === 'running' && (
          <>
            <button className="btn btn-warning btn-block" onClick={handlePause}>
              暂停
            </button>
            <button className="btn btn-danger btn-block" onClick={handleStop}>
              停止记录
            </button>
          </>
        )}
        {timerState === 'paused' && (
          <>
            <button className="btn btn-primary btn-block" onClick={handleResume}>
              继续
            </button>
            <button className="btn btn-danger btn-block" onClick={handleStop}>
              停止记录
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TimerCard;
