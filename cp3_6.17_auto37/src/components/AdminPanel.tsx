import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamResult, Subject, Question } from '../types';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return '#38a169';
  if (score >= 70) return '#3182ce';
  if (score >= 60) return '#d69e2e';
  return '#e53e3e';
};

const KNOWLEDGE_POINTS = ['基础知识', '逻辑分析', '代码理解', '安全规范', '项目管理'];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'addQuestion'>('results');
  
  const [formData, setFormData] = useState({
    text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 0,
    subject: '',
    knowledgePoint: '基础知识' as Question['knowledgePoint'],
    explanation: '',
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resultsRes, subjectsRes] = await Promise.all([
          fetch('/api/results'),
          fetch('/api/subjects'),
        ]);
        const resultsData: ExamResult[] = await resultsRes.json();
        const subjectsData: Subject[] = await subjectsRes.json();
        setResults(resultsData);
        setSubjects(subjectsData);
        if (subjectsData.length > 0) {
          setFormData(prev => ({ ...prev, subject: subjectsData[0].id }));
        }
        setLoading(false);
      } catch (error) {
        console.error('获取数据失败:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');

    const question: Omit<Question, 'id'> = {
      text: formData.text,
      options: [formData.optionA, formData.optionB, formData.optionC, formData.optionD],
      correctAnswer: formData.correctAnswer,
      subject: formData.subject,
      knowledgePoint: formData.knowledgePoint,
      explanation: formData.explanation,
    };

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          text: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctAnswer: 0,
          subject: subjects[0]?.id || '',
          knowledgePoint: '基础知识',
          explanation: '',
        });
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('添加题目失败:', error);
      setSubmitStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '18px', color: '#4a5568' }}>正在加载...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '24px' }}>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/')}
          style={{ marginBottom: '16px' }}
        >
          ← 返回首页
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#2d3748', marginBottom: '8px' }}>
          管理后台
        </h1>
        <p style={{ fontSize: '14px', color: '#718096' }}>
          查看所有考生成绩和管理题目
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('results')}
        >
          成绩汇总
        </button>
        <button
          className={`btn ${activeTab === 'addQuestion' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('addQuestion')}
        >
          添加题目
        </button>
      </div>

      {activeTab === 'results' && (
        <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2d3748', marginBottom: '16px' }}>
            所有考生成绩 ({results.length} 条记录)
          </h2>
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#718096' }}>
              暂无成绩记录
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#4a5568' }}>科目</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#4a5568' }}>得分</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#4a5568' }}>正确/总数</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#4a5568' }}>用时</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#4a5568' }}>考试时间</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#4a5568' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#2d3748' }}>{result.subject}</td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: getScoreColor(result.score) }}>
                      {Math.round(result.score)}分
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#4a5568' }}>
                      {result.correctCount} / {result.totalQuestions}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#4a5568' }}>
                      {formatTime(result.timeUsed)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#4a5568' }}>
                      {new Date(result.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => navigate(`/result/${result.id}`)}
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'addQuestion' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2d3748', marginBottom: '20px' }}>
            添加新题目
          </h2>

          {submitStatus === 'success' && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#f0fff4',
              border: '1px solid #9ae6b4',
              borderRadius: '8px',
              color: '#2f855a',
              marginBottom: '20px',
            }}>
              题目添加成功！
            </div>
          )}

          {submitStatus === 'error' && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fff5f5',
              border: '1px solid #fed7d7',
              borderRadius: '8px',
              color: '#c53030',
              marginBottom: '20px',
            }}>
              添加失败，请重试
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#4a5568', marginBottom: '8px' }}>
                题目文本 *
              </label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                placeholder="请输入题目内容"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {['A', 'B', 'C', 'D'].map((letter) => (
                <div key={letter}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#4a5568', marginBottom: '8px' }}>
                    选项 {letter} *
                  </label>
                  <input
                    type="text"
                    value={(formData as any)[`option${letter}`]}
                    onChange={(e) => setFormData(prev => ({ ...prev, [`option${letter}`]: e.target.value } as any))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                    placeholder={`请输入选项 ${letter} 的内容`}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#4a5568', marginBottom: '8px' }}>
                  正确答案 *
                </label>
                <select
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                  }}
                >
                  <option value={0}>A</option>
                  <option value={1}>B</option>
                  <option value={2}>C</option>
                  <option value={3}>D</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#4a5568', marginBottom: '8px' }}>
                  所属科目 *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                  }}
                >
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#4a5568', marginBottom: '8px' }}>
                知识点 *
              </label>
              <select
                value={formData.knowledgePoint}
                onChange={(e) => setFormData(prev => ({ ...prev, knowledgePoint: e.target.value as Question['knowledgePoint'] }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                }}
              >
                {KNOWLEDGE_POINTS.map(point => (
                  <option key={point} value={point}>{point}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#4a5568', marginBottom: '8px' }}>
                答案解析 *
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                placeholder="请输入答案解析"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              添加题目
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
