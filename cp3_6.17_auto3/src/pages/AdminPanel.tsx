import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamRecord, Subject } from '../types';
import { formatDate, formatTime, getScoreColor } from '../utils/helpers';

const CATEGORIES = [
  { value: 'basic', label: '基础知识' },
  { value: 'logic', label: '逻辑分析' },
  { value: 'code', label: '代码理解' },
  { value: 'security', label: '安全规范' },
  { value: 'management', label: '项目管理' },
];

interface QuestionFormState {
  subject: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: string;
  analysis: string;
}

const EMPTY_FORM: QuestionFormState = {
  subject: '',
  text: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  category: 'basic',
  analysis: '',
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<QuestionFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/scores').then((r) => r.json()),
      fetch('/api/subjects').then((r) => r.json()),
    ])
      .then(([scoresData, subjectsData]: [ExamRecord[], Subject[]]) => {
        setRecords(scoresData);
        setSubjects(subjectsData);
        if (subjectsData.length > 0) {
          setForm((f) => ({ ...f, subject: subjectsData[0].id }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleOptionChange = useCallback((index: number, value: string) => {
    setForm((f) => {
      const options = [...f.options];
      options[index] = value;
      return { ...f, options };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.subject || !form.text || form.options.some((o) => !o.trim())) {
        setMessage({ type: 'error', text: '请填写完整的题目信息' });
        return;
      }
      setSubmitting(true);
      setMessage(null);
      try {
        const res = await fetch('/api/admin/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.success) {
          setMessage({ type: 'success', text: '题目添加成功！' });
          setForm({ ...EMPTY_FORM, subject: form.subject });
        } else {
          setMessage({ type: 'error', text: data.error || '添加失败' });
        }
      } catch {
        setMessage({ type: 'error', text: '网络错误，添加失败' });
      } finally {
        setSubmitting(false);
      }
    },
    [form]
  );

  return (
    <div className="fade-in">
      <nav className="top-nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          📝 模考通
        </div>
        <div className="nav-links">
          <span className="nav-link" onClick={() => navigate('/')}>
            首页
          </span>
          <span className="nav-link" onClick={() => navigate('/history')}>
            历史成绩
          </span>
        </div>
      </nav>

      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <button
            className="btn btn-outline"
            style={{ padding: '0 16px', height: 38, fontSize: 14 }}
            onClick={() => navigate('/')}
          >
            ← 返回首页
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#2d3748' }}>
              📋 成绩汇总（共 {records.length} 条）
            </h3>
            {loading ? (
              <div className="spinner" />
            ) : records.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
                暂无成绩记录
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>科目</th>
                      <th>得分</th>
                      <th>正确/总数</th>
                      <th>用时</th>
                      <th>考试时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.subjectName}</td>
                        <td>
                          <span style={{ color: getScoreColor(r.score), fontWeight: 700 }}>
                            {r.score}
                          </span>
                        </td>
                        <td>
                          {r.correctCount} / {r.totalQuestions}
                        </td>
                        <td>{formatTime(r.timeTaken)}</td>
                        <td style={{ color: '#718096', fontSize: 13 }}>
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#2d3748' }}>
              ➕ 添加新题目
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
                  所属科目
                </label>
                <select
                  className="form-input"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
                  题目文本
                </label>
                <textarea
                  className="form-input form-textarea"
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  placeholder="请输入题目内容..."
                />
              </div>

              {form.options.map((opt, i) => (
                <div key={i}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
                    选项 {String.fromCharCode(65 + i)}
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={form.correctAnswer === i}
                      onChange={() => setForm((f) => ({ ...f, correctAnswer: i }))}
                      style={{ cursor: 'pointer', width: 18, height: 18 }}
                    />
                    <input
                      className="form-input"
                      value={opt}
                      onChange={(e) => handleOptionChange(i, e.target.value)}
                      placeholder={`选项 ${String.fromCharCode(65 + i)} 内容`}
                    />
                  </div>
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
                  知识点维度
                </label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
                  解析
                </label>
                <textarea
                  className="form-input form-textarea"
                  value={form.analysis}
                  onChange={(e) => setForm((f) => ({ ...f, analysis: e.target.value }))}
                  placeholder="请输入答案解析..."
                />
              </div>

              {message && (
                <div
                  style={{
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 6,
                    color: message.type === 'success' ? '#38a169' : '#e53e3e',
                    background: message.type === 'success' ? '#f0fff4' : '#fff5f5',
                  }}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ marginTop: 4 }}
              >
                {submitting ? '提交中...' : '提交题目'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .page-container > div:last-child > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
