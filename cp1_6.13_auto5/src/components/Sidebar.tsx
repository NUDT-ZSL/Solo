import { useState, useEffect } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import type { Recipe, Ingredient } from '../types'

interface SidebarProps {
  selectedRecipeId: string | null
  onSelectRecipe: (recipe: Recipe) => void
  onOpenInventory: () => void
}

export default function Sidebar({ selectedRecipeId, onSelectRecipe, onOpenInventory }: SidebarProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [inventory, setInventory] = useState<Ingredient[]>([])
  const [activeTab, setActiveTab] = useState<'recommend' | 'my'>('recommend')

  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data))
      .catch(err => console.error('Failed to fetch recipes:', err))

    fetch('/api/inventory')
      .then(res => res.json())
      .then(data => setInventory(data))
      .catch(err => console.error('Failed to fetch inventory:', err))
  }, [])

  const recommendedRecipes = recipes.filter(r => !r.isUserCreated)
  const myRecipes = recipes.filter(r => r.isUserCreated)
  const displayRecipes = activeTab === 'recommend' ? recommendedRecipes : myRecipes

  const getExpireDays = (dateStr: string) => {
    return differenceInDays(parseISO(dateStr), new Date())
  }

  const handleInventoryUpdate = () => {
    fetch('/api/inventory')
      .then(res => res.json())
      .then(data => setInventory(data))
  }

  useEffect(() => {
    const handleRefresh = () => handleInventoryUpdate()
    window.addEventListener('inventory-updated', handleRefresh)
    return () => window.removeEventListener('inventory-updated', handleRefresh)
  }, [])

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoSection}>
        <h1 style={styles.logoText}>🥬 Reciptify</h1>
        <p style={styles.logoSubtitle}>智能食材管家</p>
      </div>

      <div style={styles.tabBar}>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'recommend' ? styles.tabBtnActive : {}),
          }}
