import { useState, useMemo } from 'react';
import type { LogEntry, LogLevel } from './types';

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: '#ef4444',
  warn: '#f59e0b',
  info: '#22c55e'
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  error: '错误',
  warn: '警告',
  info: '信息'
};

interface LogCardProps {
  log: LogEntry;
  searchQuery: string;
  index: number;
}

function highlightText(text: string, query: string): JSX.Element {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="highlight">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function LogCard({ log, searchQuery, index }: LogCardProps) {
  const [expanded, setExpanded] = useState(false);

  const color = LEVEL_COLORS[log.level];

  const requestJson = useMemo(
    () => JSON.stringify(log.requestParams, null, 2),
    [log.requestParams]
  );

  const responseJson = useMemo(
    () => JSON.stringify(log.responseData, null, 2),
    [log.responseData]
  );

  return (
    <div
      style={{
        display: 'flex',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        marginBottom: '12px',
        overflow: 'hidden',
        animation: `slideIn 300ms ease-out both`,
        animationDelay: `${Math.min(index * 20, 300)}ms`
      }}
    >
      <div
        style={{
          width: '4px',
          flexShrink: 0,
          backgroundColor: color
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            gap: '12px'
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  fontFamily: 'monospace'
                }}
              >
                {formatDate(log.timestamp)} {formatTime(log.timestamp)}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  padding: '2px 8px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px'
                }}
              >
                {highlightText(log.operator, searchQuery)}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: color,
                  padding: '2px 8px',
                  backgroundColor: `${color}15`,
                  borderRadius: '4px',
                  fontWeight: 500
                }}
              >
                {LEVEL_LABELS[log.level]}
              </span>
            </div>
            <div
              style={{
                fontSize: '16px',
                color: '#1f2937',
                fontWeight: 500,
                lineHeight: 1.5
              }}
            >
              {highlightText(log.action, searchQuery)}
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease'
              }}
            >
              <path
                d="M2 1L5 4L2 7"
                stroke={expanded ? '#3b82f6' : '#9ca3af'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {expanded && (
          <div
            style={{
              backgroundColor: '#f3f4f6',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              borderTop: '1px solid #e5e7eb'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                请求参数
              </div>
              <pre
                style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#1f2937',
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  overflowX: 'auto',
                  margin: 0,
                  lineHeight: 1.6
                }}
              >
                {requestJson}
              </pre>
            </div>
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                响应数据
              </div>
              <pre
                style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#1f2937',
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  overflowX: 'auto',
                  margin: 0,
                  lineHeight: 1.6
                }}
              >
                {responseJson}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
