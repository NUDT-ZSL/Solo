import type { TimeSlot, Conflict, PlayLog, WeeklyStat } from '@/types'

export function checkConflict(
  newSlot: TimeSlot,
  existingSlots: TimeSlot[]
): Conflict[] {
  const conflicts: Conflict[] = []

  for (const slot of existingSlots) {
    if (slot.dayOfWeek !== newSlot.dayOfWeek) continue

    const newStart = timeToMinutes(newSlot.startTime)
    const newEnd = timeToMinutes(newSlot.endTime)
    const existStart = timeToMinutes(slot.startTime)
    const existEnd = timeToMinutes(slot.endTime)

    if (newStart < existEnd && newEnd > existStart) {
      conflicts.push({
        courseName: `课程 (${slot.startTime}-${slot.endTime})`,
        time: `${slot.startTime}-${slot.endTime}`,
      })
    }
  }

  return conflicts
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function getWeeklyStats(logs: PlayLog[]): Record<string, number> {
  const stats: Record<string, number> = {}

  for (const log of logs) {
    if (!stats[log.date]) {
      stats[log.date] = 0
    }
    stats[log.date] += log.duration
  }

  return stats
}

export function getLast7DaysStats(logs: PlayLog[]): WeeklyStat[] {
  const stats = getWeeklyStats(logs)
  const result: WeeklyStat[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({
      date: dateStr,
      totalMinutes: stats[dateStr] || 0,
    })
  }

  return result
}
