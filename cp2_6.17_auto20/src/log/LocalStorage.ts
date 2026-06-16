export interface EmotionLogEntry {
  id: string
  timestamp: number
  emotionValue: number
  emoji?: string
  note?: string
}

const STORAGE_KEY = 'emotion_clock_logs'

export function saveEmotionLog(entry: EmotionLogEntry): void {
  try {
    const logs = getAllEmotionLogs()
    logs.push(entry)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch (e) {
    console.error('Failed to save emotion log:', e)
  }
}

export function getAllEmotionLogs(): EmotionLogEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    const logs = JSON.parse(data) as EmotionLogEntry[]
    return logs.sort((a, b) => b.timestamp - a.timestamp)
  } catch (e) {
    console.error('Failed to read emotion logs:', e)
    return []
  }
}

export function getEmotionLogsByDate(date: Date): EmotionLogEntry[] {
  const logs = getAllEmotionLogs()
  const dateStr = date.toISOString().split('T')[0]
  
  return logs.filter((log) => {
    const logDate = new Date(log.timestamp).toISOString().split('T')[0]
    return logDate === dateStr
  })
}

export function getRecentLogs(days: number = 7): EmotionLogEntry[] {
  const logs = getAllEmotionLogs()
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000
  
  return logs.filter((log) => log.timestamp >= cutoffTime)
}

export function deleteEmotionLog(id: string): void {
  try {
    const logs = getAllEmotionLogs()
    const filtered = logs.filter((log) => log.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.error('Failed to delete emotion log:', e)
  }
}

export function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
