import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import Leaderboard from './components/Leaderboard';
import UserDetail from './components/UserDetail';
import { Contributor, RepoData } from './types';

function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();

  const githubMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (githubMatch) {
    return { owner: githubMatch[1], repo: githubMatch[2].replace(/\.git$/, '') };
  }

  const slashMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], repo: slashMatch[2] };
  }

  return null;
}

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSearch = async (repoUrl: string) => {
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      setError('请输入有效的 GitHub 仓库地址，格式为 owner/repo');
      return;
    }

    setError(null);
    setIsLoading(true);
    setRepoData(null);
    setSelectedUser(null);
    setSelectedContributor(null);

    try {
      const response = await fetch(`/api/contributors/${parsed.owner}/${parsed.repo}`);
      const result = await response.json();

      if (result.success) {
        setRepoData(result.data);
      } else {
        setError(result.error || '加载数据失败');
      }
    } catch (err) {
      setError('网络错误，请检查后端服务是否启动');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = async (username: string) => {
    setSelectedUser(username);

    if (!repoData) return;

    const existing = repoData.contributors.find(c => c.username === username);
    if (existing && existing.timeline) {
      setSelectedContributor(existing);
      return;
    }

    try {
      const response = await fetch(
        `/api/contributors/${repoData.owner}/${repoData.name}/${username}`
      );
      const result = await response.json();

      if (result.success) {
        setSelectedContributor(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch user detail');
    }
  };

  const handleCloseDetail = () => {
    setSelectedUser(null);
    setSelectedContributor(null);
  };



  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.title}>开源贡献者排行榜</h1>
        <p style={styles.subtitle}>与技能图谱</p>
      </div>

      <div style={styles.searchSection}>
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        {error && <div style={styles.error}>{error}</div>}
      </div>

      {repoData && (
        <div style={isMobile ? styles.mobileContainer : styles.container}>
          <div style={isMobile ? styles.mobileLeft : styles.leftPanel}>
            <div style={styles.repoInfo}>
              <span style={styles.repoName}>
                {repoData.owner}/{repoData.name}
              </span>
              <span style={styles.repoStats}>
                总提交: {repoData.totalCommits.toLocaleString()}
              </span>
            </div>
            <Leaderboard
              owner={repoData.owner}
              repo={repoData.name}
              selectedUser={selectedUser}
              onSelectUser={handleSelectUser}
            />
          </div>

          {!isMobile && (
            <div style={styles.rightPanel}>
              {selectedContributor ? (
                <UserDetail
                  contributor={selectedContributor}
                  isOpen={!!selectedUser}
                  onClose={handleCloseDetail}
                />
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>👆</div>
                  <p style={styles.emptyText}>点击左侧贡献者查看详情</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!repoData && !isLoading && (
        <div style={styles.heroSection}>
          <div style={styles.heroIcon}>📊</div>
          <h2 style={styles.heroTitle}>探索开源贡献者</h2>
          <p style={styles.heroDesc}>
            输入 GitHub 仓库地址，自动分析贡献者数据，
            <br />
            生成可视化排行榜和技能雷达图
          </p>
          <div style={styles.features}>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>📈</span>
              <span style={styles.featureText}>多维度排行榜</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>🎯</span>
              <span style={styles.featureText}>技能雷达图</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>📅</span>
              <span style={styles.featureText}>贡献时间线</span>
            </div>
          </div>
        </div>
      )}

      {isMobile && selectedContributor && (
        <UserDetail
          contributor={selectedContributor}
          isOpen={!!selectedUser}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: '24px'
  } as React.CSSProperties,
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0
  } as React.CSSProperties,
  subtitle: {
    fontSize: '16px',
    color: '#6366f1',
    fontWeight: 500,
    marginTop: '4px'
  } as React.CSSProperties,
  searchSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    marginBottom: '24px'
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    marginTop: '8px'
  } as React.CSSProperties,
  container: {
    display: 'flex',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    height: 'calc(100vh - 220px)',
    minHeight: '500px'
  } as React.CSSProperties,
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  leftPanel: {
    width: '60%',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  mobileLeft: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  } as React.CSSProperties,
  rightPanel: {
    width: '40%',
    position: 'relative' as const,
    overflow: 'hidden',
    borderRadius: '16px'
  },
  repoInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0'
  } as React.CSSProperties,
  repoName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b'
  } as React.CSSProperties,
  repoStats: {
    fontSize: '13px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '6px 12px',
    borderRadius: '6px'
  } as React.CSSProperties,
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  } as React.CSSProperties,
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8'
  } as React.CSSProperties,
  heroSection: {
    textAlign: 'center' as const,
    padding: '60px 20px'
  },
  heroIcon: {
    fontSize: '64px',
    marginBottom: '24px'
  } as React.CSSProperties,
  heroTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px 0'
  } as React.CSSProperties,
  heroDesc: {
    fontSize: '15px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 32px 0'
  } as React.CSSProperties,
  features: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    flexWrap: 'wrap' as const
  } as React.CSSProperties,
  featureItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px'
  },
  featureIcon: {
    fontSize: '32px'
  } as React.CSSProperties,
  featureText: {
    fontSize: '14px',
    color: '#475569',
    fontWeight: 500
  } as React.CSSProperties
};

export default App;
