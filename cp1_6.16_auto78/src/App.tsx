import React, { useState, useEffect, useCallback } from 'react';
import type { Paper, Reviewer, ReviewScore, ConflictFlag, SummaryItem } from './business/ReviewMatch';
import { autoAssignReviewers } from './business/ReviewMatch';
import * as api from './api';
import SubmissionList from './SubmissionList';
import ReviewerPanel from './ReviewerPanel';
import ScoringSummary from './ScoringSummary';

type ViewMode = 'organizer' | 'reviewer' | 'summary';
type OrganizerSubView = 'papers' | 'reviewers' | 'create-paper' | 'create-reviewer';

const NAVBAR_HEIGHT = 56;
const SIDEBAR_WIDTH = 240;

const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
    background: #F4F6F8;
    color: #2C3E50;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #BDC3C7; border-radius: 3px; }
  input, textarea, select, button { font-family: inherit; }
`;

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('organizer');
  const [orgSubView, setOrgSubView] = useState<OrganizerSubView>('papers');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [scores, setScores] = useState<ReviewScore[]>([]);
  const [conflicts, setConflicts] = useState<ConflictFlag[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [currentReviewer, setCurrentReviewer] = useState<Reviewer | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, s, c, sm] = await Promise.all([
        api.fetchPapers(),
        api.fetchReviewers(),
        api.fetchScores(),
        api.fetchConflicts(),
        api.fetchSummary(),
      ]);
      setPapers(p);
      setReviewers(r);
      setScores(s);
      setConflicts(c);
      setSummary(sm);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshSummary = useCallback(async () => {
    try {
      const [sm, s, c] = await Promise.all([
        api.fetchSummary(),
        api.fetchScores(),
        api.fetchConflicts(),
      ]);
      setSummary(sm);
      setScores(s);
      setConflicts(c);
    } catch (err) {
      console.error('Failed to refresh summary:', err);
    }
  }, []);

  const handleCreatePaper = useCallback(async (data: { title: string; abstract: string; keywords: string[]; authors: string[] }) => {
    const newPaper = await api.createPaper(data);
    setPapers((prev) => [...prev, newPaper]);
    setOrgSubView('papers');
  }, []);

  const handleCreateReviewer = useCallback(async (data: { name: string; email: string; expertise: string[] }) => {
    const newReviewer = await api.createReviewer(data);
    setReviewers((prev) => [...prev, newReviewer]);
    setOrgSubView('reviewers');
  }, []);

  const handleAssignReviewers = useCallback(async (paperId: string, reviewerIds: string[]) => {
    await api.assignReviewers(paperId, reviewerIds);
    setPapers((prev) => prev.map((p) => p.id === paperId ? { ...p, reviewerIds } : p));
  }, []);

  const handleAutoAssign = useCallback(async () => {
    const assignments = autoAssignReviewers(papers, reviewers, 2, 5);
    await api.batchAssign(assignments);
    setPapers((prev) =>
      prev.map((p) => {
        const a = assignments.find((as) => as.paperId === p.id);
        return a ? { ...p, reviewerIds: a.reviewerIds } : p;
      })
    );
  }, [papers, reviewers]);

  const handleSubmitScore = useCallback(async (data: { paperId: string; reviewerId: string; scores: ReviewScore['scores']; comment: string }) => {
    await api.submitScore(data);
    await refreshSummary();
  }, [refreshSummary]);

  const handleResolveConflict = useCallback(async (paperId: string, dimension: string, arbitratedScore: number) => {
    await api.resolveConflict(paperId, dimension, arbitratedScore);
    await refreshSummary();
  }, [refreshSummary]);

  const handleReviewerLogin = useCallback((name: string) => {
    const reviewer = reviewers.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (reviewer) {
      setCurrentReviewer(reviewer);
      setViewMode('reviewer');
    }
  }, [reviewers]);

  const handleExportSummary = useCallback(() => {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scoring_summary.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [summary]);

  const renderSidebar = () => {
    const sidebarStyle: React.CSSProperties = {
      position: 'fixed',
      top: NAVBAR_HEIGHT,
      left: 0,
      width: SIDEBAR_WIDTH,
      height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      background: '#F4F6F8',
      borderRight: '1px solid #E0E0E0',
      overflowY: 'auto',
      zIndex: 100,
      transition: 'transform 0.3s ease',
      transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
      padding: '16px 0',
    };

    const sectionLabelStyle: React.CSSProperties = {
      padding: '8px 20px',
      fontSize: '11px',
      fontWeight: 600,
      color: '#95A5A6',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    };

    const menuItemStyle = (active: boolean): React.CSSProperties => ({
      padding: '10px 20px',
      cursor: 'pointer',
      fontSize: '14px',
      color: active ? '#2980B9' : '#2C3E50',
      background: active ? '#EBF5FB' : 'transparent',
      borderLeft: active ? '3px solid #2980B9' : '3px solid transparent',
      transition: 'all 0.2s ease',
      fontWeight: active ? 600 : 400,
    });

    return (
      <div style={sidebarStyle}>
        <div style={sectionLabelStyle}>角色切换</div>
        <div style={menuItemStyle(viewMode === 'organizer')} onClick={() => { setViewMode('organizer'); setOrgSubView('papers'); }}>
          📋 组织者视图
        </div>
        <div style={menuItemStyle(viewMode === 'reviewer')} onClick={() => setViewMode('reviewer')}>
          📝 审稿人视图
        </div>
        <div style={menuItemStyle(viewMode === 'summary')} onClick={() => { setViewMode('summary'); refreshSummary(); }}>
          📊 评分汇总
        </div>

        {viewMode === 'organizer' && (
          <>
            <div style={{ ...sectionLabelStyle, marginTop: 16 }}>组织者操作</div>
            <div style={menuItemStyle(orgSubView === 'papers')} onClick={() => setOrgSubView('papers')}>
              论文列表
            </div>
            <div style={menuItemStyle(orgSubView === 'reviewers')} onClick={() => setOrgSubView('reviewers')}>
              审稿人管理
            </div>
            <div style={menuItemStyle(orgSubView === 'create-paper')} onClick={() => setOrgSubView('create-paper')}>
              + 新建论文
            </div>
            <div style={menuItemStyle(orgSubView === 'create-reviewer')} onClick={() => setOrgSubView('create-reviewer')}>
              + 新建审稿人
            </div>
          </>
        )}

        {viewMode === 'reviewer' && !currentReviewer && (
          <>
            <div style={{ ...sectionLabelStyle, marginTop: 16 }}>审稿人登录</div>
            <div style={{ padding: '8px 20px' }}>
              <select
                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #BDC3C7', fontSize: 14 }}
                value={currentReviewer?.id || ''}
                onChange={(e) => {
                  const r = reviewers.find((rv) => rv.id === e.target.value);
                  if (r) {
                    setCurrentReviewer(r);
                  }
                }}
              >
                <option value="">选择审稿人</option>
                {reviewers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {viewMode === 'reviewer' && currentReviewer && (
          <>
            <div style={{ ...sectionLabelStyle, marginTop: 16 }}>当前审稿人</div>
            <div style={{ padding: '8px 20px', fontSize: 14, fontWeight: 600, color: '#2C3E50' }}>
              {currentReviewer.name}
            </div>
            <div style={{ padding: '4px 20px', fontSize: 12, color: '#7F8C8D' }}>
              {currentReviewer.email}
            </div>
            <div style={{ padding: '8px 20px' }}>
              <button
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#E74C3C',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={() => { setCurrentReviewer(null); setViewMode('organizer'); }}
              >
                退出登录
              </button>
            </div>
          </>
        )}

        <div style={{ ...sectionLabelStyle, marginTop: 24 }}>数据统计</div>
        <div style={{ padding: '4px 20px', fontSize: 13, color: '#7F8C8D' }}>
          论文: {papers.length} 篇<br />
          审稿人: {reviewers.length} 人<br />
          已评分: {scores.filter((s) => s.submitted).length} 份<br />
          冲突: {conflicts.filter((c) => !c.resolved).length} 项
        </div>
      </div>
    );
  };

  const renderNavbar = () => {
    const navStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: NAVBAR_HEIGHT,
      background: '#1A252C',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      zIndex: 200,
      color: '#fff',
    };

    return (
      <div style={navStyle}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            marginRight: 16,
            display: 'none',
          }}
          className="hamburger-btn"
        >
          ☰
        </button>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.5px' }}>
          🎓 学术会议论文审稿与评分系统
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#BDC3C7' }}>
          {viewMode === 'organizer' && '组织者模式'}
          {viewMode === 'reviewer' && currentReviewer && `审稿人: ${currentReviewer.name}`}
          {viewMode === 'reviewer' && !currentReviewer && '审稿人模式'}
          {viewMode === 'summary' && '评分汇总'}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const contentStyle: React.CSSProperties = {
      marginTop: NAVBAR_HEIGHT,
      marginLeft: sidebarOpen ? SIDEBAR_WIDTH : 0,
      minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      padding: 24,
      transition: 'margin-left 0.3s ease',
    };

    if (loading) {
      return (
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', padding: 80, color: '#7F8C8D', fontSize: 16 }}>
            加载中...
          </div>
        </div>
      );
    }

    if (viewMode === 'organizer') {
      if (orgSubView === 'create-paper') {
        return (
          <div style={contentStyle}>
            <CreatePaperForm onSubmit={handleCreatePaper} onCancel={() => setOrgSubView('papers')} />
          </div>
        );
      }
      if (orgSubView === 'create-reviewer') {
        return (
          <div style={contentStyle}>
            <CreateReviewerForm onSubmit={handleCreateReviewer} onCancel={() => setOrgSubView('reviewers')} />
          </div>
        );
      }
      return (
        <div style={contentStyle}>
          <SubmissionList
            papers={papers}
            reviewers={reviewers}
            scores={scores}
            conflicts={conflicts}
            onAssign={handleAssignReviewers}
            onAutoAssign={handleAutoAssign}
            subView={orgSubView}
            onSubViewChange={setOrgSubView}
          />
        </div>
      );
    }

    if (viewMode === 'reviewer') {
      return (
        <div style={{ ...contentStyle, maxWidth: currentReviewer ? 900 : 600, margin: `${NAVBAR_HEIGHT}px auto 0`, padding: 24 }}>
          {!currentReviewer ? (
            <ReviewerLogin reviewers={reviewers} onLogin={handleReviewerLogin} />
          ) : (
            <ReviewerPanel
              reviewer={currentReviewer}
              papers={papers.filter((p) => p.reviewerIds.includes(currentReviewer.id))}
              scores={scores}
              onSubmitScore={handleSubmitScore}
            />
          )}
        </div>
      );
    }

    if (viewMode === 'summary') {
      return (
        <div style={contentStyle}>
          <ScoringSummary
            summary={summary}
            conflicts={conflicts}
            papers={papers}
            reviewers={reviewers}
            onResolveConflict={handleResolveConflict}
            onExport={handleExportSummary}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <style>{globalStyles}</style>
      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
        }
      `}</style>
      {renderNavbar()}
      {renderSidebar()}
      {renderContent()}
    </>
  );
}

