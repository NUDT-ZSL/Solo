import { useState, useEffect, useCallback } from 'react';
import { api } from './http';
import type { Article, PlatformConfig, PublishRecord } from './types';
import ArticleList from './components/ArticleList';
import ArticleEditor from './components/ArticleEditor';
import PlatformPanel from './components/PlatformPanel';
import PublishHistoryModal from './components/PublishHistoryModal';
import VersionHistoryModal from './components/VersionHistoryModal';

function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [publishRecords, setPublishRecords] = useState<PublishRecord[]>([]);

  const loadArticles = useCallback(async () => {
    try {
      const data = await api.getArticles();
      setArticles(data);
      if (data.length > 0 && !selectedArticle) {
        const fullArticle = await api.getArticle(data[0].id);
        setSelectedArticle(fullArticle);
      }
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedArticle]);

  const loadPlatforms = useCallback(async () => {
    try {
      const data = await api.getPlatforms();
      setPlatforms(data);
    } catch (error) {
      console.error('Failed to load platforms:', error);
    }
  }, []);

  useEffect(() => {
    loadArticles();
    loadPlatforms();
  }, [loadArticles, loadPlatforms]);

  const handleSelectArticle = async (article: Article) => {
    try {
      const fullArticle = await api.getArticle(article.id);
      setSelectedArticle(fullArticle);
      setLeftSidebarOpen(false);
    } catch (error) {
      console.error('Failed to load article:', error);
    }
  };

  const handleCreateArticle = async () => {
    try {
      const newArticle = await api.createArticle({
        title: '无标题文章',
        body: ''
      });
      setArticles(prev => [newArticle, ...prev]);
      setSelectedArticle(newArticle);
      setLeftSidebarOpen(false);
    } catch (error) {
      console.error('Failed to create article:', error);
    }
  };

  const handleSaveArticle = async (title: string, body: string) => {
    if (!selectedArticle) return;
    try {
      const updated = await api.updateArticle(selectedArticle.id, { title, body });
      setSelectedArticle(updated);
      setArticles(prev => prev.map(a => 
        a.id === updated.id 
          ? { ...a, title: updated.title, updatedAt: updated.updatedAt }
          : a
      ));
    } catch (error) {
      console.error('Failed to save article:', error);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await api.deleteArticle(articleId);
      setArticles(prev => prev.filter(a => a.id !== articleId));
      if (selectedArticle?.id === articleId) {
        setSelectedArticle(null);
      }
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  const handlePublish = async () => {
    if (!selectedArticle) return;
    try {
      const result = await api.publishArticle(selectedArticle.id);
      setPublishRecords(result.records);
      
      setTimeout(() => {
        pollPublishStatus(selectedArticle.id);
      }, 500);
      
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Failed to publish article:', error);
    }
  };

  const pollPublishStatus = async (articleId: string) => {
    try {
      const result = await api.getPublishStatus(articleId);
      setPublishRecords(result.publishHistory);
      
      const hasPublishing = result.publishHistory.some(r => r.status === 'publishing');
      if (hasPublishing) {
        setTimeout(() => pollPublishStatus(articleId), 500);
      } else {
        loadArticles();
        if (selectedArticle?.id === articleId) {
          const fullArticle = await api.getArticle(articleId);
          setSelectedArticle(fullArticle);
        }
      }
    } catch (error) {
      console.error('Failed to poll publish status:', error);
    }
  };

  const handleUpdatePlatform = async (platformId: string, config: Partial<PlatformConfig>) => {
    try {
      const updated = await api.updatePlatform(platformId, config);
      setPlatforms(prev => prev.map(p => p.id === platformId ? updated : p));
    } catch (error) {
      console.error('Failed to update platform:', error);
    }
  };

  const handleShowHistory = () => {
    if (selectedArticle) {
      setPublishRecords(selectedArticle.publishHistory || []);
      setShowHistoryModal(true);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedArticle) return;
    try {
      const updated = await api.restoreVersion(selectedArticle.id, versionId);
      setSelectedArticle(updated);
      setShowVersionModal(false);
      loadArticles();
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  return (
    <div className="app-container">
      <div className="mobile-header">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setLeftSidebarOpen(true)}
        >
          ☰
        </button>
        <span style={{ fontWeight: 600 }}>CrossPostHub</span>
        <button 
          className="mobile-menu-btn" 
          onClick={() => setRightSidebarOpen(true)}
        >
          ⚙
        </button>
      </div>

      <div 
        className={`sidebar-overlay ${leftSidebarOpen || rightSidebarOpen ? 'visible' : ''}`}
        onClick={() => {
          setLeftSidebarOpen(false);
          setRightSidebarOpen(false);
        }}
      />

      <aside className={`sidebar-left ${leftSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-left-header">
          <h2>文章列表</h2>
          <button 
            className="btn-new-article" 
            onClick={handleCreateArticle}
            title="新建文章"
          >
            +
          </button>
        </div>
        <ArticleList 
          articles={articles}
          selectedId={selectedArticle?.id || null}
          onSelect={handleSelectArticle}
          onDelete={handleDeleteArticle}
          loading={loading}
        />
      </aside>

      <main className="editor-area">
        {selectedArticle ? (
          <ArticleEditor 
            article={selectedArticle}
            onSave={handleSaveArticle}
            onPublish={handlePublish}
            onShowHistory={handleShowHistory}
            onShowVersions={() => setShowVersionModal(true)}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-text">选择一篇文章或创建新文章</p>
          </div>
        )}
      </main>

      <aside className={`sidebar-right ${rightSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-right-header">
          <h3>平台配置</h3>
        </div>
        <PlatformPanel 
          platforms={platforms}
          onUpdate={handleUpdatePlatform}
        />
      </aside>

      {showHistoryModal && (
        <PublishHistoryModal 
          records={publishRecords}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showVersionModal && selectedArticle && (
        <VersionHistoryModal 
          article={selectedArticle}
          onClose={() => setShowVersionModal(false)}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}

export default App;
