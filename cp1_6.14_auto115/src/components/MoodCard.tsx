import { moodConfigs } from '../types';
import type { Mood } from '../types';

interface MoodCardProps {
  mood: Mood;
  onDelete: (id: string) => void;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  if (weeks < 5) return `${weeks}周前`;
  if (months < 12) return `${months}个月前`;
  
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function MoodCard({ mood, onDelete }: MoodCardProps) {
  const config = moodConfigs[mood.mood];

  return (
    <div style={styles.card} className="mood-card">
      <div style={styles.content}>
        <div style={{
          ...styles.emojiWrapper,
          backgroundColor: config.color
        }}>
          <span style={styles.emoji}>{config.emoji}</span>
        </div>
        
        <div style={styles.noteContainer}>
          <p style={styles.note}>{mood.note || '没有记录文字'}</p>
          <div style={styles.tags}>
            {mood.tags.map((tag, index) => (
              <span key={index} style={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => onDelete(mood.id)}
          style={styles.deleteButton}
          className="mood-delete-button"
          aria-label="删除记录"
        >
          ×
        </button>
      </div>
      
      <div style={styles.footer}>
        <span style={styles.time}>{getRelativeTime(mood.createdAt)}</span>
        <span style={styles.moodLabel}>{config.label}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: '100%',
    minHeight: '100px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'box-shadow 0.2s ease-out',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  content: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  emojiWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  emoji: {
    fontSize: '20px',
    lineHeight: 1
  },
  noteContainer: {
    flex: 1,
    minWidth: 0
  },
  note: {
    fontSize: '14px',
    color: '#333333',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px'
  },
  tag: {
    padding: '2px 10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#4a5568',
    height: '24px',
    display: 'inline-flex',
    alignItems: 'center'
  },
  deleteButton: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease-out'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #f0f0f0'
  },
  time: {
    fontSize: '12px',
    color: '#a0aec0'
  },
  moodLabel: {
    fontSize: '12px',
    color: '#718096'
  }
};

export default MoodCard;
