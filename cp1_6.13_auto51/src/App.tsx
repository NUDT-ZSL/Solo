import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import SurveyForm from './components/SurveyForm';
import StatsPanel from './components/StatsPanel';
import { surveyApi, Survey, Question } from './api/surveyApi';

const getClientId = (): string => {
  let clientId = localStorage.getItem('survey_client_id');
  if (!clientId) {
    clientId = uuidv4();
    localStorage.setItem('survey_client_id', clientId);
  }
  return clientId;
};

const Navbar: React.FC<{ currentPage: string; setCurrentPage: (page: string) => void }> = ({ currentPage, setCurrentPage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: 'create', label: '创建问卷', path: '/' },
    { id: 'list', label: '问卷列表', path: '/surveys' },
  ];

  return (
    <nav style={{
      background: '#1e293b',
      color: 'white',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ 
          color: 'white', 
          textDecoration: 'none', 
          fontSize: 20, 
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 24 }}>📝</span>
          匿名反馈问卷
        </Link>

        {isMobile ? (
          <>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: 24,
                cursor: 'pointer',
                padding: 8,
              }}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
            {mobileMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 60,
                left: 0,
                right: 0,
                background: '#1e293b',
                flexDirection: 'column',
                padding: 16,
                gap: 8,
                display: 'flex',
              }}>
                {navItems.map(item => (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      padding: '12px 16px',
                      borderRadius: 8,
                      position: 'relative',
                      fontWeight: 500,
                      background: currentPage === item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', gap: 32, height: '100%' }}>
            {navItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setCurrentPage(item.id)}
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  fontWeight: 500,
                  height: '100%',
                }}
              >
                {item.label}
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: currentPage === item.id ? '100%' : '0%',
                  height: 3,
                  background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                  transition: 'width 0.3s ease',
                }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

const CreateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [createdSurvey, setCreatedSurvey] = useState<Survey | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (title: string, questions: Question[]) => {
    try {
      setLoading(true);
      const survey = await surveyApi.createSurvey({ title, questions });
      setCreatedSurvey(survey);
    } catch (error) {
      alert('创建失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (createdSurvey) {
      const link = `${window.location.origin}/survey/${createdSurvey.shortId}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const viewStats = () => {
    if (createdSurvey) {
      navigate(`/stats/${createdSurvey._id}`);
    }
  };

  if (createdSurvey) {
    const shareLink = `${window.location.origin}/survey/${createdSurvey.shortId}`;
    return (
      <div style={{ maxWidth: 600, margin: '48px auto', padding: '0 24px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 40,
            color: 'white',
          }}>
            ✓
          </div>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 28 }}>问卷创建成功！</h2>
          <p style={{ color: '#64748b', marginBottom: 32 }}>
            问卷 "<strong style={{ color: '#1e293b' }}>{createdSurvey.title}</strong>" 已创建
          </p>

          <div style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>分享链接</div>
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}>
              <input
                type="text"
                value={shareLink}
                readOnly
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'white',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={copyLink}
                style={{
                  padding: '10px 20px',
                  background: copied ? '#10b981' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? '已复制 ✓' : '复制'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => {
                setCreatedSurvey(null);
              }}
              style={{
                padding: '12px 24px',
                background: 'white',
                color: '#475569',
                border: '2px solid #e2e8f0',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
            >
              继续创建
            </button>
            <button
              onClick={viewStats}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              查看数据分析 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto 32px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 32, color: '#1e293b' }}>创建问卷</h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          几分钟内创建一个匿名反馈问卷，支持单选、多选和开放性问题
        </p>
      </div>
      <SurveyForm onSubmit={handleCreate} loading={loading} />
    </div>
  );
};

const SurveyListPage: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const params = startDate || endDate ? { startDate, endDate } : undefined;
      const data = await surveyApi.getSurveys(params);
      setSurveys(data);
    } catch (error) {
      alert('加载失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, [startDate, endDate]);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`确定要删除问卷「${title}」吗？所有数据将无法恢复。`)) {
      try {
        await surveyApi.deleteSurvey(id);
        loadSurveys();
      } catch (error) {
        alert('删除失败：' + (error as Error).message);
      }
    }
  };

  const handleExport = async (id: string) => {
    try {
      await surveyApi.exportCSV(id);
    } catch (error) {
      alert('导出失败：' + (error as Error).message);
    }
  };

  const copyLink = (shortId: string) => {
    const link = `${window.location.origin}/survey/${shortId}`;
    navigator.clipboard.writeText(link);
    alert('链接已复制到剪贴板');
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 32, color: '#1e293b' }}>问卷列表</h1>
        <p style={{ color: '#64748b', margin: '0 0 24px' }}>
          管理所有问卷，查看数据或导出结果
        </p>

        <div style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          background: 'white',
          padding: 20,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#64748b', marginBottom: 6 }}>
              开始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#64748b', marginBottom: 6 }}>
              结束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#64748b',
              border: '2px solid #e2e8f0',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              height: 42,
            }}
          >
            重置筛选
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          加载中...
        </div>
      ) : surveys.length === 0 ? (
        <div style={{
