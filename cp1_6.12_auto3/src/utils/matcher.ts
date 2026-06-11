import type { ParsedResume } from './parser'

export interface SkillScore {
  name: string
  score: number
  required: boolean
}

export interface MatchResult {
  totalScore: number
  skillScore: number
  experienceScore: number
  educationScore: number
  matchedSkills: SkillScore[]
  missingSkills: string[]
  matched: HighlightSegment[]
  unmatched: HighlightSegment[]
  suggestions: string[]
}

export interface HighlightSegment {
  text: string
  start: number
  end: number
}

const EDUCATION_WEIGHT: Record<string, number> = {
  '博士': 100,
  '硕士': 85,
  '本科': 70,
  '大专': 50,
  '高中': 30,
  '中专': 25,
  '': 0
}

export function matchResume(resume: ParsedResume, jdText: string): MatchResult {
  const jdKeywords = extractJDKeywords(jdText)
  const requiredSkills = jdKeywords.requiredSkills
  const preferredSkills = jdKeywords.preferredSkills
  const requiredYears = jdKeywords.requiredYears
  const requiredEducation = jdKeywords.requiredEducation

  const skillResult = calculateSkillScore(resume.skills, requiredSkills, preferredSkills)
  const experienceResult = calculateExperienceScore(resume.yearsOfExperience, requiredYears)
  const educationResult = calculateEducationScore(resume.educationLevel, requiredEducation)

  const skillWeight = 0.5
  const expWeight = 0.3
  const eduWeight = 0.2

  const totalScore = Math.round(
    skillResult.score * skillWeight +
    experienceResult.score * expWeight +
    educationResult.score * eduWeight
  )

  const { matched, unmatched } = highlightSegments(resume.rawText, jdText)

  const suggestions = generateSuggestions({
    missingSkills: skillResult.missing,
    currentYears: resume.yearsOfExperience,
    requiredYears,
    currentEdu: resume.educationLevel,
    requiredEdu: requiredEducation
  })

  return {
    totalScore,
    skillScore: skillResult.score,
    experienceScore: experienceResult.score,
    educationScore: educationResult.score,
    matchedSkills: skillResult.matched,
    missingSkills: skillResult.missing,
    matched,
    unmatched,
    suggestions
  }
}

function extractJDKeywords(jd: string): {
  requiredSkills: string[]
  preferredSkills: string[]
  requiredYears: number
  requiredEducation: string
} {
  const requiredSkills = new Set<string>()
  const preferredSkills = new Set<string>()

  const skillPatterns = [
    /(?:熟练|熟悉|掌握|精通|具备|需要|要求|必须)[:：\s]*([^\n\r，,；;。.、]{2,100})/gi,
    /(?:技能|技术|能力|栈|stack)[:：\s]*([^\n\r]{2,200})/gi
  ]

  for (const pattern of skillPatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(jd)) !== null) {
      const segment = match[1]
      const parts = segment.split(/[，,、;；/\s]+/).filter(s => s.trim().length >= 2 && s.trim().length <= 20)
      parts.forEach(p => requiredSkills.add(p.trim()))
    }
  }

  const bonusPatterns = [
    /(?:加分|优先|bonus|preferred|plus)[:：\s]*([^\n\r，,；;。.]{2,100})/gi
  ]

  for (const pattern of bonusPatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(jd)) !== null) {
      const segment = match[1]
      const parts = segment.split(/[，,、;；/\s]+/).filter(s => s.trim().length >= 2 && s.trim().length <= 20)
      parts.forEach(p => preferredSkills.add(p.trim()))
    }
  }

  let requiredYears = 0
  const yearPatterns = [
    /(\d+)\s*(?:年|yr|year)s?\s*(?:以上|\+|plus|工作|经验|experience)/i,
    /(?:至少|minimum|min|要求)[:：\s]*(\d+)\s*(?:年|yr|year)s?/i,
    /(\d+)\+?\s*(?:年|yr|year)s?/i
  ]

  for (const pattern of yearPatterns) {
    const m = jd.match(pattern)
    if (m) {
      requiredYears = parseInt(m[1])
      if (!isNaN(requiredYears)) break
    }
  }

  let requiredEducation = ''
  const eduLevels = ['博士', '硕士', '本科', '大专']
  for (const level of eduLevels) {
    if (jd.includes(level)) {
      requiredEducation = level
      break
    }
  }

  return {
    requiredSkills: Array.from(requiredSkills),
    preferredSkills: Array.from(preferredSkills),
    requiredYears,
    requiredEducation
  }
}

