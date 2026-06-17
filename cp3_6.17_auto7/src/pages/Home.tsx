import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import AuthForm from '@/components/AuthForm';
import Navbar from '@/components/Navbar';
import RecipeList from '@/components/RecipeList';
import RecipeEditor from '@/components/RecipeEditor';
import VersionGraph from '@/components/VersionGraph';
import type { Recipe, Version } from '@/types';

export default function Home() {
  const { user, getRecipes, getVersions, createRecipe } = useApi();
  const navigate = useNavigate();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user]);

  useEffect(() => {
    if (selectedRecipeId) {
      loadVersions(selectedRecipeId);
    } else {
      setVersions([]);
    }
  }, [selectedRecipeId]);

  const loadRecipes = async () => {
    try {
      const data = await getRecipes();
      setRecipes(data);
      if (data.length > 0 && !selectedRecipeId) {
        setSelectedRecipeId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load recipes:', err);
    }
  };

  const loadVersions = async (recipeId: string) => {
    try {
      const data = await getVersions(recipeId);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  };

  const handleCreateRecipe = async () => {
    if (!newRecipeName.trim()) {
      setError('请输入食谱名称');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newRecipe = await createRecipe({
        name: newRecipeName.trim(),
        ingredients: [],
        steps: [],
        notes: '',
        commitMessage: '创建食谱',
      });
      setRecipes([...recipes, newRecipe]);
      setSelectedRecipeId(newRecipe.id);
      setShowCreateDialog(false);
      setNewRecipeName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || null;
  const selectedVersion = versions.length > 0 ? versions[0] : null;

  if (!user) {
    return (
      <AuthForm
        mode="login"
        onSuccess={() => navigate('/')}
        onSwitchMode={() => navigate('/register')}
      />
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          marginTop: 60,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 280,
            flexShrink: 0,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s',
            position: 'fixed',
            left: 0,
            top: 60,
            bottom: 0,
            zIndex: 50,
          }}
          className="sidebar-mobile"
        >
          <RecipeList
            recipes={recipes}
            selectedRecipeId={selectedRecipeId}
            onSelectRecipe={(id) => {
              setSelectedRecipeId(id);
              setSidebarOpen(false);
            }}
            onCreateNew={() => setShowCreateDialog(true)}
          />
        </div>

        <div
          style={{ width: 280, flexShrink: 0 }}
          className="sidebar-desktop"
        >
          <RecipeList
            recipes={recipes}
            selectedRecipeId={selectedRecipeId}
            onSelectRecipe={setSelectedRecipeId}
            onCreateNew={() => setShowCreateDialog(true)}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <RecipeEditor recipe={selectedRecipe} version={selectedVersion} />
          </div>
        </div>

        <div style={{ width: 320, flexShrink: 0 }}>
          <VersionGraph versions={versions} />
        </div>
      </div>

      {showCreateDialog && (
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
            zIndex: 200,
          }}
          onClick={() => setShowCreateDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 24,
              width: 360,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--secondary)',
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              新建食谱
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: '#333',
                }}
              >
                食谱名称
              </label>
              <input
                type="text"
                value={newRecipeName}
                onChange={(e) => setNewRecipeName(e.target.value)}
                placeholder="请输入食谱名称"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
            {error && (
              <div style={{ color: 'red', fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewRecipeName('');
                  setError('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateRecipe}
                className="btn"
                disabled={loading}
                style={{
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sidebar-desktop {
          display: block;
        }
        .sidebar-mobile {
          display: none;
        }
        @media (max-width: 768px) {
          .sidebar-desktop {
            display: none;
          }
          .sidebar-mobile {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
