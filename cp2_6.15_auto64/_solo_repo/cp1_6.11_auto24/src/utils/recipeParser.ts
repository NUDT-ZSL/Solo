import { v4 as uuidv4 } from 'uuid'
import type { RecipeStep } from '../types'

export interface ParseResult {
  steps: RecipeStep[]
  warnings: string[]
}

const CHINESE_NUM_MAP: Record<string, number> = {
  '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
  '廿': 20, '廿一': 21, '廿二': 22, '廿三': 23, '廿四': 24,
  '廿五': 25, '廿六': 26, '廿七': 27, '廿八': 28, '廿九': 29,
  '三十': 30
}

function chineseToNumber(str: string): number | null {
  if (/^\d+$/.test(str)) return parseInt(str, 10)
  if (CHINESE_NUM_MAP[str] !== undefined) return CHINESE_NUM_MAP[str]

  let result = 0
  let temp = 0
  for (const ch of str) {
    if (ch === '十') {
      result += (temp || 1) * 10
      temp = 0
    } else if (CHINESE_NUM_MAP[ch] !== undefined) {
      temp = temp * 10 + CHINESE_NUM_MAP[ch]
    } else {
      return null
    }
  }
  return result + temp
}

const CIRCLED_NUM_MAP: Record<string, number> = {
  '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5,
  '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
  '⑪': 11, '⑫': 12, '⑬': 13, '⑭': 14, '⑮': 15,
  '⑯': 16, '⑰': 17, '⑱': 18, '⑲': 19, '⑳': 20
}

const NUM_CHARS = '[\\d一二三四五六七八九十零〇两廿]+'

const STEP_PATTERNS: RegExp[] = [
  new RegExp(`^步\\s*骤\\s*(${NUM_CHARS})\\s*[:：.\\-、\\s]\\s*(.*)$`, 'i'),
  new RegExp(`^步\\s*驟\\s*(${NUM_CHARS})\\s*[:：.\\-、\\s]\\s*(.*)$`, 'i'),
  new RegExp(`^步\\s*骤\\s*(${NUM_CHARS})\\s+(.*)$`, 'i'),
  new RegExp(`^(?:step|st)\\s*[\\.\\-:]?\\s*(\\d+)\\s*[:：.\\-、\\s]\\s*(.*)$`, 'i'),
  new RegExp(`^(?:step|st)\\s+[\\.\\-:]?\\s*(\\d+)\\s+(.*)$`, 'i'),
  new RegExp(`^第\\s*(${NUM_CHARS})\\s*步\\s*[:：.\\-、\\s]?\\s*(.*)$`, 'i'),
  new RegExp(`^第\\s*(${NUM_CHARS})\\s*[条项步节]\\s*[:：.\\-、\\s]?\\s*(.*)$`, 'i'),
  /^(\d{1,2})\s*[.．、\-)）]\s*(.*)$/,
  /^[\(（](\d{1,2})[\)）]\s*(.*)$/,
  /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*(.*)$/,
]

