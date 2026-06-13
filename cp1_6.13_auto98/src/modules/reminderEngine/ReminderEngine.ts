export type PlantStatus = 'healthy' | 'thirsty' | 'hungry' | 'sick'
export type OperationType = 'water' | 'fertilize' | 'repot' | 'prune' | 'other'
export type PlantLocation = 'indoor' | 'balcony' | 'garden'

export interface Plant {
  _id?: string
  name: string
  variety: string
  plantDate: string
  location: PlantLocation
  status: PlantStatus
  createdAt: string
  updatedAt: string
  coverPhoto?: string
}

export interface Operation {
  _id?: string
  plantId: string
  type: OperationType
  note?: string
  date: string
  createdAt: string
}

export type ReminderType = 'water' | 'fertilize' | 'prune' | 'repot'

export interface Reminder {
  id: string
  plantId: string
  plantName: string
  type: ReminderType
  priority: number
  message: string
  overdueDays: number
  dueDate: string
}

interface VarietyConfig {
  waterIntervalDays: number
  fertilizeIntervalDays: number
  pruneIntervalDays: number
  repotIntervalDays: number
}

const defaultConfig: VarietyConfig = {
  waterIntervalDays: 3,
  fertilizeIntervalDays: 30,
  pruneIntervalDays: 60,
  repotIntervalDays: 365
}

const varietyConfigs: Record<string, Partial<VarietyConfig>> = {
  '多肉': { waterIntervalDays: 7, fertilizeIntervalDays: 45 },
  '仙人掌': { waterIntervalDays: 10, fertilizeIntervalDays: 60 },
  '绿萝': { waterIntervalDays: 4, fertilizeIntervalDays: 25 },
  '君子兰': { waterIntervalDays: 5, fertilizeIntervalDays: 20 },
  '月季': { waterIntervalDays: 2, fertilizeIntervalDays: 14 },
  '玫瑰': { waterIntervalDays: 2, fertilizeIntervalDays: 14 },
  '番茄': { waterIntervalDays: 1, fertilizeIntervalDays: 10 },
  '辣椒': { waterIntervalDays: 1, fertilizeIntervalDays: 15 },
  '薄荷': { waterIntervalDays: 2, fertilizeIntervalDays: 20 },
  '兰花': { waterIntervalDays: 5, fertilizeIntervalDays: 30 },
  '茉莉': { waterIntervalDays: 2, fertilizeIntervalDays: 20 },
  '草莓': { waterIntervalDays: 1, fertilizeIntervalDays: 10 }
}

const locationWaterModifier: Record<PlantLocation, number> = {
  indoor: 1.2,
  balcony: 1.0,
  garden: 0.7
}

function getVarietyConfig(variety: string): VarietyConfig {
  const matchedKey = Object.keys(varietyConfigs).find(key =>
    variety.includes(key)
  )
  return { ...defaultConfig, ...(matchedKey ? varietyConfigs[matchedKey] : {}) }
}

function getLastOperationByType(operations: Operation[], type: OperationType): Operation | null {
  const filtered = operations
    .filter(op => op.type === type)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return filtered.length > 0 ? filtered[0] : null
}

function calculateDaysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((date1.getTime() - date2.getTime()) / msPerDay)
}

