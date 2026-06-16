import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { GameBoard } from './components/GameBoard';
import { useGameRecords, Category, Recipe, GameRecord, GameStats } from './hooks/useGameRecords';
import './styles/global.css';

function Navbar() {
  const navigate = useNavigate();
  const { fetchGameStats } = useGameRecords();
  const [stats, setStats] = useState<GameStats>({ totalGames: 0, averageAccuracy: 0, highestScore: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchGameStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };
    loadStats();
  }, [fetchGameStats]);

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-icon">🍳</span>
          <span>烹饪音效配对游戏</span>
        </Link>
        
        <div className="navbar-stats">
          <div className="stat-item">
            <span className="stat-label">总场次</span>
            <span className="stat-value">{stats.totalGames}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">平均正确率</span>
            <span className="stat-value">{Math.round(stats.averageAccuracy)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最高分</span>
            <span className="stat-value">{stats.highestScore}</span>
          </div>
        </div>
        
        <div className="navbar-profile" onClick={() => navigate('/profile')}>
          <div className="avatar">👤</div>
        </div>
        
        <button 
          className="hamburger" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
      </nav>
      
      {mobileMenuOpen && (
        <div className="mobile-menu active">
          <div className="stat-item" style={{ marginBottom: 16 }}>
            <span className="stat-label">总场次</span>
            <span className="stat-value">{stats.totalGames}</span>
          </div>
          <div className="stat-item" style={{ marginBottom: 16 }}>
            <span className="stat-label">平均正确率</span>
            <span className="stat-value">{Math.round(stats.averageAccuracy)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最高分</span>
            <span className="stat-value">{stats.highestScore}</span>
          </div>
        </div>
      )}
    </>
  );
}

function HomePage() {
  const { fetchCategories, loading } = useGameRecords();
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, [fetchCategories]);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">🎮 选择菜系</h1>
        <p className="page-subtitle">选择你感兴趣的菜系，开始烹饪音效配对游戏</p>
        
        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : (
          <div className="category-grid">
            {categories.map((category) => (
              <div
                key={category.id}
                className="category-card"
                onClick={() => navigate(`/game/${category.id}`)}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecipeListPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { fetchRecipes, fetchCategories, loading } = useGameRecords();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (category) {
          const [recipesData, categoriesData] = await Promise.all([
            fetchRecipes(category),
            fetchCategories(),
          ]);
          setRecipes(recipesData);
          const cat = categoriesData.find((c) => c.id === category);
          if (cat) setCategoryName(cat.name);
        }
      } catch (err) {
        console.error('Failed to load recipes:', err);
      }
    };
    loadData();
  }, [category, fetchRecipes, fetchCategories]);

  return (
    <div className="page">
      <div className="container">
        <Link to="/" className="back-link">
          ← 返回首页
        </Link>
        <h1 className="page-title">🍽️ {categoryName}</h1>
        <p className="page-subtitle">选择一道菜品开始游戏</p>
        
        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : (
          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="recipe-card"
                onClick={() => navigate(`/game/${category}/recipe/${recipe.id}`)}
              >
                <img
                  src={recipe.thumbnail}
                  alt={recipe.name}
                  className="recipe-thumbnail"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="recipe-name">{recipe.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GamePage() {
  const { category, id } = useParams<{ category: string; id: string }>();
  const navigate = useNavigate();
  const { fetchRecipe, loading } = useGameRecords();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const loadRecipe = async () => {
      if (id) {
        try {
          const data = await fetchRecipe(id);
          setRecipe(data);
        } catch (err) {
          console.error('Failed to load recipe:', err);
        }
      }
    };
    loadRecipe();
  }, [id, fetchRecipe]);

  return (
    <div className="page">
      <div className="container">
        <Link to={`/game/${category}`} className="back-link">
          ← 返回菜品列表
        </Link>
        
        {loading || !recipe ? (
          <div className="empty-state">加载中...</div>
        ) : (
          <GameBoard recipe={recipe} category={category!} />
        )}
      </div>
    </div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const { fetchGameRecords, fetchGameStats, loading } = useGameRecords();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [stats, setStats] = useState<GameStats>({ totalGames: 0, averageAccuracy: 0, highestScore: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [recordsData, statsData] = await Promise.all([
          fetchGameRecords(),
          fetchGameStats(),
        ]);
        setRecords(recordsData.slice(0, 10).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
        setStats(statsData);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      }
    };
    loadData();
  }, [fetchGameRecords, fetchGameStats]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="page">
      <div className="container profile-container">
        <Link to="/" className="back-link">
          ← 返回首页
        </Link>
        <h1 className="page-title">👤 个人中心</h1>
        <p className="page-subtitle">查看你的游戏统计和历史记录</p>
        
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-card-value">{stats.totalGames}</div>
            <div className="stat-card-label">总场次</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{Math.round(stats.averageAccuracy)}%</div>
            <div className="stat-card-label">平均正确率</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.highestScore}</div>
            <div className="stat-card-label">最高分</div>
          </div>
        </div>
        
        <h2 className="page-title" style={{ fontSize: 20, marginBottom: 16 }}>
          📋 最近游戏记录
        </h2>
        
        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            还没有游戏记录，快去玩一局吧！
          </div>
        ) : (
          <div className="records-table-container">
            <table className="records-table">
              <thead>
                <tr>
                  <th>菜品名</th>
                  <th>用时</th>
                  <th>得分</th>
                  <th>正确率</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.recipeName}</td>
                    <td>{record.timeUsed}s</td>
                    <td style={{ fontWeight: 600, color: '#f97316' }}>
                      {record.score}
                    </td>
                    <td>{Math.round(record.accuracy)}%</td>
                    <td>{formatDate(record.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:category" element={<RecipeListPage />} />
          <Route path="/game/:category/recipe/:id" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </div>
    </Router>
  );
}
