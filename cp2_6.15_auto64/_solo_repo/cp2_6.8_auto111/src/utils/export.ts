import type { RetroItem } from '../types'

function pad(num: number): string {
  return num.toString().padStart(2, '0')
}

export function exportSummary(items: RetroItem[]): void {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const fileName = `retro_${dateStr}_${timeStr}.txt`

  const uniqueContents = new Set(items.map((item) => item.content.trim()))
  const participantCount = uniqueContents.size

  const goodItems = items.filter((item) => item.type === 'good').slice(0, 5)
  const improveItems = items.filter((item) => item.type === 'improve').slice(0, 5)
  const actionItems = items.filter((item) => item.type === 'action').slice(0, 5)

  const lines: string[] = []
  lines.push('会议名称：匿团队回顾')
  lines.push(`日期：${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
  lines.push(`参与者数：${participantCount}`)
  lines.push('')
  lines.push('=== 做得好的 ===')
  goodItems.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.content}`)
  })
  if (goodItems.length === 0) {
    lines.push('（无）')
  }
  lines.push('')
  lines.push('=== 需改进的 ===')
  improveItems.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.content}`)
  })
  if (improveItems.length === 0) {
    lines.push('（无）')
  }
  lines.push('')
  lines.push('=== 行动项 ===')
  actionItems.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.content}`)
  })
  if (actionItems.length === 0) {
    lines.push('（无）')
  }

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
