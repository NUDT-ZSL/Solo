export type SkillCategory = 'tech' | 'art' | 'life' | 'language'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type SkillType = 'learn' | 'teach'

export interface Skill {
  id: string
  userId: string
  name: string
  category: SkillCategory
  level: SkillLevel
  description: string
  type: SkillType
  createdAt: number
  userName?: string
  userAvatar?: string
}

export interface User {
  id: string
  name: string
  avatar: string
  createdAt: number
}

export interface MatchSuggestion {
  partner: User
  skillIWant: Skill
  skillTeachMe: Skill
  skillTeachThem: Skill
  skillTheyWant: Skill
  score: number
}

const levelScore: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
}

export function calculateMatchScore(
  myLearn: Skill,
  theyTeach: Skill,
  myTeach: Skill,
  theyLearn: Skill
): number {
  const levelMatchA = 1 - Math.abs(levelScore[myLearn.level] - levelScore[theyTeach.level]) / 4
  const levelMatchB = 1 - Math.abs(levelScore[myTeach.level] - levelScore[theyLearn.level]) / 4
  const timeBonus = Math.min(
    1,
    (Date.now() - Math.min(myLearn.createdAt, myTeach.createdAt, theyTeach.createdAt, theyLearn.createdAt)) /
      (1000 * 60 * 60 * 24 * 7)
  )
  return (levelMatchA + levelMatchB) / 2 * 0.7 + timeBonus * 0.3
}

export function generateMatchSuggestions(
  currentUserId: string,
  allSkills: Skill[],
  users: User[]
): MatchSuggestion[] {
  const userMap = new Map(users.map(u => [u.id, u]))
  const mySkills = allSkills.filter(s => s.userId === currentUserId)
  const myLearn = mySkills.filter(s => s.type === 'learn')
  const myTeach = mySkills.filter(s => s.type === 'teach')

  const teachByName = new Map<string, Skill[]>()
  const learnByName = new Map<string, Skill[]>()

  for (const skill of allSkills) {
    if (skill.userId === currentUserId) continue
    if (skill.type === 'teach') {
      const arr = teachByName.get(skill.name) || []
      arr.push(skill)
      teachByName.set(skill.name, arr)
    } else {
      const arr = learnByName.get(skill.name) || []
      arr.push(skill)
      learnByName.set(skill.name, arr)
    }
  }

  const suggestions: MatchSuggestion[] = []
  const processedPairs = new Set<string>()

  for (const wantToLearn of myLearn) {
    const canTeachList = teachByName.get(wantToLearn.name)
    if (!canTeachList) continue

    for (const canTeach of canTeachList) {
      const partnerId = canTeach.userId
      const pairKey = [currentUserId, partnerId].sort().join('_')
      if (processedPairs.has(pairKey)) continue

      let bestMatch: { myTeachSkill: Skill; theyLearnSkill: Skill; score: number } | null = null

      for (const wantToTeach of myTeach) {
        const theyLearnList = learnByName.get(wantToTeach.name)
        if (!theyLearnList) continue

        for (const theyLearn of theyLearnList) {
          if (theyLearn.userId !== partnerId) continue

          const score = calculateMatchScore(wantToLearn, canTeach, wantToTeach, theyLearn)
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { myTeachSkill: wantToTeach, theyLearnSkill: theyLearn, score }
          }
        }
      }

      if (bestMatch) {
        const partner = userMap.get(partnerId)
        if (!partner) continue

        processedPairs.add(pairKey)
        suggestions.push({
          partner,
          skillIWant: wantToLearn,
          skillTeachMe: canTeach,
          skillTeachThem: bestMatch.myTeachSkill,
          skillTheyWant: bestMatch.theyLearnSkill,
          score: bestMatch.score
        })
      }
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 10)
}

export const categoryColors: Record<SkillCategory, string> = {
  tech: '#3b82f6',
  art: '#f59e0b',
  life: '#22c55e',
  language: '#a855f7'
}

export const categoryLabels: Record<SkillCategory, string> = {
  tech: '技术',
  art: '艺术',
  life: '生活',
  language: '语言'
}

export const levelLabels: Record<SkillLevel, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级'
}

export const typeLabels: Record<SkillType, string> = {
  learn: '想学',
  teach: '能教'
}

export const skillCategories: { value: SkillCategory; label: string; color: string }[] = [
  { value: 'tech', label: '技术', color: '#3b82f6' },
  { value: 'art', label: '艺术', color: '#f59e0b' },
  { value: 'life', label: '生活', color: '#22c55e' },
  { value: 'language', label: '语言', color: '#a855f7' }
]

export const skillLevels: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' }
]

export const themeColors = {
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  secondary: '#e0e7ff',
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  success: '#22c55e',
  successBg: '#dcfce7',
  successText: '#16a34a',
  defaultColor: '#94a3b8'
} as const

export function getCategoryColor(category: SkillCategory): string {
  return categoryColors[category] ?? themeColors.defaultColor
}

export function getCategoryLabel(category: SkillCategory): string {
  return categoryLabels[category] ?? '其他'
}

export function getLevelLabel(level: SkillLevel): string {
  return levelLabels[level] ?? '未知'
}

export function getTypeLabel(type: SkillType): string {
  return typeLabels[type] ?? '未知'
}
