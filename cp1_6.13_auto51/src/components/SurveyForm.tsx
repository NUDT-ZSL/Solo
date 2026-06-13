import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Question } from '../api/surveyApi';

interface SurveyFormProps {
  onSubmit: (title: string, questions: Question[]) => void;
  loading?: boolean;
}

const SurveyForm: React.FC<SurveyFormProps> = ({ onSubmit, loading }) => {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addQuestion = (type: 'single' | 'multiple' | 'text') => {
    const newQuestion: Question = {
      id: uuidv4(),
      type,
      text: '',
      options: type === 'single' || type === 'multiple' ? ['', ''] : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId && q.options 
        ? { ...q, options: [...q.options, ''] }
        : q
    ));
  };

  const updateOption = (questionId: string, optIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[optIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options && q.options.length > 2) {
        const newOptions = q.options.filter((_, i) => i !== optIndex);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    const newQuestions = [...questions];
    const [draggedItem] = newQuestions.splice(dragIndex, 1);
    newQuestions.splice(index, 0, draggedItem);
    setQuestions(newQuestions);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('请输入问卷标题');
      return;
    }
    
    const validQuestions = questions.filter(q => q.text.trim());
    if (validQuestions.length === 0) {
      alert('请至少添加一个问题');
      return;
    }

    const hasInvalidOptions = validQuestions.some(q => 
      (q.type === 'single' || q.type === 'multiple') && 
      (!q.options || q.options.filter(o => o.trim()).length < 2)
    );

    if (hasInvalidOptions) {
      alert('选择题至少需要2个有效选项');
      return;
    }

    onSubmit(title.trim(), validQuestions);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'single': return '单选题';
      case 'multiple': return '多选题';
      case 'text': return '文本题';
      default: return type;
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#1e293b' }}>
          问卷标题
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入问卷标题..."
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 16,
            transition: 'all 0.2s ease',
            outline: 'none',
            background: '#ffffff',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0';
          }}
        />
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => addQuestion('single')}
          style={buttonStyle}
        >
          + 添加单选题
        </button>
        <button
          type="button"
          onClick={() => addQuestion('multiple')}
          style={buttonStyle}
        >
          + 添加多选题
        </button>
        <button
          type="button"
          onClick={() => addQuestion('text')}
          style={buttonStyle}
        >
          + 添加文本题
        </button>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {questions.map((question, index) => (
          <div
            key={question.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              ...cardStyle,
              opacity: dragIndex === index ? 0.5 : 1,
              cursor: 'move',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: 'white',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  {index + 1}
                </span>
                <span style={{ 
                  color: '#64748b',
                  fontSize: 14,
                  background: '#f1f5f9',
                  padding: '4px 12px',
                  borderRadius: 20,
                }}>
                  {getTypeLabel(question.type)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeQuestion(question.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 20,
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>

            <input
              type="text"
              value={question.text}
              onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
              placeholder="请输入问题内容..."
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '2px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 15,
                marginBottom: 16,
                transition: 'all 0.2s ease',
                outline: 'none',
                background: '#ffffff',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
              }}
            />

            {(question.type === 'single' || question.type === 'multiple') && question.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: question.type === 'single' ? '50%' : 4,
                      border: '2px solid #cbd5e1',
                      flexShrink: 0,
                    }} />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                      placeholder={`选项 ${optIndex + 1}`}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '2px solid #e2e8f0',
                        borderRadius: 6,
                        fontSize: 14,
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        background: '#ffffff',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                      }}
                    />
                    {question.options && question.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(question.id, optIndex)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: 18,
                          padding: 4,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(question.id)}
                  style={{
                    background: 'none',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  + 添加选项
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {questions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          border: '2px dashed #cbd5e1',
          borderRadius: 12,
          color: '#94a3b8',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16 }}>点击上方按钮添加问题</div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          ...submitButtonStyle,
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '创建中...' : '创建问卷'}
      </button>
    </form>
  );
};

const buttonStyle = {
  padding: '10px 20px',
  border: '2px solid #e2e8f0',
  background: '#ffffff',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  color: '#475569',
  transition: 'all 0.2s ease',
} as React.CSSProperties;

const cardStyle = {
  background: '#ffffff',
  padding: 24,
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease',
} as React.CSSProperties;

const submitButtonStyle = {
  width: '100%',
  padding: '14px 24px',
  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
} as React.CSSProperties;

export default SurveyForm;
