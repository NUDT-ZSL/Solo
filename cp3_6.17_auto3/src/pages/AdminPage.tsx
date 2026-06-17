import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Subject } from '../types';
import './AdminPage.css';

interface AdminRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  duration: number;
  date: string;
  dateFormatted: string;
  durationFormatted: string;
}

const AdminPage = () => {
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'add'>('records');
  
  const [formData, setFormData] = useState({
    text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '0',
    subject: '',
    dimension: '基础知识',
    explanation: '',
  });

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsRes, subjectsRes] = await Promise.all([
          fetch('/api/admin/records'),
          fetch('/api/subjects'),
        ]);
        const recordsData = await recordsRes.json();
        const subjectsData = await subjectsRes.json();
        setRecords(recordsData);
        setSubjects(subjectsData);
        if (subjectsData.length > 0) {
          setFormData((prev) => ({ ...prev, subject: subjectsData[0].id }));
        }
      } catch (error) {
        console.error('获取数据失败', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: formData.text,
          options: [formData.optionA, formData.optionB, formData.optionC, formData.optionD],
          correctAnswer: parseInt(formData.correctAnswer),
          subject: formData.subject,
          dimension: formData.dimension,
          explanation: formData.explanation,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          text: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctAnswer: '0',
          subject: subjects[0]?.id || '',
          dimension: '基础知识',
          explanation: '',
        });
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    }
  };

  const dimensions = ['基础知识', '逻辑分析', '代码理解', '安全规范', '项目管理'];

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-inner">
          <Link to="/" className="back-link">
            <span>←</span> 返回首页
          </Link>
          <h1 className="admin-title">管理后台</h1>
          <span className="header-spacer"></span>
        </div>
      </header>

      <main className="admin-main">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            成绩汇总
          </button>
          <button
            className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            添加题目
          </button>
        </div>

        {activeTab === 'records' ? (
          <div className="records-section">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>加载中...</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>考试科目</th>
                      <th>得分</th>
                      <th>正确率</th>
                      <th>用时</th>
                      <th>考试时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-row">
                          暂无考试记录
                        </td>
                      </tr>
                    ) : (
                      records.map((record, index) => (
                        <tr key={record.id}>
                          <td>{index + 1}</td>
                          <td>{record.subjectName}</td>
                          <td>
                            <span className={`score ${record.score >= 60 ? 'pass' : 'fail'}`}>
                              {record.score}分
                            </span>
                          </td>
                          <td>
                            {record.correctCount}/{record.totalQuestions}
                            <span className="percentage">
                              ({Math.round((record.correctCount / record.totalQuestions) * 100)}%)
                            </span>
                          </td>
                          <td>{record.durationFormatted}</td>
                          <td>{dayjs(record.date).format('YYYY-MM-DD HH:mm:ss')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="add-section">
            <form className="add-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <label className="form-label">题目内容</label>
                <textarea
                  className="form-textarea"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="请输入题目内容"
                  rows={3}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-row">
                  <label className="form-label">选项 A</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.optionA}
                    onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                    placeholder="选项A内容"
                    required
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">选项 B</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.optionB}
                    onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                    placeholder="选项B内容"
                    required
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">选项 C</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.optionC}
                    onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                    placeholder="选项C内容"
                    required
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">选项 D</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.optionD}
                    onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                    placeholder="选项D内容"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">正确答案</label>
                <div className="radio-group">
                  {['A', 'B', 'C', 'D'].map((letter, idx) => (
                    <label key={letter} className="radio-label">
                      <input
                        type="radio"
                        name="correctAnswer"
                        value={idx}
                        checked={formData.correctAnswer === String(idx)}
                        onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                      />
                      <span className="radio-custom"></span>
                      {letter}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row-half">
                <div className="form-row">
                  <label className="form-label">所属科目</label>
                  <select
                    className="form-select"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">知识维度</label>
                  <select
                    className="form-select"
                    value={formData.dimension}
                    onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
                    required
                  >
                    {dimensions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">答案解析</label>
                <textarea
                  className="form-textarea"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="请输入答案解析"
                  rows={2}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary submit-btn">
                  添加题目
                </button>
                {submitStatus === 'success' && (
                  <span className="status success">添加成功！</span>
                )}
                {submitStatus === 'error' && (
                  <span className="status error">添加失败，请重试</span>
                )}
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