export function computeReminders(
  plants: Plant[],
  operations: Operation[],
  now: Date = new Date()
): Reminder[] {
  const reminders: Reminder[] = []

  for (const plant of plants) {
    const config = getVarietyConfig(plant.variety)
    const plantOps = operations.filter(op => op.plantId === plant._id)
    const waterModifier = locationWaterModifier[plant.location] || 1
    const effectiveWaterInterval = Math.round(config.waterIntervalDays * waterModifier)

    const lastWater = getLastOperationByType(plantOps, 'water')
    if (lastWater) {
      const lastWaterDate = new Date(lastWater.date)
      const daysSinceWater = calculateDaysBetween(now, lastWaterDate)
      const overdueDays = daysSinceWater - effectiveWaterInterval

      if (overdueDays >= 0) {
        reminders.push({
          id: `water-${plant._id}`,
          plantId: plant._id!,
          plantName: plant.name,
          type: 'water',
          priority: overdueDays >= 3 ? 1 : overdueDays >= 1 ? 2 : 3,
          message: overdueDays === 0
            ? `${plant.name} 今天需要浇水了`
            : `${plant.name} 已超过 ${Math.floor(overdueDays)} 天未浇水`,
          overdueDays: Math.floor(overdueDays),
          dueDate: new Date(lastWaterDate.getTime() + effectiveWaterInterval * 86400000).toISOString()
        })
      }
    } else {
      const plantDate = new Date(plant.plantDate)
      const daysSincePlant = calculateDaysBetween(now, plantDate)
      if (daysSincePlant >= effectiveWaterInterval) {
        reminders.push({
          id: `water-${plant._id}`,
          plantId: plant._id!,
          plantName: plant.name,
          type: 'water',
          priority: 2,
          message: `${plant.name} 还没有浇水记录，建议尽快浇水`,
          overdueDays: Math.floor(daysSincePlant - effectiveWaterInterval),
          dueDate: now.toISOString()
        })
      }
    }

    const lastFertilize = getLastOperationByType(plantOps, 'fertilize')
    if (lastFertilize) {
      const lastFertilizeDate = new Date(lastFertilize.date)
      const daysSinceFertilize = calculateDaysBetween(now, lastFertilizeDate)
      const overdueDays = daysSinceFertilize - config.fertilizeIntervalDays

      if (overdueDays >= 0) {
        reminders.push({
          id: `fertilize-${plant._id}`,
          plantId: plant._id!,
          plantName: plant.name,
          type: 'fertilize',
          priority: overdueDays >= 7 ? 2 : 3,
          message: overdueDays === 0
            ? `${plant.name} 今天需要施肥了`
            : `${plant.name} 已超过 ${Math.floor(overdueDays)} 天未施肥`,
          overdueDays: Math.floor(overdueDays),
          dueDate: new Date(lastFertilizeDate.getTime() + config.fertilizeIntervalDays * 86400000).toISOString()
        })
      }
    } else {
      const plantDate = new Date(plant.plantDate)
      const daysSincePlant = calculateDaysBetween(now, plantDate)
      if (daysSincePlant >= config.fertilizeIntervalDays) {
        reminders.push({
          id: `fertilize-${plant._id}`,
          plantId: plant._id!,
          plantName: plant.name,
          type: 'fertilize',
          priority: 3,
          message: `${plant.name} 还没有施肥记录，建议尽快施肥`,
          overdueDays: Math.floor(daysSincePlant - config.fertilizeIntervalDays),
          dueDate: now.toISOString()
        })
      }
    }

    const lastPrune = getLastOperationByType(plantOps, 'prune')
    if (lastPrune) {
      const lastPruneDate = new Date(lastPrune.date)
      const daysSincePrune = calculateDaysBetween(now, lastPruneDate)
      if (daysSincePrune >= config.pruneIntervalDays) {
        reminders.push({
          id: `prune-${plant._id}`,
          plantId: plant._id!,
          plantName: plant.name,
          type: 'prune',
          priority: 4,
          message: `${plant.name} 建议修剪一下`,
          overdueDays: Math.floor(daysSincePrune - config.pruneIntervalDays),
          dueDate: new Date(lastPruneDate.getTime() + config.pruneIntervalDays * 86400000).toISOString()
        })
      }
    }

    const plantDate2 = new Date(plant.plantDate)
    const daysSincePlant2 = calculateDaysBetween(now, plantDate2)
    if (daysSincePlant2 >= config.repotIntervalDays) {
      const lastRepot = getLastOperationByType(plantOps, 'repot')
      const lastRepotDate = lastRepot ? new Date(lastRepot.date) : plantDate2
      const daysSinceRepot = calculateDaysBetween(now, lastRepotDate)
      if (daysSinceRepot >= config.repotIntervalDays) {
        reminders.push({
          id: `repot-${plant._id}`,
          plantId: plant._id!,
          plantName: plant.name,
          type: 'repot',
          priority: 4,
          message: `${plant.name} 建议考虑换盆`,
          overdueDays: Math.floor(daysSinceRepot - config.repotIntervalDays),
          dueDate: new Date(lastRepotDate.getTime() + config.repotIntervalDays * 86400000).toISOString()
        })
      }
    }
  }

  return reminders.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return b.overdueDays - a.overdueDays
  })
}

export function getNextTasks(
  plant: Plant,
  operations: Operation[],
  now: Date = new Date()
): { type: ReminderType; message: string; dueInDays: number }[] {
  const tasks: { type: ReminderType; message: string; dueInDays: number }[] = []
  const config = getVarietyConfig(plant.variety)
  const plantOps = operations.filter(op => op.plantId === plant._id)
  const waterModifier = locationWaterModifier[plant.location] || 1
  const effectiveWaterInterval = Math.round(config.waterIntervalDays * waterModifier)

  const addTask = (type: ReminderType, lastDate: Date | null, interval: number, label: string) => {
    if (lastDate) {
      const daysSince = calculateDaysBetween(now, lastDate)
      const dueIn = Math.ceil(interval - daysSince)
      tasks.push({
        type,
        message: dueIn <= 0 ? `需${label}` : `${label} (还有${dueIn}天)`,
        dueInDays: dueIn
      })
    } else {
      tasks.push({ type, message: `尽快${label}`, dueInDays: 0 })
    }
  }

  const lastWater = getLastOperationByType(plantOps, 'water')
  addTask('water', lastWater ? new Date(lastWater.date) : new Date(plant.plantDate), effectiveWaterInterval, '浇水')

  const lastFertilize = getLastOperationByType(plantOps, 'fertilize')
  addTask('fertilize', lastFertilize ? new Date(lastFertilize.date) : new Date(plant.plantDate), config.fertilizeIntervalDays, '施肥')

  tasks.sort((a, b) => a.dueInDays - b.dueInDays)
  return tasks.slice(0, 3)
}

export function inferPlantStatus(
  plant: Plant,
  operations: Operation[],
  now: Date = new Date()
): PlantStatus {
  const config = getVarietyConfig(plant.variety)
  const plantOps = operations.filter(op => op.plantId === plant._id)
  const waterModifier = locationWaterModifier[plant.location] || 1
  const effectiveWaterInterval = Math.round(config.waterIntervalDays * waterModifier)

  const lastWater = getLastOperationByType(plantOps, 'water')
  const daysSinceWater = lastWater
    ? calculateDaysBetween(now, new Date(lastWater.date))
    : calculateDaysBetween(now, new Date(plant.plantDate))

  if (daysSinceWater >= effectiveWaterInterval * 2) {
    return 'thirsty'
  }

  const lastFertilize = getLastOperationByType(plantOps, 'fertilize')
  const daysSinceFertilize = lastFertilize
    ? calculateDaysBetween(now, new Date(lastFertilize.date))
    : calculateDaysBetween(now, new Date(plant.plantDate))

  if (daysSinceFertilize >= config.fertilizeIntervalDays * 1.5) {
    return 'hungry'
  }

  return 'healthy'
}
