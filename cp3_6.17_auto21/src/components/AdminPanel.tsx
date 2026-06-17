import React from 'react';
import { Link } from 'react-router-dom';

interface ScoreRecord {
  id: string;
  examineeId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  duration: string;
  date: string;
}

export default function AdminPanel() {
  const [scores, setScores] = React.useState<ScoreRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({
    question: '',
    option0: '',
    option1: '',
    option2: '',
    option3: '',
    correctAnswer: 0,
    subject: 'Java基础',
    knowledgePoint: '基础知识',
    explanation: '',
  });
  const [msg, setMsg] = React.useState('');
  const [activeBtn, setActiveBtn] = React.useState<string | null>(null);

  const loadScores = React.useCallback(() => {
    fetch('/api/admin/scores')
      .then(res => res.json())
      .then(data => { setScores(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  React.useEffect(() => {
    loadScores();
  }, [loadScores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = [form.option0, form.option1, form.option2, form.option3];
    if (options.some(o => !o.trim()) || !form.question.trim()) {
      setMsg('请填写完整信息');
      return;
    }
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: form.question,
          options,
          correctAnswer: form.correctAnswer,
          subject: form.subject,
          knowledgePoint: form.knowledgePoint,
          explanation: form.explanation,
        }),
      });
      if (res.ok) {
        setMsg('题目添加成功！');
        setForm({
          question: '', option0: '', option1: '', option2: '', option3: '',
          correctAnswer: 0, subject: 'Java基础', knowledgePoint: '基础知识', explanation: '',
        });
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsg('添加失败');
      }
    } catch {
      setMsg('网络错误');
    }
  };

  const subjects = ['Java基础', '项目管理', '网络安全'];
  const knowledgePoints = ['基础知识', '逻辑分析', '代码理解', '安全规范', '项目管理'];

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
  const passRate = scores.length > 0 ? Math.round((scores.filter(s => s.score >= 60).length / scores.length) * 100) : 0;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <Link to="/" style={{ color: '#3182ce', fontSize: 14 }}>← 返回首页</Link>
        <h2 style={{ color: '#2d3748', fontSize: 20 }}>管理后台</h2>
        <div />
      </div>

      <div style={styles.container}>
        <div style={styles.statsBar}>
          <div style={styles.statsCard}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#3182ce' }}>{scores.length}</div>
            <div style={{ fontSize: 13, color: '#718096' }}>总考试次数</div>
          </div>
          <div style={styles.statsCard}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#38a169' }}>{avgScore}</div>
            <div style={{ fontSize: 13, color: '#718096' }}>平均分</div>
          </div>
          <div style={styles.statsCard}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#00b5d8' }}>{passRate}%</div>
            <div style={{ fontSize: 13, color: '#718096' }}>通过率</div>
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.leftCol}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>成绩汇总</h3>
              {loading ? (
                <p style={{ color: '#a0aec0', textAlign: 'center' }}>加载中...</p>
              ) : scores.length === 0 ? (
                <p style={{ color: '#a0aec0', textAlign: 'center', padding: 20 }}>暂无考试记录</p>
              ) : (
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>考生ID</th>
                        <th style={styles.th}>科目</th>
                        <th style={styles.th}>得分</th>
                        <th style={styles.th}>正确/总题</th>
                        <th style={styles.th}>用时</th>
                        <th style={styles.th}>日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map(s => (
                        <tr key={s.id}>
                          <td style={styles.td}>{s.examineeId}</td>
                          <td style={styles.td}>{s.subject}</td>
                          <td style={{
                            ...styles.td,
                            fontWeight: 700,
                            color: s.score >= 60 ? '#38a169' : '#e53e3e',
                          }}>{s.score}</td>
                          <td style={styles.td}>{s.correctCount}/{s.totalQuestions}</td>
                          <td style={styles.td}>{s.duration}</td>
                          <td style={styles.td}>{s.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div style={styles.rightCol}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>添加题目</h3>
              {msg && (
                <div style={{
                  ...styles.msgBox,
                  background: msg.includes('成功') ? '#f0fff4' : '#fff5f5',
                  color: msg.includes('成功') ? '#38a169' : '#e53e3e',
                }}>
                  {msg}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>题目文本</label>
                  <textarea
                    style={styles.textarea}
                    value={form.question}
                    onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                    rows={3}
                  />
                </div>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={styles.formGroup}>
                    <label style={styles.label}>选项 {String.fromCharCode(65 + i)}</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={form.correctAnswer === i}
                        onChange={() => setForm(f => ({ ...f, correctAnswer: i }))}
                        style={{ accentColor: '#3182ce' }}
                      />
                      <input
                        style={styles.formInput}
                        value={(form as any)[`option${i}`]}
                        onChange={e => setForm(f => ({ ...f, [`option${i}`]: e.target.value }))}
                        placeholder={`选项${String.fromCharCode(65 + i)}内容`}
                      />
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: '#a0aec0', marginBottom: 12 }}>点击单选按钮选择正确答案</p>
                <div style={styles.formGroup}>
                  <label style={styles.label}>所属科目</label>
                  <select
                    style={styles.formSelect}
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>知识点</label>
                  <select
                    style={styles.formSelect}
                    value={form.knowledgePoint}
                    onChange={e => setForm(f => ({ ...f, knowledgePoint: e.target.value }))}
                  >
                    {knowledgePoints.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>解析（可选）</label>
                  <textarea
                    style={styles.textarea}
                    value={form.explanation}
                    onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                    rows={2}
                  />
                </div>
                <button
                  type="submit"
                  onMouseDown={() => setActiveBtn('submit')}
                  onMouseUp={() => setActiveBtn(null)}
                  onMouseLeave={() => setActiveBtn(null)}
                  style={{
                    ...styles.submitBtn,
                    transform: activeBtn === 'submit' ? 'scale(0.97)' : 'scale(1)',
                  }}
                >
                  添加题目
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  topBar: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px 16px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px 16px 40px',
  },
  statsBar: {
    display: 'flex',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap' as const,
  },
  statsCard: {
    flex: 1,
    minWidth: 140,
    background: '#fff',
    borderRadius: 12,
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  },
  twoCol: {
    display: 'flex',
    gap: 20,
  },
  leftCol: {
    flex: 2,
    minWidth: 0,
  },
  rightCol: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#2d3748',
    marginBottom: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 8px',
    borderBottom: '2px solid #e2e8f0',
    color: '#718096',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #edf2f7',
    color: '#4a5568',
    fontSize: 13,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: 4,
  },
  formInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  formSelect: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    background: '#3182ce',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  msgBox: {
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
};
