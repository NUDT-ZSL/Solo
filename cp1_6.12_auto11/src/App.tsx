import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import {
  Article,
  Version,
  getArticles,
  getArticleById,
  getVersions,
  createArticle,
  updateArticle,
  restoreVersion
} from './api';
import ArticleEditor from './components/ArticleEditor';
import VersionDiff from './components/VersionDiff';

marked.setOptions({
  breaks: true,
  gfm: true
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncate(str: string, len: number): string {
  const plain = str.replace(/[#*_`~\[\]()>-]/g, '').replace(/\n/g, ' ').trim();
  if (plain.length <= len) return plain;
  return plain.slice(0, len) + '...';
}

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
}

function Toast({ message, type = 'success' }: ToastProps) {
  return <div className={`toast ${type === 'error' ? 'error' : ''}`}>{message}</div>;
}

function useNickname() {
  const [nickname, setNicknameState] = useState<string>(() => {
    return localStorage.getItem('wiki_nickname') || '';
  });

  const setNickname = useCallback((name: string) => {
    localStorage.setItem('wiki_nickname', name);
    setNicknameState(name);
  }, []);

  return [nickname, setNickname] as const;
}

function HomePage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastProps | null>(null);

  useEffect(() => {
    loadArticles();
  }, [search]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await getArticles(search);
      setArticles(data);
    } catch (e) {
      setToast({ message: '加载词条失败', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="header">
        <div className="header-content">
          <h1>📚 社区维基平台</h1>
          <button className="btn btn-success" onClick={() => navigate('/new')}>
            + 新建词条
          </button>
        </div>
      </div>
      <div className="container">
        <div className="toolbar">
          <input
            type="text"
            className="search-bar"
            placeholder="搜索词条标题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <h3>还没有词条</h3>
            <p>点击"新建词条"创建第一个知识词条吧！</p>
          </div>
        ) : (
          <div className="article-grid">
            {articles.map((article) => (
              <div
                key={article.id}
                className="article-card"
                onClick={() => navigate(`/article/${article.id}`)}
              >
                <h3>{article.title}</h3>
                <p>{truncate(article.content, 80)}</p>
                <div className="meta">最后编辑：{formatDate(article.updated_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [nickname, setNickname] = useNickname();
  const [showCompare, setShowCompare] = useState(false);
  const [compareVersion1, setCompareVersion1] = useState<string>('');
  const [compareVersion2, setCompareVersion2] = useState<string>('');

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (articleId: string) => {
    setLoading(true);
    try {
      const [art, vers] = await Promise.all([
        getArticleById(articleId),
        getVersions(articleId)
      ]);
      setArticle(art);
      setVersions(vers);
      if (vers.length >= 2) {
        setCompareVersion1(vers[1].id);
        setCompareVersion2(vers[0].id);
      }
    } catch (e) {
      setToast({ message: '加载词条失败', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!id) return;
    if (!nickname.trim()) {
      setToast({ message: '请先设置昵称', type: 'error' });
      setTimeout(() => setToast(null), 2000);
      return;
    }
    try {
      await restoreVersion(id, versionId, nickname);
      setToast({ message: '回滚成功，已创建新版本' });
      setTimeout(() => setToast(null), 2000);
      loadData(id);
    } catch (e) {
      setToast({ message: '回滚失败', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container">
        <div className="error-message">词条不存在</div>
        <Link to="/" className="btn btn-secondary">返回首页</Link>
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="header">
        <div className="header-content">
          <h1>📚 社区维基平台</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              返回列表
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/edit/${article.id}`)}>
              编辑词条
            </button>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="article-detail">
          <div className="article-content">
            <h1>{article.title}</h1>
            <div className="meta">创建时间：{formatDate(article.created_at)} | 最后编辑：{formatDate(article.updated_at)}</div>
            <div
              className="body"
              dangerouslySetInnerHTML={{ __html: marked.parse(article.content) as string }}
            />

            <div className="version-compare-section">
              <h3>版本对比</h3>
              {versions.length < 2 ? (
                <p style={{ color: '#888' }}>需要至少两个版本才能进行对比</p>
              ) : (
                <>
                  <div className="compare-selectors">
                    <label>版本1：</label>
                    <select
                      value={compareVersion1}
                      onChange={(e) => setCompareVersion1(e.target.value)}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.version_number} - {v.editor_nickname} - {formatDate(v.created_at)}
                        </option>
                      ))}
                    </select>
                    <label>版本2：</label>
                    <select
                      value={compareVersion2}
                      onChange={(e) => setCompareVersion2(e.target.value)}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.version_number} - {v.editor_nickname} - {formatDate(v.created_at)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowCompare(!showCompare)}
                    >
                      {showCompare ? '隐藏对比' : '显示对比'}
                    </button>
                  </div>
                  {showCompare && compareVersion1 && compareVersion2 && (
                    <VersionDiff
                      versionId1={compareVersion1}
                      versionId2={compareVersion2}
                      articleId={article.id}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="version-sidebar">
            <div className="nickname-input">
              <label style={{ color: '#1a237e', fontWeight: 500 }}>昵称：</label>
              <input
                type="text"
                className="search-bar"
                placeholder="输入您的昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <h3>版本历史</h3>
            <div className="version-list">
              {versions.length === 0 ? (
                <p style={{ color: '#888', fontSize: '14px' }}>暂无版本记录</p>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="version-item">
                    <div className="version-number">v{v.version_number}</div>
                    <div className="version-meta">编辑者：{v.editor_nickname}</div>
                    <div className="version-meta">{formatDate(v.created_at)}</div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '8px' }}
                      onClick={() => handleRestore(v.id)}
                    >
                      回滚到此版本
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewArticlePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useNickname();
  const [tempNickname, setTempNickname] = useState(nickname);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [error, setError] = useState('');

  const handleSave = async (title: string, content: string) => {
    const finalNickname = tempNickname.trim();
    if (!finalNickname) {
      setError('请输入昵称');
      return;
    }
    try {
      const article = await createArticle(title, content, finalNickname);
      setNickname(finalNickname);
      setToast({ message: '保存成功' });
      setTimeout(() => {
        setToast(null);
        navigate(`/article/${article.id}`);
      }, 2000);
    } catch (e: any) {
      setError(e.message || '保存失败');
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="header">
        <div className="header-content">
          <h1>📚 新建词条</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            返回列表
          </button>
        </div>
      </div>
      <div className="container">
        {error && <div className="error-message">{error}</div>}
        <div className="nickname-input">
          <label style={{ color: '#1a237e', fontWeight: 500 }}>您的昵称：</label>
          <input
            type="text"
            className="search-bar"
            placeholder="输入昵称以便记录编辑者"
            value={tempNickname}
            onChange={(e) => setTempNickname(e.target.value)}
          />
        </div>
        <ArticleEditor onSave={handleSave} onCancel={() => navigate('/')} />
      </div>
    </div>
  );
}

function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useNickname();
  const [tempNickname, setTempNickname] = useState(nickname);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) loadArticle(id);
  }, [id]);

  const loadArticle = async (articleId: string) => {
    try {
      const data = await getArticleById(articleId);
      setArticle(data);
    } catch (e) {
      setError('加载词条失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (title: string, content: string) => {
    if (!id) return;
    const finalNickname = tempNickname.trim();
    if (!finalNickname) {
      setError('请输入昵称');
      return;
    }
    try {
      await updateArticle(id, title, content, finalNickname);
      setNickname(finalNickname);
      setToast({ message: '保存成功' });
      setTimeout(() => {
        setToast(null);
        navigate(`/article/${id}`);
      }, 2000);
    } catch (e: any) {
      setError(e.message || '保存失败');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container">
        <div className="error-message">词条不存在</div>
        <Link to="/" className="btn btn-secondary">返回首页</Link>
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="header">
        <div className="header-content">
          <h1>📚 编辑词条</h1>
          <button className="btn btn-secondary" onClick={() => navigate(`/article/${id}`)}>
            返回详情
          </button>
        </div>
      </div>
      <div className="container">
        {error && <div className="error-message">{error}</div>}
        <div className="nickname-input">
          <label style={{ color: '#1a237e', fontWeight: 500 }}>您的昵称：</label>
          <input
            type="text"
            className="search-bar"
            placeholder="输入昵称以便记录编辑者"
            value={tempNickname}
            onChange={(e) => setTempNickname(e.target.value)}
          />
        </div>
        <ArticleEditor
          initialTitle={article.title}
          initialContent={article.content}
          onSave={handleSave}
          onCancel={() => navigate(`/article/${id}`)}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/new" element={<NewArticlePage />} />
      <Route path="/article/:id" element={<ArticleDetailPage />} />
      <Route path="/edit/:id" element={<EditArticlePage />} />
    </Routes>
  );
}
