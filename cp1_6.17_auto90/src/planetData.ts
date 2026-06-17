export interface Planet {
  id: string
  name: string
  x: number
  y: number
  radius: number
  color: string
  resourceType: 'iron' | 'uranium' | 'crystal'
  difficulty: number
  distance: number
}

export const planets: Planet[] = [
  {
    id: 'mars',
    name: '火星',
    x: 180,
    y: 200,
    radius: 20,
    color: '#E63946',
    resourceType: 'iron',
    difficulty: 1,
    distance: 1,
  },
  {
    id: 'venus',
    name: '金星',
    x: 560,
    y: 180,
    radius: 22,
    color: '#E9C46A',
    resourceType: 'iron',
    difficulty: 1,
    distance: 1,
  },
  {
    id: 'mercury',
    name: '水星',
    x: 120,
    y: 380,
    radius: 16,
    color: '#A8DADC',
    resourceType: 'iron',
    difficulty: 2,
    distance: 2,
  },
  {
    id: 'jupiter',
    name: '木星',
    x: 620,
    y: 360,
    radius: 26,
    color: '#F4A261',
    resourceType: 'uranium',
    difficulty: 2,
    distance: 2,
  },
  {
    id: 'saturn',
    name: '土星',
    x: 80,
    y: 520,
    radius: 24,
    color: '#D4A373',
    resourceType: 'uranium',
    difficulty: 3,
    distance: 3,
  },
  {
    id: 'neptune',
    name: '海王星',
    x: 660,
    y: 540,
    radius: 22,
    color: '#457B9D',
    resourceType: 'crystal',
    difficulty: 3,
    distance: 3,
  },
  {
    id: 'uranus',
    name: '天王星',
    x: 100,
    y: 680,
    radius: 20,
    color: '#A8D8EA',
    resourceType: 'crystal',
    difficulty: 4,
    distance: 4,
  },
  {
    id: 'pluto',
    name: '冥王星',
    x: 680,
    y: 700,
    radius: 18,
    color: '#B8B8D1',
    resourceType: 'crystal',
    difficulty: 5,
    distance: 5,
  },
]

export const getUpgradeCost = (
  type: 'engine' | 'cargo' | 'laser',
  level: number
): { iron: number; uranium: number; crystal: number } => {
  const baseCosts = {
    engine: { iron: 3, uranium: 2, crystal: 1 },
    cargo: { iron: 5, uranium: 1, crystal: 1 },
    laser: { iron: 2, uranium: 3, crystal: 2 },
  }
  const base = baseCosts[type]
  const multiplier = level + 1
  return {
    iron: base.iron * multiplier,
    uranium: base.uranium * multiplier,
    crystal: base.crystal * multiplier,
  }
}
