import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import type { ExchangeRecord, Book, User } from '../types';
import { formatDate, formatDateTime } from '../utils';

interface Props {
  record: ExchangeRecord;
  book?: Book;
  otherUser?: User;
  index: number;
}

export function TimelineItem({ record, book, otherUser, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLeft = index % 2 === 0;
  const isActive = record.status === 'active';

  return (
    <div
      className="fade-in-up"
      style={{
        display: 'flex',
        justifyContent: isLeft ? 'flex-start' : 'flex-end',
        marginBottom: 32,
        paddingLeft: isLeft ? 0 : '50%',
        paddingRight: isLeft ? '50%' : 0,
        position: 'relative',
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 2,
          background: '#e7e5e4',
          transform: 'translateX(-50%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 16,
          transform: 'translateX(-50%)',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: isActive ? '#dbeafe' : '#dcfce7',
          color: isActive ? '#3b82f6' : '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <Calendar size={18} />
      </div>

      <div
        style={{
          width: 'calc(100% - 48px)',
          marginLeft: isLeft ? 0 : 48,
          marginRight: isLeft ? 48 : 0,
        }}
      >
        <div
          className="card"
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: 16,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            {book && (
              <img
                src={book.coverUrl}
                alt={book.title}
                style={{
                  width: 56,
                  height: 76,
                  borderRadius: 6,
                  objectFit: 'cover',
                  background: '#f5f5f4',
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                {otherUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={otherUser.avatar}
                      alt={otherUser.nickname}
                      style={{ width: 24, height: 24, borderRadius: '50%' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{otherUser.nickname}</span>
                  </div>
                )}
                <span className={`status-tag ${isActive ? 'active' : 'completed'}`}>
                  {isActive ? '进行中' : '已归还'}
                </span>
              </div>
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: '#292524',
                }}
              >
                {book?.title || '未知图书'}
              </h4>
              <p style={{ fontSize: 12, color: '#78716c' }}>
                借出日期：{formatDate(record.lentAt)}
              </p>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#d97706',
                }}
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{expanded ? '收起流转链' : '查看流转链'}</span>
              </div>
            </div>
          </div>

          {expanded && record.chain && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid #e7e5e4',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#292524' }}>
                流转历史
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {record.chain.map((node, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 12,
                      color: '#57534e',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#d97706',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1 }}>
                      {node.note}
                      <span style={{ color: '#a8a29e', marginLeft: 8 }}>
                        {formatDateTime(node.timestamp)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
