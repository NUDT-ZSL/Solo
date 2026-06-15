import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  History,
  ListChecks,
  FileQuestion,
} from 'lucide-react';
import type { Question, QuizRecord, ToastType } from '../types';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../services/questionService';
import { getQuizRecords } from '../services/studentService';

interface Props {
  showToast: (type: ToastType, message: string) => string;
}

type QuestionForm = Omit<Question, 'id' | 'createdAt'>;

const emptyForm: QuestionForm = {
  description: '',
  options: { A: '', B: '', C: '', D: '' },
  correctAnswer: 'A',
  explanation: '',
};

function truncate(text: string, n: number) {
  if (!text) return '';
  return text.length > n ? text.slice(0, n) + '...' : text;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s}秒`;
}

const optionLabels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

export function TeacherPanel({ showToast }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [records, setRecords] = useState<QuizRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'history'>('questions');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<QuestionForm>(emptyForm);

  const loadAll = async () => {
    try {
      const [qs, rs] = await Promise.all([getQuestions(), getQuizRecords()]);
      setQuestions(qs);
      setRecords(rs);
    } catch (err) {
      showToast('error', (err as Error).message);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async () => {
    if (!form.description.trim()) {
      showToast('error', '请输入题目描述');
      return;
    }
    for (const k of optionLabels) {
      if (!form.options[k].trim()) {
        showToast('error', `请填写选项 ${k}`);
        return;
      }
    }
    if (!form.explanation.trim()) {
      showToast('error', '请填写答案解析');
      return;
    }
    setLoading(true);
    try {
      await createQuestion(form);
      setForm(emptyForm);
      showToast('success', '题目创建成功');
      await loadAll();
    } catch (err) {
      showToast('error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id);
      showToast('success', '题目已删除');
      await loadAll();
    } catch (err) {
      showToast('error', (err as Error).message);
    }
  };

  const openEdit = (q: Question) => {
    setEditingId(q.id);
    setEditForm({
      description: q.description,
      options: { ...q.options },
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    });
  };

  const closeEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateQuestion(editingId, editForm);
      showToast('success', '题目已更新');
      setEditingId(null);
      await loadAll();
    } catch (err) {
      showToast('error', (err as Error).message);
    }
  };

  return (
    <div style={{ flex: 1, padding: '28px 32px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16, color: '#fff' }}>
          教师管理面板
        </h1>
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #2a3749' }}>
          <button
            onClick={() => setActiveTab('questions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === 'questions' ? '#f97316' : '#9ca3af',
              borderBottom:
                activeTab === 'questions' ? '2px solid #f97316' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <FileQuestion size={16} />
            题库管理
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === 'history' ? '#f97316' : '#9ca3af',
              borderBottom:
                activeTab === 'history' ? '2px solid #f97316' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <History size={16} />
            答题历史
          </button>
        </div>
      </div>

      {activeTab === 'questions' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              marginBottom: 32,
              '@media (max-width: 1023px)': { gridTemplateColumns: '1fr' },
            }}
          >
            <div
              style={{
                padding: 24,
                backgroundColor: '#2d3b4e',
                borderRadius: 14,
                border: '1px solid #3b4b62',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18, color: '#fff' }}>
                创建新题目
              </h2>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>题目描述（支持 Markdown，例如 ![](url)）</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="请输入题目内容..."
                  rows={5}
                  style={textareaStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {optionLabels.map((k) => (
                  <div key={k}>
                    <label style={labelStyle}>选项 {k}</label>
                    <input
                      value={form.options[k]}
                      onChange={(e) =>
                        setForm({ ...form, options: { ...form.options, [k]: e.target.value } })
                      }
                      placeholder={`选项 ${k}`}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>正确答案</label>
                  <select
                    value={form.correctAnswer}
                    onChange={(e) =>
                      setForm({ ...form, correctAnswer: e.target.value as 'A' | 'B' | 'C' | 'D' })
                    }
                    style={selectStyle}
                  >
                    {optionLabels.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>答案解析</label>
                <textarea
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  placeholder="请输入答案解析..."
                  rows={3}
                  style={textareaStyle}
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#f97316',
                  color: '#fff',
                  fontWeight: 600,
                  borderRadius: 10,
                  fontSize: 14,
                  transition: 'background-color 0.2s',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <Plus size={16} />
                {loading ? '创建中...' : '创建题目'}
              </button>
            </div>

            <div
              style={{
                padding: 24,
                backgroundColor: '#2d3b4e',
                borderRadius: 14,
                border: '1px solid #3b4b62',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18, color: '#fff' }}>
                实时预览
              </h2>
              <div
                style={{
                  padding: 18,
                  backgroundColor: '#1a2332',
                  borderRadius: 10,
                  border: '1px solid #3b4b62',
                  minHeight: 300,
                }}
              >
                <div style={{ fontSize: 15, color: '#e5e7eb', lineHeight: 1.6, marginBottom: 14 }}>
                  <ReactMarkdown
                    components={{
                      img: (props) => (
                        <img
                          {...props}
                          alt={props.alt || ''}
                          style={{ maxWidth: 300, borderRadius: 8, margin: '8px 0' }}
                        />
                      ),
                    }}
                  >
                    {form.description || '*题目描述预览*'}
                  </ReactMarkdown>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {optionLabels.map((k) => (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        backgroundColor:
                          form.correctAnswer === k
                            ? 'rgba(249,115,22,0.15)'
                            : 'rgba(255,255,255,0.04)',
                        borderRadius: 8,
                        border:
                          form.correctAnswer === k
                            ? '1px solid #f97316'
                            : '1px solid #3b4b62',
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor:
                            form.correctAnswer === k ? '#f97316' : '#3b4b62',
                          color: '#fff',
                          fontWeight: 600,
                          borderRadius: '50%',
                          fontSize: 12,
                        }}
                      >
                        {k}
                      </span>
                      <span style={{ color: '#d1d5db', fontSize: 14 }}>
                        {form.options[k] || `选项 ${k}`}
                      </span>
                    </div>
                  ))}
                </div>
                {form.explanation && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 10,
                      backgroundColor: 'rgba(249,115,22,0.08)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: '#fbbf24',
                    }}
                  >
                    <strong>解析：</strong>
                    {form.explanation}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#fff' }}>
              题目列表（共 {questions.length} 题）
            </h2>
            {questions.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: '#9ca3af',
                  backgroundColor: '#2d3b4e',
                  borderRadius: 14,
                }}
              >
                暂无题目，请在上方创建
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 16,
                }}
              >
                {questions.map((q) => (
                  <div
                    key={q.id}
                    style={{
                      padding: 18,
                      backgroundColor: '#2d3b4e',
                      borderRadius: 12,
                      border: '1px solid #3b4b62',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform =
                        'translateY(-4px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        '0 12px 30px rgba(0,0,0,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.5 }}>
                        {truncate(q.description, 30)}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => openEdit(q)}
                          style={iconBtnStyle}
                          title="编辑"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          style={{ ...iconBtnStyle, color: '#ef4444' }}
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {optionLabels.map((k) => (
                        <div
                          key={k}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 8px',
                            backgroundColor:
                              q.correctAnswer === k
                                ? 'rgba(249,115,22,0.15)'
                                : 'rgba(255,255,255,0.03)',
                            borderRadius: 6,
                            fontSize: 12,
                            color: '#d1d5db',
                          }}
                        >
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: q.correctAnswer === k ? '#f97316' : '#3b4b62',
                              color: '#fff',
                              fontWeight: 600,
                              borderRadius: '50%',
                              fontSize: 10,
                            }}
                          >
                            {k}
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {truncate(q.options[k], 14)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: '#9ca3af',
                        paddingTop: 8,
                        borderTop: '1px solid #3b4b62',
                      }}
                    >
                      <ListChecks size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      正确答案：<strong style={{ color: '#f97316' }}>{q.correctAnswer}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div
          style={{
            backgroundColor: '#2d3b4e',
            borderRadius: 14,
            border: '1px solid #3b4b62',
            overflow: 'hidden',
          }}
        >
          {records.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              暂无答题记录
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a2332' }}>
                  <th style={thStyle}>学生姓名</th>
                  <th style={thStyle}>答题时间</th>
                  <th style={thStyle}>得分</th>
                  <th style={thStyle}>用时</th>
                  <th style={thStyle}>详情</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => (
                  <>
                    <tr
                      key={r.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        setExpandedRecordId(expandedRecordId === r.id ? null : r.id)
                      }
                    >
                      <td style={tdStyle}>{r.studentName}</td>
                      <td style={tdStyle}>{formatTime(r.submittedAt)}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: '2px 10px',
                            backgroundColor: 'rgba(249,115,22,0.15)',
                            color: '#f97316',
                            fontWeight: 600,
                            borderRadius: 999,
                            fontSize: 13,
                          }}
                        >
                          {r.score}/{r.totalQuestions}
                        </span>
                      </td>
                      <td style={tdStyle}>{formatDuration(r.duration)}</td>
                      <td style={tdStyle}>
                        {expandedRecordId === r.id ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </td>
                    </tr>
                    {expandedRecordId === r.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0, backgroundColor: '#1a2332' }}>
                          <div
                            style={{
                              padding: 16,
                              borderTop: '1px solid #3b4b62',
                              animation: 'fadeInUp 0.2s ease-out',
                            }}
                          >
                            {r.answers.map((a, i) => (
                              <div
                                key={a.questionId}
                                style={{
                                  padding: 12,
                                  marginBottom: i < r.answers.length - 1 ? 8 : 0,
                                  backgroundColor: '#2d3b4e',
                                  borderRadius: 8,
                                  fontSize: 13,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    marginBottom: 6,
                                  }}
                                >
                                  <span style={{ color: '#e5e7eb', flex: 1 }}>
                                    第{i + 1}题. {truncate(a.questionDescription, 40)}
                                  </span>
                                  <span
                                    style={{
                                      padding: '2px 8px',
                                      backgroundColor: a.isCorrect
                                        ? 'rgba(34,197,94,0.15)'
                                        : 'rgba(239,68,68,0.15)',
                                      color: a.isCorrect ? '#22c55e' : '#ef4444',
                                      borderRadius: 999,
                                      fontWeight: 600,
                                      fontSize: 12,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {a.isCorrect ? '✓ 正确' : '✗ 错误'}
                                  </span>
                                </div>
                                <div style={{ color: '#9ca3af', fontSize: 12 }}>
                                  选择答案：
                                  <strong style={{ color: a.isCorrect ? '#22c55e' : '#ef4444' }}>
                                    {a.selectedAnswer ?? '未作答'}
                                  </strong>
                                  {' · '}
                                  正确答案：
                                  <strong style={{ color: '#22c55e' }}>{a.correctAnswer}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editingId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={closeEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              backgroundColor: '#2d3b4e',
              borderRadius: 14,
              border: '1px solid #3b4b62',
              animation: 'fadeInUp 0.2s ease-out',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>编辑题目</h3>
              <button onClick={closeEdit} style={iconBtnStyle}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>题目描述</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={5}
                style={textareaStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              {optionLabels.map((k) => (
                <div key={k}>
                  <label style={labelStyle}>选项 {k}</label>
                  <input
                    value={editForm.options[k]}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        options: { ...editForm.options, [k]: e.target.value },
                      })
                    }
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>正确答案</label>
              <select
                value={editForm.correctAnswer}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    correctAnswer: e.target.value as 'A' | 'B' | 'C' | 'D',
                  })
                }
                style={selectStyle}
              >
                {optionLabels.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>答案解析</label>
              <textarea
                value={editForm.explanation}
                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                rows={3}
                style={textareaStyle}
              />
            </div>

            <button
              onClick={handleSaveEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#f97316',
                color: '#fff',
                fontWeight: 600,
                borderRadius: 10,
                fontSize: 14,
              }}
            >
              <Save size={16} />
              保存修改
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 6,
  color: '#d1d5db',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#1a2332',
  border: '1px solid #3b4b62',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  lineHeight: 1.5,
  fontFamily: 'inherit',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  color: '#9ca3af',
  transition: 'all 0.2s',
  backgroundColor: 'rgba(255,255,255,0.05)',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 600,
  color: '#9ca3af',
  borderBottom: '1px solid #3b4b62',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#e5e7eb',
  borderBottom: '1px solid rgba(59,75,98,0.5)',
};
