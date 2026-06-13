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

  const suggestions: MatchSuggestion[] = []
  const processedPairs = new Set<string>()

  for (const wantToLearn of myLearn) {
    for (const canTeach of allSkills) {
      if (canTeach.userId === currentUserId || canTeach.type !== 'teach') continue
      if (canTeach.name !== wantToLearn.name) continue

      for (const wantToTeach of myTeach) {
        for (const theyLearn of allSkills) {
          if (theyLearn.userId !== canTeach.userId || theyLearn.type !== 'learn') continue
          if (theyLearn.name !== wantToTeach.name) continue

          const pairKey = [currentUserId, canTeach.userId].sort().join('_')
          if (processedPairs.has(pairKey)) continue
          processedPairs.add(pairKey)

          const partner = userMap.get(canTeach.userId)
          if (!partner) continue

          const score = calculateMatchScore(wantToLearn, canTeach, wantToTeach, theyLearn)

          suggestions.push({
            partner,
            skillIWant: wantToLearn,
            skillTeachMe: canTeach,
            skillTeachThem: wantToTeach,
            skillTheyWant: theyLearn,
            score
          })
        }
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
  art