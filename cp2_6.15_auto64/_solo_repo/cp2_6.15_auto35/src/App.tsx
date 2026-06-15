import { useState, useEffect } from 'react';
import axios from 'axios';
import { Project, ProgressData, UIStyleConfig, UIStyle } from './types';
import TranslationPanel from './translation/TranslationPanel';
import PreviewCard from './preview/PreviewCard';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<ProgressData>({ total: 0, translated: 0, percentage: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [uiStyle, setUiStyle] = useState<UIStyle | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [styleConfig, setStyleConfig] = useState<UIStyleConfig>({
    dialogBgColor: '#333333',
    textColor: '#ffffff',
    fontSize: 14,
    lineHeight: 1.6,
    padding: 16,
    borderRadius: 12,
    avatarSize: 64
  });
  const [selectedTranslationText, setSelectedTranslationText] = useState('');
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProgress(selectedProject.id);
      loadUIStyle(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    let start = 0;
    const end = progress.percentage;
    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progressRatio, 3);
      start = Math.round(easeOut * end);
      setAnimatedPercentage(start);
      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [progress.percentage]);

  const loadProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProject(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadProgress = async (projectId: string) => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/progress`);
      setProgress(response.data);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const loadUIStyle = async (projectId: string) => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/ui-styles`);
      if (response.data) {
        setUiStyle(response.data);
        setStyleConfig(response.data.config);
      }
    } catch (error) {
      console.error('Failed to load UI styles:', error);
    }
  };

  const handleSaveStyleConfig = async () => {
    if (!selectedProject) return;
    try {
      const response = await axios.post(`/api/projects/${selectedProject.id}/ui-styles`, {
        config: styleConfig
      });
      setUiStyle(response.data);
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save style config:', error);
    }
  };

  const handleImportStyleConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setStyleConfig({
          dialogBgColor: json.dialogBgColor || '#333333',
          textColor: json.textColor || '#ffffff',
          fontSize: json.fontSize || 14,
          lineHeight: json.lineHeight || 1.6,
          padding: json.padding || 16,
          borderRadius: json.borderRadius || 12,
          avatarSize: json.avatarSize || 64
        });
      } catch (error) {
        alert('JSON配置文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  const refreshProgress = () => {
    if (selectedProject) {
      loadProgress(selectedProject.id);
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🎮 游戏本地化平台</h1>
          <p>协作翻译 · 实时预览</p>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">项目列表</div>
          {projects.map((project) => (
            <div
              key={project.id}
              className={`project-card ${selectedProject?.id === project.id ? 'active' : ''}`}
              onClick={() => setSelectedProject(project)}
            >
              <div className="project-card-name">{project.name}</div>
              <div className="project-card-lang">
                {project.language} → {project.targetLanguage}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="main-content">
        <nav className="top-navbar">
          <div className="navbar-left">
            <div className="project-title">
              {selectedProject ? selectedProject.name : '请选择项目'}
            </div>
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${animatedPercentage}%` }}
                />
              </div>
              <span className="progress-text">{animatedPercentage}%</span>
            </div>
          </div>
          <div className="navbar-right">
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              disabled={!selectedProject}
            >
              ⚙️ UI样式配置
            </button>
            <button
              className="preview-toggle-btn"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!selectedProject}
            >
              {showPreview ? '收起预览' : '👁️ 实时预览'}
            </button>
            <div className="user-avatar">译</div>
          </div>
        </nav>

        <div className="content-area">
          {selectedProject ? (
            <TranslationPanel
              projectId={selectedProject.id}
              onProgressUpdate={refreshProgress}
              onSelectText={(text) => setSelectedTranslationText(text)}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📂</div>
              <div className="empty-state-text">请从左侧选择一个项目开始翻译</div>
            </div>
          )}
        </div>

        {showPreview && selectedProject && (
          <PreviewCard
            onClose={() => setShowPreview(false)}
            uiStyleConfig={styleConfig}
            translationText={selectedTranslationText}
          />
        )}

        {showSettings && (
          <div className="settings-modal" onClick={() => setShowSettings(false)}>
            <div className="settings-content" onClick={(e) => e.stopPropagation()}>
              <div className="settings-header">
                <div className="settings-title">UI样式配置</div>
                <button className="settings-close" onClick={() => setShowSettings(false)}>
                  ×
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">导入JSON配置文件</label>
                <label className="file-upload-area">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportStyleConfig}
                    style={{ display: 'none' }}
                  />
                  <div className="file-upload-text">
                    点击选择JSON文件或拖拽到此处上传
                  </div>
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">对话框背景色</label>
                  <input
                    type="color"
                    className="form-input"
                    value={styleConfig.dialogBgColor}
                    onChange={(e) =>
                      setStyleConfig({ ...styleConfig, dialogBgColor: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">字体颜色</label>
                  <input
                    type="color"
                    className="form-input"
                    value={styleConfig.textColor}
                    onChange={(e) =>
                      setStyleConfig({ ...styleConfig, textColor: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">字号 (px)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={styleConfig.fontSize}
                    min={10}
                    max={32}
                    onChange={(e) =>
                      setStyleConfig({ ...styleConfig, fontSize: parseInt(e.target.value) || 14 })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">行高</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={styleConfig.lineHeight}
                    min={1}
                    max={3}
                    onChange={(e) =>
                      setStyleConfig({ ...styleConfig, lineHeight: parseFloat(e.target.value) || 1.6 })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">内边距 (px)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={styleConfig.padding}
                    min={4}
                    max={48}
                    onChange={(e) =>
                      setStyleConfig({ ...styleConfig, padding: parseInt(e.target.value) || 16 })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">圆角 (px)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={styleConfig.borderRadius}
                    min={0}
                    max={32}
                    onChange={(e) =>
                      setStyleConfig({ ...styleConfig, borderRadius: parseInt(e.target.value) || 12 })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">头像尺寸 (px)</label>
                <input
                  type="number"
                  className="form-input"
                  value={styleConfig.avatarSize}
                  min={32}
                  max={128}
                  onChange={(e) =>
                    setStyleConfig({ ...styleConfig, avatarSize: parseInt(e.target.value) || 64 })
                  }
                />
              </div>

              <div className="settings-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowSettings(false)}
                >
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleSaveStyleConfig}>
                  保存配置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