function parseCompoundDuration(text: string): { seconds: number; matchedText: string } {
  let totalSeconds = 0
  let matchedParts: string[] = []

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:个半)?\s*(?:小时|钟头|时|h|hr|hour)/i)
  if (hourMatch) {
    totalSeconds += Math.round(parseFloat(hourMatch[1]) * 3600)
    matchedParts.push(hourMatch[0])
  }

  const halfHourMatch = text.match(/半个?\s*(?:小时|钟头)/i)
  if (halfHourMatch && !hourMatch) {
    totalSeconds += 1800
    matchedParts.push(halfHourMatch[0])
  }

  const oneAndHalfMatch = text.match(/一个半\s*(?:小时|钟头)/i)
  if (oneAndHalfMatch && !hourMatch) {
    totalSeconds += 5400
    matchedParts.push(oneAndHalfMatch[0])
  }

  const quarterMatch = text.match(/一刻钟/i)
  if (quarterMatch && !hourMatch) {
    totalSeconds += 900
    matchedParts.push(quarterMatch[0])
  }

  const compoundMinSec = text.match(/(\d+)\s*(?:分钟|分|min|minute)\s*(\d+)\s*(?:秒钟|秒|sec|second|s)(?!\w)/i)
  if (compoundMinSec) {
    totalSeconds += parseInt(compoundMinSec[1], 10) * 60 + parseInt(compoundMinSec[2], 10)
    matchedParts.push(compoundMinSec[0])
    return { seconds: totalSeconds, matchedText: matchedParts.join('') }
  }

  const compoundHourMin = text.match(/(\d+)\s*(?:小时|钟头|h|hr)\s*(\d+)\s*(?:分钟|分|min)/i)
  if (compoundHourMin) {
    totalSeconds += parseInt(compoundHourMin[1], 10) * 3600 + parseInt(compoundHourMin[2], 10) * 60
    matchedParts.push(compoundHourMin[0])
    return { seconds: totalSeconds, matchedText: matchedParts.join('') }
  }

  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:个半)?\s*(?:分钟|分|min|minute|m)(?!\w)/i)
  if (minMatch) {
    totalSeconds += Math.round(parseFloat(minMatch[1]) * 60)
    matchedParts.push(minMatch[0])
  }

  const secMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:秒钟|秒|sec|second|s)(?!\w)/i)
  if (secMatch) {
    totalSeconds += Math.round(parseFloat(secMatch[1]))
    matchedParts.push(secMatch[0])
  }

  if (matchedParts.length > 0) {
    return { seconds: totalSeconds, matchedText: matchedParts.join('') }
  }

  const timeFormatMatch = text.match(/(\d{1,2})[:：](\d{2})(?:[:：](\d{2}))?/)
  if (timeFormatMatch) {
    const h = parseInt(timeFormatMatch[1], 10)
    const m = parseInt(timeFormatMatch[2], 10)
    const s = timeFormatMatch[3] ? parseInt(timeFormatMatch[3], 10) : 0
    if (m < 60 && s < 60) {
      return { seconds: h * 3600 + m * 60 + s, matchedText: timeFormatMatch[0] }
    }
  }

  const presetPatterns: Array<{ regex: RegExp; seconds: number }> = [
    { regex: /三刻钟|45分钟|四十五分/, seconds: 2700 },
    { regex: /半小时|半个钟头|30分钟|三十分/, seconds: 1800 },
  ]
  for (const { regex, seconds } of presetPatterns) {
    if (regex.test(text)) {
      return { seconds, matchedText: text.match(regex)![0] }
    }
  }

  return { seconds: 0, matchedText: '' }
}

const INGREDIENT_PATTERNS: RegExp[] = [
  /加入\s*([^，,。；;]+?)(?=\s*[,，。；;]|$)/g,
  /放入\s*([^，,。；;]+?)(?=\s*[,，。；;]|$)/g,
  /倒入\s*([^，,。；;]+?)(?=\s*[,，。；;]|$)/g,
  /撒入\s*([^，,。；;]+?)(?=\s*[,，。；;]|$)/g,
  /添加\s*([^，,。；;]+?)(?=\s*[,，。；;]|$)/g,
  /放进\s*([^，,。；;]+?)(?=\s*[,，。；;]|$)/g
]

export function parseStepNumberAndContent(line: string): { number: number | null; content: string } {
  const trimmed = line.trim()

  for (let i = 0; i < STEP_PATTERNS.length; i++) {
    const pattern = STEP_PATTERNS[i]
    const match = trimmed.match(pattern)
    if (!match) continue

    const firstGroup = match[1] || ''

    if (CIRCLED_NUM_MAP[firstGroup] !== undefined) {
      return {
        number: CIRCLED_NUM_MAP[firstGroup],
        content: (match[2] || firstGroup.slice(1)).trim()
      }
    }

    if (pattern.source.includes('step|st') || pattern.source.includes('Step|ST')) {
      const num = parseInt(firstGroup, 10)
      if (!isNaN(num) && num > 0) {
        return { number: num, content: (match[2] || '').trim() }
      }
      continue
    }

    const isTimeOnly = /^(\d{1,2})[:：](\d{2})/.test(firstGroup)
    if (isTimeOnly && !trimmed.includes('步骤') && !trimmed.toLowerCase().includes('step') && !trimmed.includes('第')) {
      continue
    }

    const num = chineseToNumber(firstGroup)
    if (num !== null && num >= 0) {
      return { number: num, content: (match[2] || '').trim() }
    }

    if (match[2] && match[2].trim()) {
      return { number: null, content: match[2].trim() }
    }
  }

  return { number: null, content: trimmed }
}

