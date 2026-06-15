import React from 'react';
import { Task, CATEGORY_LABELS, CATEGORY_COLORS, daysBetween, formatDate } from '../types';

interface TooltipProps {
  task: Task;
  mouseX: number;
  mouseY: number;
}

export default function Tooltip({ task, mouseX, mouseY }: TooltipProps) {
  const remaining = Math.max(0, Math.ceil(
    (task.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));
  const duration = Math.ceil(daysBetween(task.startDate, task.endDate));

  const tipW = 240;
  const tipH = 130;
  const offset = 12;

  let left = mouseX + offset;
  let top = mouseY + offset;
  if (left + tipW > window.innerWidth - 10) left = mouseX - tipW - offset;
  if (top + tipH > window.innerHeight - 10) top = mouseY - tipH - offset;
  if (left < 10) left = 10;
  if (top < 10) top = 10;

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        width: tipW,
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: '12px 14px',
        pointerEvents: 'none',
        zIndex: 1000,
        fontSize: 12,
        color: '#2c3e50',
        lineHeight: 1.7,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{task.name}</div>
      <div>
        <span style={{ color: '#888' }}>日期：</span>
        {formatDate(task.startDate)} → {formatDate(task.endDate)}
      </div>
      <div>
        <span style={{ color: '#888' }}>工期：</span>
        {duration} 天
      </div>
      <div>
        <span style={{ color: '#888' }}>类别：</span>
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: 4,
          background: CATEGORY_COLORS[task.category],
          marginRight: 4,
          verticalAlign: 'middle',
        }} />
        {CATEGORY_LABELS[task.category]}
      </div>
      <div>
        <span style={{ color: '#888' }}>依赖：</span>
        {task.dependencies.length > 0 ? `${task.dependencies.length} 个前置任务` : '无'}
      </div>
      <div>
        <span style={{ color: '#888' }}>剩余：</span>
        <span style={{ color: remaining <= 3 ? '#e74c3c' : '#2c3e50', fontWeight: 600 }}>
          {remaining} 天
        </span>
      </div>
    </div>
  );
}
