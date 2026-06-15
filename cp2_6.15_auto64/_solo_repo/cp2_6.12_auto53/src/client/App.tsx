import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChapterEditor from './components/ChapterEditor';
import CharacterManager from './components/CharacterManager';
import RelationGraph from './components/RelationGraph';
import { StoryProject, Chapter, Character, Relation } from './types';
import { projectApi } from './utils/api';
import { initFpsMonitor, measureBlockTime } from './utils/performance';

type ViewMode = 'editor' | 'graph';

const App: React.FC = () => {
  const [project, setProject] = useState<StoryProject | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initDemoProject();

    fpsCleanupRef.current = initFpsMonitor();

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
      if (fpsCleanupRef.current) fpsCleanupRef.current();
    };
  }, []);

  useEffect(() => {
    if (!project) return;

    if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);

    autoSaveIntervalRef.current = setInterval(() => {
      handleAutoSave();
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, [project?.id]);

  const initDemoProject = () => {
    const demo: StoryProject = {
      id: 'demo-1',
      name: '我的故事项目',
      chapters: [
        {
          id: 'ch-1',
          title: '第一章：起源',
          content: '<p>在这个世界的最初，一切从混沌中诞生...</p>',
          order: 0,
          collapsed: false,
          characterIds: ['char-1', 'char-2'],
        },
        {
          id: 'ch-2',
          title: '第二章：相遇',
          content: '<p>命运的齿轮开始转动，两个灵魂在十字路口相遇...</p>',
          order: 1,
          collapsed: false,
          characterIds: ['char-1', 'char-2', 'char-3'],
        },
        {
          id: 'ch-3',
          title: '第三章：冲突',
          content: '<p>暗流涌动，矛盾在平静的表面下酝酿...</p>',
          order: 2,
          collapsed: true,
          characterIds: ['char-2', 'char-3', 'char-4'],
        },
      ],
      characters: [
        { id: 'char-1', name: '云岚', age: 25, tags: [{ id: 't1', name: '善良', type: 'kind' }, { id: 't2', name: '幽默', type: 'humorous' }], background: '来自北方小村庄的年轻剑士，心怀正义' },
        { id: 'char-2', name: '墨影', age: 30, tags: [{ id: 't3', name: '邪恶', type: 'evil' }], background: '神秘的暗影组织首领，过去不为人知' },
        { id: 'char-3', name: '星露', age: 22, tags: [{ id: 't4', name: '善良', type: 'kind' }, { id: 't5', name: '幽默', type: 'humorous' }], background: '精灵族的治愈师，温柔而坚韧' },
        { id: 'char-4', name: '铁山', age: 45, tags: [{ id: 't6', name: '善良', type: 'kind' }], background: '退休的老将军，云岚的师父' },
      ],
      relations: [
        { id: 'rel-1', source: 'char-1', target: 'char-2', type: 'enemy' },
        { id: 'rel-2', source: 'char-1', target: 'char-3', type: 'lover' },
        { id: 'rel-3', source: 'char-1', target: 'char-4', type: 'family' },
        { id: 'rel-4', source: 'char-3', target: 'char-2', type: 'enemy' },
        { id: 'rel-5', source: 'char-2', target: 'char-4', type: 'enemy' },
        { id: 'rel-6', source: 'char-1', target: 'char-3', type: 'friend' },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProject(demo);
  };

  const handleAutoSave = useCallback(() => {
    if (!project) return;
    setAutoSaveStatus('saving');
    measureBlockTime(() => {
      try {
        localStorage.setItem(`story-${project.id}`, JSON.stringify(project));
      } catch {}
    }, 'auto-save-local', 50);
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 600);
  }, [project]);

  const updateChapters = (chapters: Chapter[]) => {
    setProject((prev) => (prev ? { ...prev, chapters, updatedAt: Date.now() } : prev));
  };

  const updateCharacters = (characters: Character[]) => {
    setProject((prev) => (prev ? { ...prev, characters, updatedAt: Date.now() } : prev));
  };

  const updateRelations = (relations: Relation[]) => {
    setProject((prev) => (prev ? { ...prev, relations, updatedAt: Date.now() } : prev));
  };

  const addRelation = (source: string, target: string, type: Relation['type']) => {
    const rel: Relation = {
      id: `rel-${Date.now()}`,
      source,
      target,
      type,
    };
    updateRelations([...(project?.relations || []), rel]);
  };

  const deleteRelation = (id: string) => {
    updateRelations((project?.relations || []).filter((r) => r.id !== id));
  };

  const handleExport = async () => {
    if (!project) return;

    setExporting(true);
    setExportProgress(0);

    const startTime = Date.now();
    const duration = 1000;
    const steps = 50;
    const stepDuration = duration / steps;

    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
      setExportProgress(Math.round((i / steps) * 100));
    }

    const elapsed = Date.now() - startTime;
    if (elapsed < duration) {
      await new Promise((resolve) => setTimeout(resolve, duration - elapsed));
    }

    const exportData = {
      name: project.name,
      chapters: project.chapters,
      characters: project.characters,
      relations: project.relations,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExporting(false);
    setExportProgress(0);
    showToast('导出成功！');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (!project) {
    return (
      <div className="empty-state">
        <h3>加载中...</h3>
      </div>
    );
  }

  return (
    <div className="app-container">
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-header">
          <h2>角色管理</h2>
          <button className="icon-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <CharacterManager
          projectId={project.id}
          characters={project.characters}
          chapters={project.chapters}
          onChange={updateCharacters}
        />
      </aside>

      <button
        className={`sidebar-toggle ${sidebarCollapsed ? 'collapsed' : ''}`}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s',
          }}
        >
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <main className="main-content">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input
              className="project-title"
              value={project.name}
              onChange={(e) =>
                setProject((prev) => (prev ? { ...prev, name: e.target.value } : prev))
              }
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 20,
                fontWeight: 600,
                fontFamily: 'inherit',
                width: 200,
              }}
            />
            <div className="view-tabs">
              <button
                className={`view-tab ${viewMode === 'editor' ? 'active' : ''}`}
                onClick={() => setViewMode('editor')}
              >
                大纲编辑
              </button>
              <button
                className={`view-tab ${viewMode === 'graph' ? 'active' : ''}`}
                onClick={() => setViewMode('graph')}
              >
                关系图谱
              </button>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handleAutoSave}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              保存
            </button>
            <button className="btn btn-primary" onClick={handleExport}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              导出JSON
            </button>
          </div>
        </header>

        {viewMode === 'editor' ? (
          <ChapterEditor
            chapters={project.chapters}
            onChange={updateChapters}
            onAutoSave={handleAutoSave}
            autoSaveStatus={autoSaveStatus}
          />
        ) : (
          <RelationGraph
            characters={project.characters}
            relations={project.relations}
            chapters={project.chapters}
            onAddRelation={addRelation}
            onDeleteRelation={deleteRelation}
          />
        )}
      </main>

      <AnimatePresence>
        {exporting && (
          <motion.div
            className="export-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="export-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <h3>正在导出项目</h3>
              <p>请稍候，正在打包数据...</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${exportProgress}%`,
                    background: `linear-gradient(90deg, #3b82f6 0%, ${
                      exportProgress < 50
                        ? `rgb(${59 + Math.round(exportProgress * 3.3)}, ${130 - Math.round(exportProgress * 0.6)}, ${246 - Math.round(exportProgress * 2)})`
                        : `rgb(${59 + 165 - Math.round((exportProgress - 50) * 2.8)}, ${130 - 30 + Math.round((exportProgress - 50) * 2.5)}, ${246 - 198 + Math.round((exportProgress - 50) * 2)})`
                    }) 100%)`,
                  }}
                />
              </div>
              <div className="progress-text">{exportProgress}%</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast-notification"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8 }}>
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
