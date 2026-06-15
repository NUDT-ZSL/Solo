export interface GameRecord {
  id?: number
  score: number
  seed: string
  created_at?: string
}

export const recordScore = async (score: number, seed: string): Promise<{ success: boolean; highScore: number }> => {
  try {
    const response = await fetch('/api/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score, seed }),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to record score:', error)
    return { success: false, highScore: score }
  }
}

export const getHighScore = async (): Promise<{ highScore: number }> => {
  try {
    const response = await fetch('/api/highscore')
    return await response.json()
  } catch (error) {
    console.error('Failed to get high score:', error)
    return { highScore: 0 }
  }
}
