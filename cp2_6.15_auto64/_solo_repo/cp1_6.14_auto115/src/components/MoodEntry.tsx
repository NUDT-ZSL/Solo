import { useState } from 'react';
import { moodConfigs, moodList } from '../types';

interface MoodEntryProps {
  onSubmit: (data: { mood: string; note: string; tags: string[] }) => void;
}

function MoodEntry({ onSubmit }: MoodEntryProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && tags.length < 5) {
      e.preventDefault();
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood) return;

    onSubmit({
      mood: selectedMood,
      note,
      tags
    });

    setSelectedMood(null);
    setNote('');
    setTags([]);
    setTagInput('');
  };

  return (
    <div style={styles.container} className="mood-entry-container">
      <h2 style={styles.title}>今天的心情怎么样？</h2>
      
      <div className="mood-emoji-container">
        {moodList.map(mood => (
          <button
            key={mood}
            onClick={() => handleMoodSelect(mood)}
            style={{
              ...styles.emojiButton,
              backgroundColor: selectedMood === mood ? moodConfigs[mood].color : '#f0f0f0'
            }}
            className="mood-emoji-button"
            aria-label={moodConfigs[mood].label}
          >
            <span style={styles.emoji} className="mood-emoji-text">{moodConfigs[mood].emoji}</span>
          </button>
        ))}
      </div>

      {selectedMood && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>记录一下此刻的心情</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="今天发生了什么？"
              style={styles.textarea}
              className="mood-textarea"
              rows={3}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              标签（最多5个）
              <span style={styles.tagCount}>{tags.length}/5</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="输入标签后回车添加"
              style={styles.input}
              className="mood-input"
              maxLength={20}
            />
            {tags.length > 0 && (
              <div style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <span key={index} style={styles.tag}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      style={styles.tagRemove}
                      className="mood-tag-remove"
                      aria-label={`删除标签${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button type="submit" style={styles.submitButton} className="mood-submit-button">
            保存记录
          </button>
        </form>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'box-shadow 0.2s ease-out'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: '20px'
  },
  emojiContainer: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '8px',
    scrollbarWidth: 'none'
  },
  emojiButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0
  },
  emoji: {
    fontSize: '28px',
    lineHeight: 1
  },
  form: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#4a5568',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tagCount: {
    fontSize: '12px',
    color: '#a0aec0'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px'
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px 5px 14px',
    backgroundColor: '#e0e0e0',
    borderRadius: '14px',
    fontSize: '13px',
    color: '#4a5568',
    minHeight: '28px'
  },
  tagRemove: {
    background: '#d1d5db',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 700,
    color: '#4a5568',
    width: '24px',
    height: '24px',
    padding: 0,
    lineHeight: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
    boxSizing: 'border-box'
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#6c5ce7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  }
};

export default MoodEntry;
