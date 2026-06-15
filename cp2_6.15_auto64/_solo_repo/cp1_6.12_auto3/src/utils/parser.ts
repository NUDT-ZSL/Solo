export interface ParsedResume {
  skills: string[]
  yearsOfExperience: number
  education: string
  educationLevel: string
  positions: string[]
  rawText: string
}

const SKILL_KEYWORDS = [
  'JavaScript', 'TypeScript', 'Vue', 'React', 'Angular', 'Node.js', 'Python',
  'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  'HTML', 'CSS', 'Sass', 'Less', 'Webpack', 'Vite', 'Rollup',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Git',
  'RESTful', 'GraphQL', 'WebSocket', '微服务', '分布式', '高并发',
  '机器学习', '深度学习', 'NLP', '计算机视觉', '数据挖掘',
  'Vue.js', 'React.js', 'Next.js', 'Nuxt.js', 'Express', 'Koa', 'NestJS',
  'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
  'Jest', 'Mocha', 'Jasmine', 'Cypress', 'Selenium', '单元测试',
  'Figma', 'Sketch', 'Photoshop', 'UI设计', 'UX设计',
  '产品经理', '项目经理', '敏捷开发', 'Scrum', 'Kanban'
]

const EDUCATION_LEVELS = ['博士', '硕士', '本科', '大专', '高中', '中专']

export function parseResume(text: string): ParsedResume {
  const skills = extractSkills(text)
  const yearsOfExperience = extractYears(text)
  const { education, educationLevel } = extractEducation(text)
  const positions = extractPositions(text)

  return {
    skills,
    yearsOfExperience,
    education,
    educationLevel,
    positions,
    rawText: text
  }
}

function extractSkills(text: string): string[] {
  const found = new Set<string>()
  const lowerText = text.toLowerCase()

  for (const skill of SKILL_KEYWORDS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|[\\s,，、;；()（）\\[\\]【】])${escaped}(?=$|[\\s,，、;；()（）\\[\\]【】.。!！?？])`, 'i')
    if (regex.test(text)) {
      found.add(skill)
    }
  }

  const pattern = /[，、,;；\s]([A-Z][a-zA-Z0-9+\-#.]+|[\u4e00-\u9fa5]{2,10}(?:开发|设计|管理|分析|测试|运维|架构|工程))(?=[，、,;；\s]|$)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const word = match[1].trim()
    if (word.length >= 2 && word.length <= 20 && !/^\d+$/.test(word)) {
      found.add(word)
    }
  }

  return Array.from(found)
}

function extractYears(text: string): number {
  const patterns = [
    /(\d+)\s*(?:年|yr|year)s?\s*(?:工作|从业|开发|经验|experience)/i,
    /(?:工作|从业|开发|经验|experience)\s*[:：]?\s*(\d+)\s*(?:年|yr|year)s?/i,
    /(\d+)\s*[~\-~到]\s*(\d+)\s*(?:年|yr|year)s?\s*(?:工作|从业|开发|经验)/i,
    /(\d{4})\s*[~\-~到]\s*(\d{4}|至今|现在|now|present)\s*/gi
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      if (pattern === patterns[3]) {
        let totalYears = 0
        const globalPattern = new RegExp(pattern.source, 'gi')
        let m: RegExpExecArray | null
        while ((m = globalPattern.exec(text)) !== null) {
          const startYear = parseInt(m[1])
          const endYear = m[2] === '至今' || m[2] === '现在' || /now|present/i.test(m[2])
            ? new Date().getFullYear()
            : parseInt(m[2])
          if (!isNaN(startYear) && !isNaN(endYear)) {
            totalYears += Math.max(0, endYear - startYear)
          }
        }
        if (totalYears > 0) return Math.min(totalYears, 50)
      } else if (match[2]) {
        const start = parseInt(match[1])
        const end = parseInt(match[2])
        if (!isNaN(start) && !isNaN(end)) {
          return Math.round((start + end) / 2)
        }
      } else {
        const years = parseInt(match[1])
        if (!isNaN(years)) {
          return Math.min(years, 50)
        }
      }
    }
  }

  return 0
}

function extractEducation(text: string): { education: string; educationLevel: string } {
  let education = ''
  let educationLevel = ''

  const schoolPattern = /(?:毕业于|就读于|学校|院校|学历|教育背景|教育经历)[:：\s]*([^\n\r，,；;。.]{2,50})/
  const schoolMatch = text.match(schoolPattern)
  if (schoolMatch) {
    education = schoolMatch[1].trim()
  }

  const universityPattern = /([\u4e00-\u9fa5A-Za-z]{2,30}(?:大学|学院|学校|University|College|Institute))/i
  const uniMatch = text.match(universityPattern)
  if (uniMatch && !education) {
    education = uniMatch[1].trim()
  }

  for (const level of EDUCATION_LEVELS) {
    if (text.includes(level)) {
      educationLevel = level
      break
    }
  }

  const degreePattern = /(Ph\.?D|Doctor|Master|MBA|Bachelor|本科|硕士|博士|学士|大专|专科)/i
  const degreeMatch = text.match(degreePattern)
  if (degreeMatch && !educationLevel) {
    const d = degreeMatch[1].toLowerCase()
    if (d.includes('ph') || d.includes('doctor') || d === '博士') educationLevel = '博士'
    else if (d.includes('master') || d.includes('mba') || d === '硕士') educationLevel = '硕士'
    else if (d.includes('bachelor') || d === '本科' || d === '学士') educationLevel = '本科'
    else if (d === '大专' || d === '专科') educationLevel = '大专'
  }

  return { education, educationLevel }
}

function extractPositions(text: string): string[] {
  const positions = new Set<string>()
  const patterns = [
    /(?:职位|岗位|职务|担任)[:：\s]*([^\n\r，,；;。.]{2,30})/g,
    /(?:资深|高级|中级|初级|资深)?\s*(前端|后端|全栈|产品|运营|测试|运维|架构|数据|算法|UI|UX|设计|项目经理|产品经理|技术经理|CTO|CEO|工程师|设计师|分析师|专家|顾问|主管|经理|总监)(?:工程师|设计师|分析师)?/gi
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const pos = match[0].trim()
      if (pos.length >= 2 && pos.length <= 30) {
        positions.add(pos)
      }
    }
  }

  return Array.from(positions)
}
