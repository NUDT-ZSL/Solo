import type { WordEntry } from '@/store/gameStore'

export function generateShareText(
  wordHistory: WordEntry[],
  totalWords: number,
  avgTime: number,
  mode: string
): string {
  const correctWords = wordHistory.filter(w => w.isCorrect)
  let chain = ''
  if (correctWords.length > 0) {
    chain = correctWords.map(w => w.word).join('→')
    if (chain.length > 40) {
      const words = correctWords.map(w => w.word)
      const firstWords = words.slice(0, 3).join('→')
      const lastWords = words.slice(-2).join('→')
      chain = `${firstWords}→...→${lastWords}`
    }
  }

  const modeLabel = mode === 'single' ? '单人练习' : '双人对战'
  const lines = [
    '🔗 词链工坊 - 接龙挑战',
    '━━━━━━━━━━━━',
    `🎮 模式：${modeLabel}`,
    `📝 总词数：${totalWords}`,
    `⏱ 平均用时：${avgTime.toFixed(1)}秒`,
  ]
  if (chain) {
    lines.push(`🔥 接龙链：${chain}`)
  }
  lines.push('来挑战我吧！')

  return lines.join('\n')
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const result = document.execCommand('copy')
    document.body.removeChild(textarea)
    return result
  }
}