function CreatePaperForm({ onSubmit, onCancel }: { onSubmit: (data: { title: string; abstract: string; keywords: string[]; authors: string[] }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [keywords, setKeywords] = useState('');
  const [authors, setAuthors] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      abstract,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      authors: authors.split(',').map((a) => a.trim()).filter(Boolean),
    });
  };

  const formCardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 8,
    padding: 32,
    maxWidth: 700,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #BDC3C7',
    borderRadius: 6,
    fontSize: 14,
    marginBottom: 16,
  };

  return (
    <div style={formCardStyle}>
      <h2 style={{ marginBottom: 24, fontSize: 20 }}>新建论文</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>标题</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="输入论文标题" />
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>摘要</label>
        <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={abstract} onChange={(e) => setAbstract(e.target.value)} required placeholder="输入论文摘要" />
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>关键词（逗号分隔）</label>
        <input style={inputStyle} value={keywords} onChange={(e) => setKeywords(e.target.value)} required placeholder="如: deep learning, NLP, transformer" />
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>作者（逗号分隔）</label>
        <input style={inputStyle} value={authors} onChange={(e) => setAuthors(e.target.value)} required placeholder="如: Zhang Wei, Li Ming" />
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="submit" style={{ padding: '10px 24px', background: '#2980B9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            创建
          </button>
          <button type="button" onClick={onCancel} style={{ padding: '10px 24px', background: '#ECF0F1', color: '#2C3E50', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateReviewerForm({ onSubmit, onCancel }: { onSubmit: (data: { name: string; email: string; expertise: string[] }) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [expertise, setExpertise] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      email,
      expertise: expertise.split(',').map((k) => k.trim()).filter(Boolean),
    });
  };

  const formCardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 8,
    padding: 32,
    maxWidth: 700,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #BDC3C7',
    borderRadius: 6,
    fontSize: 14,
    marginBottom: 16,
  };

  return (
    <div style={formCardStyle}>
      <h2 style={{ marginBottom: 24, fontSize: 20 }}>新建审稿人</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>姓名</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required placeholder="如: Dr. Alice Chen" />
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>邮箱</label>
        <input style={{ ...inputStyle, type: 'email' }} value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="alice@university.edu" />
        <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>研究领域（逗号分隔）</label>
        <input style={inputStyle} value={expertise} onChange={(e) => setExpertise(e.target.value)} required placeholder="如: deep learning, NLP, reinforcement learning" />
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="submit" style={{ padding: '10px 24px', background: '#2980B9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            创建
          </button>
          <button type="button" onClick={onCancel} style={{ padding: '10px 24px', background: '#ECF0F1', color: '#2C3E50', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

function ReviewerLogin({ reviewers, onLogin }: { reviewers: Reviewer[]; onLogin: (name: string) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onLogin(name.trim());
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 40, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
      <h2 style={{ marginBottom: 8, fontSize: 22 }}>审稿人登录</h2>
      <p style={{ color: '#7F8C8D', marginBottom: 24, fontSize: 14 }}>输入姓名登录审稿人面板</p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
        <input
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #BDC3C7',
            borderRadius: 6,
            fontSize: 15,
            marginBottom: 16,
          }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入审稿人姓名"
          list="reviewer-names"
        />
        <datalist id="reviewer-names">
          {reviewers.map((r) => (
            <option key={r.id} value={r.name} />
          ))}
        </datalist>
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            background: '#2980B9',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          登录
        </button>
      </form>
    </div>
  );
}
