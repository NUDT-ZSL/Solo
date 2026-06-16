import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import RecipeCard from '../components/RecipeCard'
import { Recipe, Ingredient, getRecipes, createRecipe } from '../services/api'

const cuisineOptions = [
  { value: 'chinese', label: '中式', color: '#fef3c7' },
  { value: 'western', label: '西式', color: '#dbeafe' },
  { value: 'japanese', label: '日式', color: '#fce7f3' },
  { value: 'fusion', label: '融合', color: '#e0e7ff' }
]

export default function HomePage() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const searchTimerRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCookTime, setNewCookTime] = useState('')
  const [newCuisine, setNewCuisine] = useState<'chinese' | 'western' | 'japanese' | 'fusion'>('chinese')
  const [newIngredients, setNewIngredients] = useState<Ingredient[]>([
    { id: uuidv4(), name: '', quantity: '', unit: '' },
    { id: uuidv4(), name: '', quantity: '', unit: '' },
    { id: uuidv4(), name: '', quantity: '', unit: '' }
  ])

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getRecipes()
      setRecipes(data)
      setFilteredRecipes(data)
    } catch (err) {
      console.error('加载配方失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setFilteredRecipes(recipes)
        return
      }
      const q = query.toLowerCase()
      const filtered = recipes.filter((recipe) => {
        if (recipe.name.toLowerCase().includes(q)) return true
        if (recipe.description.toLowerCase().includes(q)) return true
        if (recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(q)))
          return true
        const cuisineLabel =
          cuisineOptions.find((c) => c.value === recipe.cuisine)?.label || ''
        if (cuisineLabel.includes(q)) return true
        return false
      })
      setFilteredRecipes(filtered)
    },
    [recipes]
  )

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchTimerRef.current = window.setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [searchQuery, handleSearch])

  const addIngredient = () => {
    setNewIngredients([
      ...newIngredients,
      { id: uuidv4(), name: '', quantity: '', unit: '' }
    ])
  }

  const removeIngredient = (id: string) => {
    if (newIngredients.length <= 3) return
    setNewIngredients(newIngredients.filter((ing) => ing.id !== id))
  }

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setNewIngredients(
      newIngredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    )
  }

  const handleCreateRecipe = async () => {
    if (!newName.trim()) {
      alert('请输入菜名')
      return
    }
    const validIngredients = newIngredients.filter((ing) => ing.name.trim())
    if (validIngredients.length < 3) {
      alert('请至少添加3个主要食材')
      return
    }
    if (!newCookTime || parseInt(newCookTime) <= 0) {
      alert('请输入有效的预估耗时')
      return
    }

    try {
      const newRecipe = await createRecipe({
        name: newName.trim(),
        description: newDescription.trim(),
        cookTime: parseInt(newCookTime),
        cuisine: newCuisine,
        ingredients: validIngredients,
        steps: []
      })
      setRecipes([newRecipe, ...recipes])
      setFilteredRecipes([newRecipe, ...filteredRecipes])
      setNewName('')
      setNewDescription('')
      setNewCookTime('')
      setNewCuisine('chinese')
      setNewIngredients([
        { id: uuidv4(), name: '', quantity: '', unit: '' },
        { id: uuidv4(), name: '', quantity: '', unit: '' },
        { id: uuidv4(), name: '', quantity: '', unit: '' }
      ])
    } catch (err) {
      console.error('创建配方失败:', err)
      alert('创建失败，请重试')
    }
  }

  const handleCardClick = (id: string) => {
    navigate(`/recipe/${id}`)
  }

  const hasSearchResults = searchQuery.trim() && filteredRecipes.length === 0

  return (
    <div className="home-page">
      <nav className="navbar">
        <div className="navbar-content">
          <h1 className="navbar-title">🍳 厨房日志</h1>
          <div className="navbar-right">
            <button
              className="search-icon-btn"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="搜索"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            <div className="user-avatar">
              <span>厨</span>
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="search-panel">
            <div className="search-panel-content">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="搜索菜名、食材或菜系..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery.trim() && (
                <div className="search-results">
                  {hasSearchResults ? (
                    <div className="no-results">
                      <div className="chef-icon">
                        <svg viewBox="0 0 100 120" className="chef-svg">
                          <ellipse cx="50" cy="85" rx="30" ry="25" fill="#fef3c7" stroke="#292524" strokeWidth="2"/>
                          <path d="M25 75 Q50 60 75 75 L75 85 L25 85 Z" fill="#ea580c" stroke="#292524" strokeWidth="2"/>
                          <ellipse cx="30" cy="80" rx="8" ry="5" fill="#fff7ed" stroke="#292524" strokeWidth="1.5"/>
                          <ellipse cx="70" cy="80" rx="8" ry="5" fill="#fff7ed" stroke="#292524" strokeWidth="1.5"/>
                          <circle cx="42" cy="78" r="3" fill="#292524"/>
                          <circle cx="58" cy="78" r="3" fill="#292524"/>
                          <path d="M45 88 Q50 92 55 88" fill="none" stroke="#292524" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M35 65 Q50 45 65 65" fill="none" stroke="#292524" strokeWidth="2" strokeLinecap="round"/>
                          <ellipse cx="50" cy="50" rx="15" ry="10" fill="#fff7ed" stroke="#292524" strokeWidth="2"/>
                        </svg>
                      </div>
                      <p>未找到匹配的配方</p>
                      <p className="no-results-hint">尝试重新调整关键词</p>
                    </div>
                  ) : (
                    <div className="search-results-list">
                      {filteredRecipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="search-result-item"
                          onClick={() => {
                            setSearchOpen(false)
                            setSearchQuery('')
                            navigate(`/recipe/${recipe.id}`)
                          }}
                        >
                          <span className="search-result-name">{recipe.name}</span>
                          <span className="search-result-cuisine">
                            {cuisineOptions.find((c) => c.value === recipe.cuisine)?.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="main-content">
        <div className="new-recipe-section">
          <h2 className="section-title">创建新配方</h2>
          <div className="new-recipe-card" style={{ backgroundColor: cuisineOptions.find(c => c.value === newCuisine)?.color }}>
            <div className="form-row">
              <div className="form-group">
                <label>菜名</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="给你的配方起个名字"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>预估耗时（分钟）</label>
                <input
                  type="number"
                  value={newCookTime}
                  onChange={(e) => setNewCookTime(e.target.value)}
                  placeholder="30"
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label>简要描述</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="简单描述这道菜的特点..."
                className="form-textarea"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>菜系标签</label>
              <div className="cuisine-tags">
                {cuisineOptions.map((cuisine) => (
                  <button
                    key={cuisine.value}
                    className={`cuisine-tag ${newCuisine === cuisine.value ? 'active' : ''}`}
                    style={{ backgroundColor: newCuisine === cuisine.value ? '#ea580c' : cuisine.color, color: newCuisine === cuisine.value ? 'white' : '#292524' }}
                    onClick={() => setNewCuisine(cuisine.value as typeof newCuisine)}
                  >
                    {cuisine.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>主要食材（至少3个）</label>
              <div className="ingredients-list">
                {newIngredients.map((ing, index) => (
                  <div key={ing.id} className="ingredient-row">
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                      placeholder={`食材 ${index + 1}`}
                      className="form-input ingredient-name"
                    />
                    <input
                      type="text"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                      placeholder="数量"
                      className="form-input ingredient-quantity"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                      placeholder="单位"
                      className="form-input ingredient-unit"
                    />
                    <button
                      className="ingredient-delete"
                      onClick={() => removeIngredient(ing.id)}
                      disabled={newIngredients.length <= 3}
                      aria-label="删除食材"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-add-ingredient" onClick={addIngredient}>
                + 添加食材
              </button>
            </div>
            <button className="btn-create" onClick={handleCreateRecipe}>
              创建配方
            </button>
          </div>
        </div>

        <div className="recipes-section">
          <h2 className="section-title">我的配方</h2>
          {loading ? (
            <div className="loading">加载中...</div>
          ) : recipes.length === 0 ? (
            <div className="empty-state">
              <p>还没有配方，开始创建你的第一个实验配方吧！</p>
            </div>
          ) : (
            <div className="recipe-grid">
              {(searchQuery.trim() ? filteredRecipes : recipes).map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => handleCardClick(recipe.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
