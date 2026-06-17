import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User, Recipe, RecipeVersion, RecipeContent, VersionDiff } from './types';
import { RecipeEditor } from './components/RecipeEditor';
import { VersionGraph } from './components/VersionGraph';
import { RecipeCard } from './components/RecipeCard';
import { useApi } from './hooks/useApi';
import dayjs from 'dayjs';

type ViewMode = 'editor' | 'graph' | 'card';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentContent, setCurrentContent] = useState<RecipeContent>({
    name: '',
    ingredients: [],
    steps: [],
    notes: '',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [isCreating, setIsCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<RecipeVersion | null>(null);
  const [branchName, setBranchName] = useState('');
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState('');

  const api = useApi();

  useEffect(() => {
    const savedUser = localStorage.getItem('recipe_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as User;
      setUser(parsedUser);
      loadRecipes(parsedUser.id);
    }
  }, []);

  const loadRecipes = async (userId: string) => {
    try {
      const result = await api.getRecipes(userId);
      setRecipes(result);
    } catch (e) {
      console.error('加载食谱失败', e);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    try {
      const loggedInUser = await api.login(username, password);
      setUser(loggedInUser);
      localStorage.setItem('recipe_user', JSON.stringify(loggedInUser));
      loadRecipes(loggedInUser.id);
    } catch (err) {
      alert('登录失败，请检查用户名和密码');
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    try {
      const newUser = await api.register(username, password);
      setUser(newUser);
      localStorage.setItem('recipe_user', JSON.stringify(newUser));
      loadRecipes(newUser.id);
    } catch (err) {
      alert('注册失败，用户名可能已存在');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setRecipes([]);
    setSelectedRecipe(null);
    localStorage.removeItem('recipe_user');
  };

  const handleCreateRecipe = () => {
    setIsCreating(true);
    setSelectedRecipe(null);
    setCurrentContent({
      name: '新食谱',
      ingredients: [],
      steps: [],
      notes: '',
    });
    setViewMode('editor');
  };

  const handleSelectRecipe = async (recipe: Recipe) => {
    setIsCreating(false);
    setSelectedRecipe(recipe);
    const fullRecipe = await api.getRecipe(recipe.id);
    setSelectedRecipe(fullRecipe);
    const currentVersion = fullRecipe.versions.find((v) => v.id === fullRecipe.currentVersionId);
    if (currentVersion) {
      setCurrentContent(currentVersion.content);
      setSelectedVersion(currentVersion);
    }
    setViewMode('editor');
  };

  const handleSaveNewRecipe = async () => {
    if (!user) return;
    try {
      const newRecipe = await api.createRecipe(user.id, currentContent, user.username);
      setRecipes([...recipes, newRecipe]);
      setSelectedRecipe(newRecipe);
      setIsCreating(false);
      alert('食谱创建成功！已自动创建版本 v1');
    } catch (err) {
      alert('创建食谱失败');
    }
  };

  const handleSaveVersion = async () => {
    if (!selectedRecipe || !user || !selectedVersion) return;
    const message = commitMessage || `更新于 ${dayjs().format('YYYY-MM-DD HH:mm')}`;
    try {
      const newVersion = await api.createVersion(
        selectedRecipe.id,
        currentContent,
        selectedVersion.id,
        message,
        user.id,
        user.username,
      );
      const updatedRecipe = await api.getRecipe(selectedRecipe.id);
      setSelectedRecipe(updatedRecipe);
      setRecipes(recipes.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r)));
      setSelectedVersion(newVersion);
      setCommitMessage('');
      alert(`版本 ${newVersion.version} 保存成功！`);
    } catch (err) {
      alert('保存版本失败');
    }
  };

  const handleCreateBranch = async () => {
    if (!selectedRecipe || !user || !selectedVersion) return;
    if (!branchName) {
      alert('请输入分支名称');
      return;
    }
    try {
      const newBranchVersion = await api.createBranch(
        selectedRecipe.id,
        selectedVersion.id,
        branchName,
        user.id,
        user.username,
      );
      const updatedRecipe = await api.getRecipe(selectedRecipe.id);
      setSelectedRecipe(updatedRecipe);
      setRecipes(recipes.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r)));
      setSelectedVersion(newBranchVersion);
      setCurrentContent(newBranchVersion.content);
      setShowBranchDialog(false);
      setBranchName('');
      alert(`分支 ${branchName} 创建成功！`);
    } catch (err) {
      alert('创建分支失败');
    }
  };

  const handleMerge = async () => {
    if (!selectedRecipe || !user) return;
    if (!mergeTargetId || !mergeSourceId) {
      alert('请选择目标版本和源版本');
      return;
    }
    try {
      const mergedVersion = await api.mergeVersions(
        selectedRecipe.id,
        mergeTargetId,
        mergeSourceId,
        user.id,
        user.username,
      );
      const updatedRecipe = await api.getRecipe(selectedRecipe.id);
      setSelectedRecipe(updatedRecipe);
      setRecipes(recipes.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r)));
      setSelectedVersion(mergedVersion);
      setCurrentContent(mergedVersion.content);
      setShowMergeDialog(false);
      setMergeTargetId('');
      setMergeSourceId('');
      alert(`合并成功！生成合并版本 ${mergedVersion.version}`);
    } catch (err) {
      alert('合并失败');
    }
  };

  const handleRollback = async () => {
    if (!selectedRecipe || !user || !selectedVersion) return;
    if (!confirm(`确定要回滚到版本 ${selectedVersion.version} 吗？这将创建一个新的回滚版本。`)) return;
    try {
      const rollbackVersion = await api.rollbackToVersion(
        selectedRecipe.id,
        selectedVersion.id,
        user.id,
        user.username,
      );
      const updatedRecipe = await api.getRecipe(selectedRecipe.id);
      setSelectedRecipe(updatedRecipe);
      setRecipes(recipes.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r)));
      setSelectedVersion(rollbackVersion);
      setCurrentContent(rollbackVersion.content);
      alert(`回滚成功！已创建版本 ${rollbackVersion.version}`);
    } catch (err) {
      alert('回滚失败');
    }
  };

  const handleDiff = async (v1: RecipeVersion, v2: RecipeVersion): Promise<VersionDiff | null> => {
    if (!selectedRecipe) return null;
    try {
      return await api.getVersionDiff(selectedRecipe.id, v1.id, v2.id);
    } catch (err) {
      console.error('获取差异失败', err);
      return null;
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: '#8b4513',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.15s ease',
    fontWeight: '500',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f5deb3',
    color: '#3e2723',
  };

  const buttonHoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1.05)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = 'none';
    },
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'scale(1)';
    },
  };

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <div
                style={{
                  minHeight: '100vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fdf5e6',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#fff',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    width: '400px',
                  }}
                >
                  <h1 style={{ color: '#8b4513', textAlign: 'center', marginBottom: '8px' }}>
                    🍳 食谱版本管理
                  </h1>
                  <p style={{ color: '#8d6e63', textAlign: 'center', marginBottom: '32px' }}>
                    像管理代码一样管理你的食谱
                  </p>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div
                      id="login-tab"
                      style={{
                        flex: 1,
                        padding: '10px',
                        textAlign: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: '#f5deb3',
                        color: '#3e2723',
                        fontWeight: 'bold',
                      }}
                    >
                      登录
                    </div>
                    <div
                      id="register-tab"
                      style={{
                        flex: 1,
                        padding: '10px',
                        textAlign: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                        color: '#8d6e63',
                      }}
                      onClick={() => {
                        const loginTab = document.getElementById('login-tab');
                        const registerTab = document.getElementById('register-tab');
                        const loginForm = document.getElementById('login-form');
                        const registerForm = document.getElementById('register-form');
                        if (loginTab && registerTab && loginForm && registerForm) {
                          loginTab.style.backgroundColor = 'transparent';
                          loginTab.style.color = '#8d6e63';
                          loginTab.style.fontWeight = 'normal';
                          registerTab.style.backgroundColor = '#f5deb3';
                          registerTab.style.color = '#3e2723';
                          registerTab.style.fontWeight = 'bold';
                          loginForm.style.display = 'none';
                          registerForm.style.display = 'block';
                        }
                      }}
                    >
                      注册
                    </div>
                  </div>

                  <form id="login-form" onSubmit={handleLogin} style={{ display: 'block' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', color: '#3e2723', fontSize: '14px' }}>
                        用户名
                      </label>
                      <input
                        name="username"
                        type="text"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d7ccc8',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                        placeholder="请输入用户名"
                      />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', color: '#3e2723', fontSize: '14px' }}>
                        密码
                      </label>
                      <input
                        name="password"
                        type="password"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d7ccc8',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                        placeholder="请输入密码"
                      />
                    </div>
                    <button
                      type="submit"
                      style={{ ...buttonStyle, width: '100%', padding: '12px' }}
                      {...buttonHoverHandlers}
                    >
                      登录
                    </button>
                  </form>

                  <form
                    id="register-form"
                    onSubmit={handleRegister}
                    style={{ display: 'none' }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', color: '#3e2723', fontSize: '14px' }}>
                        用户名
                      </label>
                      <input
                        name="username"
                        type="text"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d7ccc8',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                        placeholder="请输入用户名"
                      />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', color: '#3e2723', fontSize: '14px' }}>
                        密码
                      </label>
                      <input
                        name="password"
                        type="password"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d7ccc8',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                        placeholder="请输入密码"
                      />
                    </div>
                    <button
                      type="submit"
                      style={{ ...buttonStyle, width: '100%', padding: '12px' }}
                      {...buttonHoverHandlers}
                    >
                      注册
                    </button>
                  </form>
                </div>
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', backgroundColor: '#fdf5e6' }}>
        <nav
          style={{
            height: '60px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                padding: '6px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'none',
                '@media (maxWidth: 768px)': { display: 'block' },
              } as React.CSSProperties}
            >
              ☰
            </button>
            <h1 style={{ color: '#8b4513', fontSize: '20px' }}>🍳 食谱版本管理</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#5d4037' }}>欢迎, {user.username}</span>
            <button
              onClick={handleLogout}
              style={{ ...secondaryButtonStyle, padding: '6px 14px', fontSize: '13px' }}
              {...buttonHoverHandlers}
            >
              退出登录
            </button>
          </div>
        </nav>

        <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>
          <div
            style={{
              width: '280px',
              backgroundColor: '#fff8e7',
              borderRadius: '8px',
              margin: '16px',
              padding: '16px',
              position: 'sticky',
              top: '76px',
              alignSelf: 'flex-start',
              maxHeight: 'calc(100vh - 92px)',
              overflowY: 'auto',
              transition: 'transform 0.3s ease',
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              '@media (maxWidth: 768px)': {
                position: 'fixed',
                left: 0,
                top: '60px',
                zIndex: 99,
                height: 'calc(100vh - 60px)',
                margin: 0,
                borderRadius: 0,
                maxHeight: 'none',
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                boxShadow: sidebarOpen ? '4px 0 12px rgba(0,0,0,0.1)' : 'none',
              } as React.CSSProperties,
            }}
          >
            <button
              onClick={handleCreateRecipe}
              style={{ ...buttonStyle, width: '100%', marginBottom: '16px' }}
              {...buttonHoverHandlers}
            >
              + 创建新食谱
            </button>

            <h3 style={{ color: '#3e2723', marginBottom: '12px', fontSize: '16px' }}>
              我的食谱 ({recipes.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipes.map((recipe) => {
                const isSelected = selectedRecipe?.id === recipe.id;
                return (
                  <div
                    key={recipe.id}
                    onClick={() => handleSelectRecipe(recipe)}
                    style={{
                      padding: '12px',
                      backgroundColor: isSelected ? '#ffe0b2' : 'transparent',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: isSelected ? '1px solid #ffb74d' : '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#fff3e0';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#3e2723', marginBottom: '4px' }}>
                      {recipe.versions[0]?.content.name || '未命名食谱'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8d6e63' }}>
                      {recipe.versions.length} 个版本
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1887f', marginTop: '2px' }}>
                      更新于 {dayjs(recipe.updatedAt).format('MM-DD HH:mm')}
                    </div>
                  </div>
                );
              })}
              {recipes.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                  还没有食谱，点击上方按钮创建
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, padding: '16px', minWidth: 0 }}>
            {(selectedRecipe || isCreating) ? (
              <>
                <div
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setViewMode('editor')}
                      style={{
                        ...buttonStyle,
                        backgroundColor: viewMode === 'editor' ? '#8b4513' : '#f5deb3',
                        color: viewMode === 'editor' ? '#fff' : '#3e2723',
                        padding: '6px 14px',
                        fontSize: '13px',
                      }}
                      {...buttonHoverHandlers}
                    >
                      ✏️ 编辑器
                    </button>
                    {!isCreating && (
                      <>
                        <button
                          onClick={() => setViewMode('graph')}
                          style={{
                            ...buttonStyle,
                            backgroundColor: viewMode === 'graph' ? '#8b4513' : '#f5deb3',
                            color: viewMode === 'graph' ? '#fff' : '#3e2723',
                            padding: '6px 14px',
                            fontSize: '13px',
                          }}
                          {...buttonHoverHandlers}
                        >
                          🌳 版本图
                        </button>
                        <button
                          onClick={() => setViewMode('card')}
                          style={{
                            ...buttonStyle,
                            backgroundColor: viewMode === 'card' ? '#8b4513' : '#f5deb3',
                            color: viewMode === 'card' ? '#fff' : '#3e2723',
                            padding: '6px 14px',
                            fontSize: '13px',
                          }}
                          {...buttonHoverHandlers}
                        >
                          🎴 食谱卡
                        </button>
                      </>
                    )}
                  </div>

                  {viewMode === 'editor' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {isCreating ? (
                        <button
                          onClick={handleSaveNewRecipe}
                          style={{ ...buttonStyle, padding: '6px 16px' }}
                          {...buttonHoverHandlers}
                        >
                          💾 创建食谱 (v1)
                        </button>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            placeholder="提交信息..."
                            style={{
                              padding: '6px 10px',
                              border: '1px solid #d7ccc8',
                              borderRadius: '8px',
                              fontSize: '13px',
                              outline: 'none',
                              width: '180px',
                            }}
                          />
                          <button
                            onClick={handleSaveVersion}
                            style={{ ...buttonStyle, padding: '6px 16px' }}
                            {...buttonHoverHandlers}
                          >
                            💾 保存新版本
                          </button>
                          <button
                            onClick={() => setShowBranchDialog(true)}
                            style={{ ...secondaryButtonStyle, padding: '6px 16px' }}
                            {...buttonHoverHandlers}
                          >
                            🌿 创建分支
                          </button>
                          <button
                            onClick={() => setShowMergeDialog(true)}
                            style={{ ...secondaryButtonStyle, padding: '6px 16px' }}
                            {...buttonHoverHandlers}
                          >
                            🔀 合并
                          </button>
                          <button
                            onClick={handleRollback}
                            style={{ ...secondaryButtonStyle, padding: '6px 16px' }}
                            {...buttonHoverHandlers}
                          >
                            ⏪ 回滚到此版本
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!isCreating && selectedVersion && (
                  <div
                    style={{
                      backgroundColor: '#fff8e7',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      color: '#5d4037',
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span><strong>版本:</strong> {selectedVersion.version}</span>
                    <span><strong>分支:</strong> {selectedVersion.branch}</span>
                    <span><strong>作者:</strong> {selectedVersion.authorName}</span>
                    <span><strong>时间:</strong> {dayjs(selectedVersion.timestamp).format('YYYY-MM-DD HH:mm')}</span>
                    {selectedVersion.message && <span><strong>说明:</strong> {selectedVersion.message}</span>}
                  </div>
                )}

                <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                  {viewMode === 'editor' && (
                    <RecipeEditor
                      initialContent={currentContent}
                      onContentChange={setCurrentContent}
                      readOnly={false}
                    />
                  )}
                  {viewMode === 'graph' && selectedRecipe && (
                    <VersionGraph
                      versions={selectedRecipe.versions}
                      onDiff={handleDiff}
                      onSelectVersion={(v) => {
                        setSelectedVersion(v);
                        setCurrentContent(v.content);
                      }}
                    />
                  )}
                  {viewMode === 'card' && selectedVersion && (
                    <RecipeCard version={selectedVersion} />
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  color: '#8d6e63',
                }}
              >
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🍳</div>
                <h2 style={{ color: '#5d4037', marginBottom: '8px' }}>选择或创建一个食谱</h2>
                <p>从左侧列表选择食谱，或点击"创建新食谱"开始</p>
              </div>
            )}
          </div>
        </div>

        {showBranchDialog && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowBranchDialog(false)}
          >
            <div
              style={{
                backgroundColor: '#fff',
                padding: '24px',
                borderRadius: '12px',
                width: '360px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: '#3e2723', marginBottom: '16px' }}>创建分支</h3>
              <p style={{ fontSize: '13px', color: '#5d4037', marginBottom: '12px' }}>
                从版本 {selectedVersion?.version} 创建新分支
              </p>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="分支名称（如：feature-spicy）"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d7ccc8',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowBranchDialog(false)}
                  style={{ ...secondaryButtonStyle, padding: '8px 16px' }}
                  {...buttonHoverHandlers}
                >
                  取消
                </button>
                <button
                  onClick={handleCreateBranch}
                  style={{ ...buttonStyle, padding: '8px 16px' }}
                  {...buttonHoverHandlers}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        {showMergeDialog && selectedRecipe && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowMergeDialog(false)}
          >
            <div
              style={{
                backgroundColor: '#fff',
                padding: '24px',
                borderRadius: '12px',
                width: '400px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: '#3e2723', marginBottom: '16px' }}>合并版本</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#3e2723' }}>
                  目标版本（合并到）
                </label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d7ccc8',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="">请选择目标版本</option>
                  {selectedRecipe.versions
                    .filter((v) => v.branch === 'main')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.version} - {v.message || v.branch}
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#3e2723' }}>
                  源版本（被合并）
                </label>
                <select
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d7ccc8',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="">请选择源版本</option>
                  {selectedRecipe.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version} ({v.branch}) - {v.message || '无说明'}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowMergeDialog(false)}
                  style={{ ...secondaryButtonStyle, padding: '8px 16px' }}
                  {...buttonHoverHandlers}
                >
                  取消
                </button>
                <button
                  onClick={handleMerge}
                  style={{ ...buttonStyle, padding: '8px 16px' }}
                  {...buttonHoverHandlers}
                >
                  合并
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
};

export default App;