export function parseDurationToSeconds(text: string): { seconds: number; matchedText: string } {
  return parseCompoundDuration(text)
}

export function extractIngredients(text: string): string[] {
  const ingredients: Set<string> = new Set()

  for (const pattern of INGREDIENT_PATTERNS) {
    let match: RegExpExecArray | null
    pattern.lastIndex = 0
    while ((match = pattern.exec(text)) !== null) {
      const ingStr = match[1].trim()
      const parts = ingStr
        .split(/[和与、,，\s及跟连同加上]+/)
        .map(p => p.trim())
        .filter(p => p && p.length < 15)

      for (const part of parts) {
        const cleaned = part.replace(/^(?:少许|适量|少量|若干|一些|约|大概|差不多|左右)/, '').trim()
        if (cleaned) {
          ingredients.add(cleaned)
        }
      }
    }
  }

  return Array.from(ingredients)
}

export function parseRecipeText(text: string): ParseResult {
  const warnings: string[] = []
  const steps: RecipeStep[] = []

  if (!text || !text.trim()) {
    warnings.push('菜谱内容为空')
    return { steps, warnings }
  }

  const rawLines = text.split(/\r?\n/)
  const lines: string[] = []

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue

    if (!parseStepNumberAndContent(trimmed).number && lines.length > 0) {
      const last = lines[lines.length - 1]
      const lastParsed = parseStepNumberAndContent(last)
      const curParsed = parseStepNumberAndContent(trimmed)

      if (!lastParsed.number && !curParsed.number) {
        lines[lines.length - 1] = last + ' ' + trimmed
        continue
      }
    }

    lines.push(trimmed)
  }

  let autoIncrement = 0
  let lastNumber = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const { number, content } = parseStepNumberAndContent(line)

    if (!content || content.length < 2) {
      if (number !== null) {
        warnings.push(`步骤 ${number} 内容过短，已跳过`)
      }
      continue
    }

    let stepNumber: number

    if (number !== null) {
      stepNumber = number
      lastNumber = number
      autoIncrement = Math.max(autoIncrement, number)
    } else {
      autoIncrement++
      if (lastNumber > 0 && autoIncrement <= lastNumber) {
        autoIncrement = lastNumber + 1
      }
      stepNumber = autoIncrement
      lastNumber = autoIncrement

      if (steps.length === 0 && i === 0) {
        warnings.push('未识别到步骤编号，已按顺序自动编号')
      }
    }

    const { seconds: duration, matchedText } = parseCompoundDuration(content)

    let action = content
    if (matchedText) {
      const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      action = content
        .replace(new RegExp(escapeReg(matchedText), 'g'), '')
        .replace(/[，,。；;、\s]+$/g, '')
        .replace(/^[，,。；;、\s]+/g, '')
        .trim()
    }

    if (!action) action = content.replace(/[。；;]\s*$/, '').trim()

    const ingredients = extractIngredients(content)

    steps.push({
      id: uuidv4(),
      stepNumber,
      action: action || content,
      duration,
      ingredients,
      detail: content,
      imageUrl: '',
      status: 'pending'
    })
  }

  if (steps.length === 0) {
    warnings.push('未能解析出有效步骤，请检查内容格式')
  } else {
    const hasDuration = steps.some(s => s.duration > 0)
    if (!hasDuration) {
      warnings.push('未识别到任何时长信息，所有步骤将无计时')
    }

    const numbers = steps.map(s => s.stepNumber).sort((a, b) => a - b)
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] - numbers[i - 1] > 1) {
        warnings.push(`步骤编号存在间隔（${numbers[i - 1]} -> ${numbers[i]}）`)
        break
      }
    }
  }

  return { steps, warnings }
}
