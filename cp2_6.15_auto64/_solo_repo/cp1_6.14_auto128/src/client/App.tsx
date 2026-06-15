import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import SubmissionList from './SubmissionList';
import ReviewPanel from './ReviewPanel';
import DeadlinePanel from './DeadlinePanel';
import BackToTop from './BackToTop';

type Page = 'submissions' | 'deadline';

const AppContent: React.FC = () => {
  const { isAuthenticated, isTeacher, user, logout } = useAuth();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState<Page>('submissions');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">PeerGrad</h2>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentPage === 'submissions' ? 'nav-active' : ''}`}
            onClick={() => {
              setCurrentPage('submissions');
              setSelectedSubmissionId(null);
            }}
          >
            📋 作业列表
          </button>
          {isTeacher && (
            <button
              className={`nav-item ${currentPage === 'deadline' ? 'nav-active' : ''}`}
              onClick={() => {
                setCurrentPage('deadline');
                setSelectedSubmissionId(null);
              }}
            >
              ⏰ 截止时间
            </button>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="user-name">{user?.nickname}</span>
            <span className="user-role">
              {isTeacher ? '导师' : '学员'}
            </span>
          </div>
          <button className="logout-btn" onClick={logout}>
            退出登录
          </button>
        </div>
      </aside>

      <main className="main-content">
        {selectedSubmissionId ? (
          <ReviewPanel
            submissionId={selectedSubmissionId}
            onBack={() => setSelectedSubmissionId(null)}
          />
        ) : currentPage === 'submissions' ? (
          <SubmissionList
            onSelectSubmission={setSelectedSubmissionId}
          />
        ) : (
          <DeadlinePanel />
        )}
      </main>

      <BackToTop />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
