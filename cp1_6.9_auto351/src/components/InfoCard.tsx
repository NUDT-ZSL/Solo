import React from 'react';
import type { Trail } from '../types';

interface InfoCardProps {
  trail: Trail;
  position: { x: number; y: number };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}秒`;
  return `${mins}分${secs}秒`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) {
      const mins = Math.floor(diff / (60 * 1000));
      return mins <= 0 ? '刚刚' : `${mins}分钟前`;
    }
    return `${hours}小时前`;
  }
  if (diff < 7 * oneDay) {
    const days = Math.floor(diff / oneDay);
    return `${days}天前`;
  }
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function InfoCard({ trail, position }: InfoCardProps) {
  const cardWidth = 320;
  const cardHeight = 180;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = position.x + 20;
  let top = position.y - cardHeight / 2;

  if (left + cardWidth > viewportWidth - 20) {
    left = position.x - cardWidth - 20;
  }
  if (left < 20) left = 20;
  if (top < 80) top = 80;
  if (top + cardHeight > viewportHeight - 120) {
    top = viewportHeight - 120 - cardHeight;
  }

  return (
    <div
      className="info-card"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      <div className="info-card-title">{trail.title}</div>
      <div className="info-card-url">{trail.url}</div>
      <div className="info-card-meta">
        <div className="info-card-meta-row">
          <span className="info-card-meta-label">访问时间</span>
          <span>{formatDate(trail.visitedAt)}</span>
        </div>
        <div className="info-card-meta-row">
          <span className="info-card-meta-label">停留时长</span>
          <span>{formatDuration(trail.duration)}</span>
        </div>
        <div className="info-card-meta-row">
          <span className="info-card-meta-label">滚动深度</span>
          <span>{trail.scrollDepth}%</span>
        </div>
        <div className="info-card-meta-row">
          <span className="info-card-meta-label">分类</span>
          <span>{trail.category}</span>
        </div>
      </div>
    </div>
  );
}
