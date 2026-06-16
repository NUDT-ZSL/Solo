import { useState } from 'react'
import GameBoard from './modules/game/GameBoard'
import RecipeBook from './modules/game/RecipeBook'

export default function App() {
  const [showBook, setShowBook] = useState(false)
  const [unlockedRecipes, setUnlockedRecipes] = useState<Set<string>>(new Set())

  const handleUnlock = (recipeId: string) => {
    setUnlockedRecipes((prev) => {
      if (prev.has(recipeId)) return prev
      const next = new Set(prev)
      next.add(recipeId)
      return next
    })
  }

  return (
    <>
      <GameBoard
        onOpenBook={() => setShowBook(true)}
        onUnlockRecipe={handleUnlock}
      />
      {showBook && (
        <RecipeBook
          unlocked={unlockedRecipes}
          onClose={() => setShowBook(false)}
        />
      )}
    </>
  )
}
