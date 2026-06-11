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

  const skillScore = isNaN(skillResult.score) ? 50 : Math.max(0, Math.min(100, skillResult.score))
  const expScore = isNaN(experienceResult.score) ? 70 : Math.max(0, Math.min(100, experienceResult.score))
  const eduScore = isNaN(educationResult.score) ? 70 : Math.max(0, Math.min(100, educationResult.score))

  const totalScore = Math.max(0, Math.min(100, Math.round(
    skillScore * skillWeight +
    expScore * expWeight +
    eduScore * eduWeight
  )))

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
    skillScore,
    experienceScore: expScore,
    educationScore: eduScore,
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

  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Vue', 'React', 'Angular', 'Node.js', 'Python',
    'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
    'HTML', 'CSS', 'Sass', 'Less', 'Webpack', 'Vite', 'Rollup',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'Git', 'Linux',
    'RESTful', 'GraphQL', 'WebSocket', '微服务', '分布式', '高并发',
    'Vue.js', 'React.js', 'Next.js', 'Nuxt.js', 'Express', 'Koa', 'NestJS',
    'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI',
    'Jest', 'Mocha', 'Cypress', 'Selenium', '单元测试',
    'Figma', 'UI设计', 'UX设计', '敏捷开发', 'Scrum', '微前端',
    'ECharts', 'Ant Design', '数据可视化'
  ]

  const lowerJd = jd.toLowerCase()
  for (const skill of skillKeywords) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|[\\s,，、;；()（）\\[\\]【】])${escaped}(?=$|[\\s,，、;；()（）\\[\\]【】.。!！?？])`, 'i')
    if (regex.test(jd)) {
      requiredSkills.add(skill)
    }
  }

  const bonusPatterns = [
    /(?:加分|优先|bonus|preferred|plus)[:：\s]*([^\n\r，,；;。.]{2,100})/gi
  ]

  for (const pattern of bonusPatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(jd)) !== null) {
      const segment = match[1]
      for (const skill of skillKeywords) {
        if (segment.toLowerCase().includes(skill.toLowerCase())) {
          preferredSkills.add(skill)
          requiredSkills.delete(skill)
        }
      }
    }
  }

  let requiredYears = 0
  const yearPatterns = [
    /(\d+)\s*(?:年|yr|year)s?\s*(?:以上|\+|plus|工作|经验|experience)/i,
    /(?:至少|minimum|min|要求)[:：\s]*(\d+)\s*(?:年|yr|year)s?/i,
    /(?:\d+)\s*[~\-~到]\s*(\d+)\s*(?:年|yr|year)s?/i,
    /(\d+)\+?\s*(?:年|yr|year)s?/i
  ]

  for (const pattern of yearPatterns) {
    const m = jd.match(pattern)
    if (m) {
      const y = parseInt(m[1])
      if (!isNaN(y)) {
        requiredYears = y
        break
      }
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
  if (!Array.isArray(resumeSkills)) resumeSkills = []
  if (!Array.isArray(requiredSkills)) requiredSkills = []
  if (!Array.isArray(preferredSkills)) preferredSkills = []

  if (requiredSkills.length === 0 && preferredSkills.length === 0) {
    return { score: 50, matched: [], missing: [] }
  }

  const matched: SkillScore[] = []
  const missing: string[] = []
  const lowerResumeSkills = resumeSkills.map(s => (s || '').toLowerCase())

  let totalWeight = 0
  let earnedWeight = 0

  for (const skill of requiredSkills) {
    if (!skill) continue
    const lower = skill.toLowerCase()
    const isMatched = lowerResumeSkills.some(rs =>
      rs && (rs === lower || rs.includes(lower) || lower.includes(rs))
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
    if (!skill) continue
    const lower = skill.toLowerCase()
    const isMatched = lowerResumeSkills.some(rs =>
      rs && (rs === lower || rs.includes(lower) || lower.includes(rs))
    )
    totalWeight += 1
    if (isMatched) {
      earnedWeight += 1
      matched.push({ name: skill, score: 100, required: false })
    }
  }

  const score = totalWeight > 0 ? Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100))) : 50
  return { score, matched, missing }
}

function calculateExperienceScore(current: number, required: number): number {
  if (isNaN(current)) current = 0
  if (isNaN(required)) required = 0
  current = Math.max(0, current)
  required = Math.max(0, required)

  if (required === 0) return 80
  if (current >= required) return Math.min(100, 80 + (current - required) * 5)
  const ratio = required > 0 ? current / required : 0
  return Math.max(0, Math.round(ratio * 70))
}

function calculateEducationScore(current: string, required: string): number {
  if (!current) current = ''
  if (!required) return 70
  const currentScore = EDUCATION_WEIGHT[current] || 0
  const requiredScore = EDUCATION_WEIGHT[required] || 0
  if (currentScore >= requiredScore) return Math.min(100, currentScore)
  const ratio = requiredScore > 0 ? currentScore / requiredScore : 0
  return Math.max(0, Math.round(ratio * 70))
}

function highlightSegments(resumeText: string, jdText: string): {
  matched: HighlightSegment[]
  unmatched: HighlightSegment[]
} {
  if (!resumeText || !jdText) {
    return { matched: [], unmatched: [] }
  }

  const matched: HighlightSegment[] = []
  const jdWords = jdText.split(/[\s\n\r，,、。.；;()（）\[\]【】!！?？:：""''、/\\-]+/)
    .filter(w => w.length >= 2 && w.length <= 20)

  const uniqueWords = Array.from(new Set(jdWords))

  for (const word of uniqueWords) {
    try {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<![\\u4e00-\\u9fa5a-zA-Z0-9])${escaped}(?![\\u4e00-\\u9fa5a-zA-Z0-9])`, 'gi')
      let m: RegExpExecArray | null
      while ((m = regex.exec(resumeText)) !== null) {
        matched.push({
          text: m[0],
          start: m.index,
          end: m.index + m[0].length
        })
      }
    } catch (e) {
      continue
    }
  }

  const merged = mergeSegments(matched, resumeText)
  const unmatched = getUnmatchedSegments(resumeText, merged)

  return { matched: merged, unmatched }
}

function mergeSegments(segments: HighlightSegment[], text: string): HighlightSegment[] {
  if (segments.length === 0) return []
  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const merged: HighlightSegment[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const curr = sorted[i]
    if (curr.start <= last.end + 3) {
      last.end = Math.max(last.end, curr.end)
      last.text = text.slice(last.start, last.end)
    } else {
      merged.push({ ...curr, text: text.slice(curr.start, curr.end) })
    }
  }

  return merged.map(s => ({
    ...s,
    text: text.slice(s.start, s.end)
  }))
}

function getUnmatchedSegments(text: string, matched: HighlightSegment[]): HighlightSegment[] {
  const result: HighlightSegment[] = []
  let cursor = 0

  for (const seg of matched) {
    if (seg.start > cursor) {
      result.push({
        text: text.slice(cursor, seg.start),
        start: cursor,
        end: seg.start
      })
    }
    cursor = seg.end
  }

  if (cursor < text.length) {
    result.push({
      text: text.slice(cursor),
      start: cursor,
      end: text.length
    })
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