function calculateSkillScore(
  resumeSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[]
): { score: number; matched: SkillScore[]; missing: string[] } {
  if (requiredSkills.length === 0 && preferredSkills.length === 0) {
    return { score: 50, matched: [], missing: [] }
  }

  const matched: SkillScore[] = []
  const missing: string[] = []
  const lowerResumeSkills = resumeSkills.map(s => s.toLowerCase())

  let totalWeight = 0
  let earnedWeight = 0

  for (const skill of requiredSkills) {
    const lower = skill.toLowerCase()
    const isMatched = lowerResumeSkills.some(rs =>
      rs === lower || rs.includes(lower) || lower.includes(rs)
    )
    totalWeight += 2
    if (isMatched) {
      earnedWeight += 2
      matched.push({ name: skill, score: 100, required: true })
    } else {
      missing.push(skill)
    }
  }

  for (const skill of preferredSkills) {
    const lower = skill.toLowerCase()
    const isMatched = lowerResumeSkills.some(rs =>
      rs === lower || rs.includes(lower) || lower.includes(rs)
    )
    totalWeight += 1
    if (isMatched) {
      earnedWeight += 1
      matched.push({ name: skill, score: 100, required: false })
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 50
  return { score, matched, missing }
}

function calculateExperienceScore(current: number, required: number): number {
  if (required === 0) return 80
  if (current >= required) return Math.min(100, 80 + (current - required) * 5)
  const ratio = current / required
  return Math.round(ratio * 70)
}

function calculateEducationScore(current: string, required: string): number {
  if (!required) return 70
  const currentScore = EDUCATION_WEIGHT[current] || 0
  const requiredScore = EDUCATION_WEIGHT[required] || 0
  if (currentScore >= requiredScore) return Math.min(100, currentScore)
  return Math.round((currentScore / requiredScore) * 70)
}

function highlightSegments(resumeText: string, jdText: string): {
  matched: HighlightSegment[]
  unmatched: HighlightSegment[]
} {
  const matched: HighlightSegment[] = []
  const jdWords = jdText.split(/[\s\n\r，,、。.；;()（）\[\]【】!！?？:：""'']+/)
    .filter(w => w.length >= 2)

  for (const word of jdWords) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    let m: RegExpExecArray | null
    while ((m = regex.exec(resumeText)) !== null) {
      matched.push({
        text: m[0],
        start: m.index,
        end: m.index + m[0].length
      })
    }
  }

  const merged = mergeSegments(matched)
  const unmatched = getUnmatchedSegments(resumeText, merged)

  return { matched: merged, unmatched }
}

function mergeSegments(segments: HighlightSegment[]): HighlightSegment[] {
  if (segments.length === 0) return []
  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const merged: HighlightSegment[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const curr = sorted[i]
    if (curr.start <= last.end + 5) {
      last.end = Math.max(last.end, curr.end)
      last.text = ''
    } else {
      merged.push(curr)
    }
  }

  return merged.map(s => ({
    ...s,
    text: ''
  }))
}

function getUnmatchedSegments(text: string, matched: HighlightSegment[]): HighlightSegment[] {
  const result: HighlightSegment[] = []
  let cursor = 0

  for (const seg of matched) {
    if (seg.start > cursor) {
      result.push({ text: '', start: cursor, end: seg.start })
    }
    cursor = seg.end
  }

  if (cursor < text.length) {
    result.push({ text: '', start: cursor, end: text.length })
  }

  return result
}

function generateSuggestions(ctx: {
  missingSkills: string[]
  currentYears: number
  requiredYears: number
  currentEdu: string
  requiredEdu: string
}): string[] {
  const suggestions: string[] = []

  if (ctx.missingSkills.length > 0) {
    const topMissing = ctx.missingSkills.slice(0, 3)
    suggestions.push(`建议补充以下技能：${topMissing.join('、')}`)
  }

  if (ctx.requiredYears > 0 && ctx.currentYears < ctx.requiredYears) {
    suggestions.push(`岗位要求${ctx.requiredYears}年经验，当前简历显示${ctx.currentYears}年，建议强调相关项目经验`)
  }

  if (ctx.requiredEdu && ctx.currentEdu !== ctx.requiredEdu) {
    const currentLevel = EDUCATION_WEIGHT[ctx.currentEdu] || 0
    const requiredLevel = EDUCATION_WEIGHT[ctx.requiredEdu] || 0
    if (currentLevel < requiredLevel) {
      suggestions.push(`岗位要求${ctx.requiredEdu}学历，建议突出专业能力和项目成果来弥补`)
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('简历与岗位匹配度较高，建议针对性优化自我介绍和项目描述')
  }

  return suggestions
}
