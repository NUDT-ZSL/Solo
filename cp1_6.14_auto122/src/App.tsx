import { useState, useEffect, useCallback, useMemo } from 'react'
import { get, post, put } from './http'
import FoodModule from './FoodModule'
import StatsModule from './StatsModule'
import type { FoodItem, MealTemplate, DailyLog, UserGoals, MealType, WeeklyTrend } from './types'
import './styles.css'

function App() {
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null)
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [goals, setGoals] = useState<UserGoals | null>(null)
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([])
  const [showGoalsModal, setShowGoalsModal] = useState(false)
  const [goalForm, setGoalForm] = useState({
    age: 30,
    gender: 'male' as 'male' | 'female',
    height: 175,
    weight: 70,
    activityLevel: 1.55,
  })
  const [isLoading, setIsLoading] = useState(true)

  const calculateBMR = useCallback(
    (data: { age: number; gender: 'male' | 'female'; height: number; weight: number; activityLevel: number }) => {
      let bmr: number
      if (data.gender === 'male') {
        bmr = 88.362 + 13.397 * data.weight + 4.799 * data.height - 5.677 * data.age
      } else {
        bmr = 447.593 + 9.247 * data.weight + 3.098 * data.height - 4.33 * data.age
      }

      const recommendedCalories = bmr * data.activityLevel
      const recommendedProtein = data.weight * 1.6
      const recommendedCarbs = data.weight * 5
      const recommendedFat = data.weight * 0.8

      return {
        ...data,
        bmr: Math.round(bmr),
        recommendedCalories: Math.round(recommendedCalories),
        recommendedProtein: Math.round(recommendedProtein),
        recommendedCarbs: Math.round(recommendedCarbs),
        recommendedFat: Math.round(recommendedFat),
      }
    },
    []
  )

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesData, logData, goalsData, trendData] = await Promise.all([
          get<MealTemplate[]>('/api/templates'),
          get<DailyLog>('/api/log'),
          get<UserGoals>('/api/goals'),
          get<WeeklyTrend[]>('/api/trend/weekly'),
        ])
        setTemplates(templatesData)
        setDailyLog(logData)
        setGoals(goalsData)
        setWeeklyTrend(trendData)
        setGoalForm({
          age: goalsData.age,
          gender: goalsData.gender,
          height: goalsData.height,
          weight: goalsData.weight,
          activityLevel: goalsData.activityLevel,
        })
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const addTemplateToLog = useCallback(
    async (template: MealTemplate) => {
      if (!dailyLog) return

      try {
        const foodsWithIds = template.foods.map((food) => ({
          ...food,
          id: `${food.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }))

        await post<DailyLog>(`/api/log/${template.type}`, { foods: foodsWithIds })

        const updatedLog = {
          ...dailyLog,
          meals: {
            ...dailyLog.meals,
            [template.type]: [...dailyLog.meals[template.type], ...foodsWithIds],
          },
        }
        setDailyLog(updatedLog)

        const totals = getDailyTotal(updatedLog)
        setWeeklyTrend((prev) => {
          const newTrend = [...prev]
          newTrend[newTrend.length - 1] = {
            ...newTrend[newTrend.length - 1],
            calories: totals.calories,
          }
          return newTrend
        })
      } catch (error) {
        console.error('Failed to add template:', error)
      }
    },
    [dailyLog]
  )

  const addCustomFood = useCallback(
    async (food: FoodItem, mealType: MealType) => {
      if (!dailyLog) return

      try {
        const foodWithId = {
          ...food,
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }

        await post<DailyLog>(`/api/log/${mealType}`, { foods: [foodWithId] })

        const updatedLog = {
          ...dailyLog,
          meals: {
            ...dailyLog.meals,
            [mealType]: [...dailyLog.meals[mealType], foodWithId],
          },
        }
        setDailyLog(updatedLog)

        const totals = getDailyTotal(updatedLog)
        setWeeklyTrend((prev) => {
          const newTrend = [...prev]
          newTrend[newTrend.length - 1] = {
            ...newTrend[newTrend.length - 1],
            calories: totals.calories,
          }
          return newTrend
        })
      } catch (error) {
        console.error('Failed to add custom food:', error)
      }
    },
    [dailyLog]
  )

  const removeFood = useCallback(
    async (mealType: MealType, foodId: string) => {
      if (!dailyLog) return

      try {
        const response = await fetch(`http://localhost:3001/api/log/${mealType}/${foodId}`, {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete')

        const updatedLog = {
          ...dailyLog,
          meals: {
            ...dailyLog.meals,
            [mealType]: dailyLog.meals[mealType].filter((f) => f.id !== foodId),
          },
        }
        setDailyLog(updatedLog)

        const totals = getDailyTotal(updatedLog)
        setWeeklyTrend((prev) => {
          const newTrend = [...prev]
          newTrend[newTrend.length - 1] = {
            ...newTrend[newTrend.length - 1],
            calories: totals.calories,
          }
          return newTrend
        })
      } catch (error) {
        console.error('Failed to remove food:', error)
      }
    },
    [dailyLog]
  )

  const moveFood = useCallback(
    async (foodId: string, fromMeal: MealType, toMeal: MealType) => {
      if (!dailyLog || fromMeal === toMeal) return

      try {
        const response = await fetch('http://localhost:3001/api/log/move', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foodId, fromMeal, toMeal }),
        })
        if (!response.ok) throw new Error('Failed to move')

        const food = dailyLog.meals[fromMeal].find((f) => f.id === foodId)
        if (!food) return

        const updatedLog = {
          ...dailyLog,
          meals: {
            ...dailyLog.meals,
            [fromMeal]: dailyLog.meals[fromMeal].filter((f) => f.id !== foodId),
            [toMeal]: [...dailyLog.meals[toMeal], { ...food, mealType: toMeal }],
          },
        }
        setDailyLog(updatedLog)
      } catch (error) {
        console.error('Failed to move food:', error)
      }
    },
    [dailyLog]
  )

  const handleSaveGoals = useCallback(async () => {
    try {
      const calculatedGoals = calculateBMR(goalForm)
      const updatedGoals = await put<UserGoals>('/api/goals', goalForm)
      setGoals(updatedGoals)
      setShowGoalsModal(false)
    } catch (error) {
      console.error('Failed to save goals:', error)
    }
  }, [goalForm, calculateBMR])

  const dailyTotals = useMemo(() => {
    if (!dailyLog) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    return getDailyTotal(dailyLog)
  }, [dailyLog])

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">🍎 健康饮食规划</h1>
        </div>
        <div className="header-right">
          <button className="goal-btn" onClick={() => setShowGoalsModal(true)}>
            ⚙️ 目标设置
          </button>
        </div>
      </header>

      <div className="app-body">
        <main className="main-content">
          <FoodModule
            templates={templates}
            dailyLog={dailyLog!}
            onAddTemplate={addTemplateToLog}
            onAddCustomFood={addCustomFood}
            onRemoveFood={removeFood}
            onMoveFood={moveFood}
          />
        </main>

        <aside className="stats-panel">
          <StatsModule dailyTotals={dailyTotals} goals={goals!} weeklyTrend={weeklyTrend} />
        </aside>
      </div>

      {showGoalsModal && (
        <div className="modal-overlay" onClick={() => setShowGoalsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>个人目标设置</h2>

            <div className="form-group">
              <label>年龄</label>
              <input
                type="number"
                value={goalForm.age}
                onChange={(e) => setGoalForm({ ...goalForm, age: Number(e.target.value) })}
                min="1"
                max="120"
              />
            </div>

            <div className="form-group">
              <label>性别</label>
              <div className="gender-options">
                <label className={`gender-option ${goalForm.gender === 'male' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={goalForm.gender === 'male'}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, gender: e.target.value as 'male' | 'female' })
                    }
                  />
                  <span>男</span>
                </label>
                <label className={`gender-option ${goalForm.gender === 'female' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={goalForm.gender === 'female'}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, gender: e.target.value as 'male' | 'female' })
                    }
                  />
                  <span>女</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>身高 (cm)</label>
              <input
                type="number"
                value={goalForm.height}
                onChange={(e) => setGoalForm({ ...goalForm, height: Number(e.target.value) })}
                min="100"
                max="250"
              />
            </div>

            <div className="form-group">
              <label>体重 (kg)</label>
              <input
                type="number"
                value={goalForm.weight}
                onChange={(e) => setGoalForm({ ...goalForm, weight: Number(e.target.value) })}
                min="30"
                max="200"
              />
            </div>

            <div className="form-group">
              <label>活动量</label>
              <select
                value={goalForm.activityLevel}
                onChange={(e) => setGoalForm({ ...goalForm, activityLevel: Number(e.target.value) })}
              >
                <option value={1.2}>久坐（很少运动）</option>
                <option value={1.375}>轻度活动（每周1-3天）</option>
                <option value={1.55}>中度活动（每周3-5天）</option>
                <option value={1.725}>高度活动（每周6-7天）</option>
                <option value={1.9}>极高活动（体力劳动+运动）</option>
              </select>
            </div>

            <div className="goals-preview">
              <h4>预计数据</h4>
              <div className="goals-preview-grid">
                <div className="goal-preview-item">
                  <span className="preview-label">基础代谢 (BMR)</span>
                  <span className="preview-value">{calculateBMR(goalForm).bmr} kcal</span>
                </div>
                <div className="goal-preview-item">
                  <span className="preview-label">推荐摄入</span>
                  <span className="preview-value">
                    {calculateBMR(goalForm).recommendedCalories} kcal
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowGoalsModal(false)}>
                取消
              </button>
              <button className="btn-save" onClick={handleSaveGoals}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getDailyTotal(log: DailyLog): {
  calories: number
  protein: number
  carbs: number
  fat: number
} {
  const allFoods = [...log.meals.breakfast, ...log.meals.lunch, ...log.meals.dinner, ...log.meals.snack]
  return allFoods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.calories,
      protein: acc.protein + food.protein,
      carbs: acc.carbs + food.carbs,
      fat: acc.fat + food.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

export default App
