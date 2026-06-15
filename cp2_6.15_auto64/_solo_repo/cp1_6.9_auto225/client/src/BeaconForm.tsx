import { useState } from 'react';
import type { Visibility } from '../../server/beaconModel';

interface BeaconFormProps {
  onSubmit: (text: string, visibility: Visibility) => void;
  onCancel: () => void;
}

export default function BeaconForm({ onSubmit, onCancel }: BeaconFormProps) {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const maxLength = 200;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length === 0 || text.length > maxLength) return;
    onSubmit(text.trim(), visibility);
  };

  const isValid = text.trim().length > 0 && text.length <= maxLength;

  return (
    <div style={styles.formContainer}>
      <div style={styles.formHeader}>
        <h2 style={styles.formTitle}>放置信标</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>信标文字</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={maxLength}
            placeholder="写下你想留下的话..."
            style={styles.textarea}
            rows={4}
          />
          <div style={styles.counter}>
            <span style={{
              ...styles.counterText,
              color: text.length > maxLength ? '#ff6b6b' : '#8080a0'
            }}>
              {text.length} / {maxLength}
            </span>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>可见范围</label>
          <select
            value={visibility}
            onChange={e => setVisibility(e.target.value as Visibility)}
            style={styles.select}
          >
            <option value="public">公开 - 所有人可见</option>
            <option value="friends">仅好友可见</option>
            <option value="private">仅自己可见</option>
          </select>
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelBtn}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!isValid}
            style={{
              ...styles.submitBtn,
              ...(!isValid ? styles.submitBtnDisabled : {})
            }}
          >
            放置信标
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  formContainer: {
    minWidth: '320px',
    maxWidth: '420px',
    width: '100%',
    background: 'rgba(26, 26, 46, 0.9)',
    backdropFilter: 'blur(16px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '24px'
  },
  formHeader: {
    marginBottom: '20px'
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#e0e0ff',
    textAlign: 'center' as const,
    margin: 0
  },
  field: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#a0a0c0',
    marginBottom: '8px'
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#e0e0ff',
    background: 'rgba(10, 10, 26, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    resize: 'none' as const,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease-out',
    boxSizing: 'border-box' as const
  },
  counter: {
    textAlign: 'right' as const,
    marginTop: '6px'
  },
  counterText: {
    fontSize: '12px'
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#e0e0ff',
    background: 'rgba(10, 10, 26, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease-out',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a0a0c0' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: '40px',
    boxSizing: 'border-box' as const
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#a0a0c0',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    fontFamily: 'inherit'
  },
  submitBtn: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)'
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none'
  }
};
