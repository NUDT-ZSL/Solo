import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PollType } from '../types';

const CreatePoll: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PollType>('single');
  const [options, setOptions] = useState(['', '']);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const typeOptions: { value: PollType; label: string; icon: string }[] = [
    { value: 'single', label: '单选', icon: '◉' },
    { value: 'multiple', label: '多选', icon: '☑' },
    { value: 'rating', label: '评分', icon: '★' },
    { value: 'ranking', label: '排序', icon: '↕' },
  ];

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 20) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请输入投票标题');
      return;
    }

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      setError('请至少填写2个有效选项');
      return;
    }

    let deadline: string | null = null;
    if (deadlineDate && deadlineTime) {
      deadline = `${deadlineDate}T${deadlineTime}`;
    } else if (deadlineDate) {
      deadline = `${deadlineDate}T23:59`;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/polls', {
        title: title.trim(),
        type,
        options: validOptions,
        deadline,
      });
      navigate(`/poll/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建投票失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>创建投票</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.section}>
          <label style={styles.label}>投票标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入投票标题"
            style={styles.titleInput}
            maxLength={100}
          />
        </div>

        <div style={styles.section}>
          <label style={styles.label}>投票类型</label>
          <div style={styles.typeButtons}>
            {typeOptions.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={(e) => {
                  createRipple(e);
                  setType(t.value);
                }}
                style={{
                  ...styles.typeButton,
                  backgroundColor: type === t.value ? '#6366f1' : '#333344',
                  color: type === t.value ? '#ffffff' : '#e2e8f0',
                }}
                className="ripple-button"
              >
                <span style={styles.typeIcon}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>
            投票选项
            <span style={styles.hint}>（至少2项，最多20项）</span>
          </label>
          <div style={styles.optionsList}>
            {options.map((option, index) => (
              <div key={index} style={styles.optionRow}>
                <span style={styles.optionIndex}>{index + 1}</span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`选项 ${index + 1}`}
                  style={styles.optionInput}
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  style={{
                    ...styles.removeBtn,
                    opacity: options.length > 2 ? 1 : 0.3,
                    cursor: options.length > 2 ? 'pointer' : 'not-allowed',
                  }}
                  disabled={options.length <= 2}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {options.length < 20 && (
            <button
              type="button"
              onClick={addOption}
              style={styles.addOptionBtn}
              className="ripple-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加选项
            </button>
          )}
        </div>

        <div style={styles.section}>
          <label style={styles.label}>截止时间</label>
          <div style={styles.deadlineRow}>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              style={styles.dateInput}
            />
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              style={styles.timeInput}
            />
            {(deadlineDate || deadlineTime) && (
              <button
                type="button"
                onClick={() => {
                  setDeadlineDate('');
                  setDeadlineTime('');
                }}
                style={styles.clearDeadlineBtn}
              >
                清除
              </button>
            )}
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            ...styles.submitBtn,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
          className="ripple-button"
          onClick={createRipple}
        >
          {submitting ? '创建中...' : '创建投票'}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    animation: 'fadeInUp 0.4s ease-out',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: '24px',
  },
  form: {
    backgroundColor: '#1e1e2e',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  section: {
    marginBottom: '28px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#e2e8f0',
    marginBottom: '12px',
  },
  hint: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 400,
    marginLeft: '8px',
  },
  titleInput: {
    width: '100%',
    height: '48px',
    padding: '0 16px',
    borderRadius: '8px',
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: 'none',
    fontSize: '15px',
    transition: 'box-shadow 0.2s ease',
  },
  typeButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  typeButton: {
    width: '120px',
    height: '48px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  typeIcon: {
    fontSize: '16px',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '12px',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  optionIndex: {
    width: '24px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  optionInput: {
    flex: 1,
    height: '40px',
    padding: '0 14px',
    borderRadius: '8px',
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: 'none',
    fontSize: '14px',
  },
  removeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
  addOptionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#6366f1',
    border: '1px dashed #6366f1',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  deadlineRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateInput: {
    height: '40px',
    padding: '0 14px',
    borderRadius: '8px',
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: 'none',
    fontSize: '14px',
  },
  timeInput: {
    height: '40px',
    padding: '0 14px',
    borderRadius: '8px',
    backgroundColor: '#2a2a3e',
    color: '#e0e0e0',
    border: 'none',
    fontSize: '14px',
  },
  clearDeadlineBtn: {
    height: '40px',
    padding: '0 16px',
    borderRadius: '8px',
    backgroundColor: '#2a2a3e',
    color: '#94a3b8',
    border: 'none',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#f8717120',
    color: '#f87171',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  submitBtn: {
    width: '200px',
    height: '48px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    borderRadius: '24px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 600,
    display: 'block',
    margin: '0 auto',
    transition: 'background-color 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
};

export default CreatePoll;
