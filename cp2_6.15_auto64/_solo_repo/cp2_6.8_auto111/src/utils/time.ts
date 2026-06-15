export function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return '刚刚'
  }
  if (diffMin < 60) {
    return `${diffMin}分钟前`
  }
  if (diffHour < 24) {
    return `${diffHour}小时前`
  }
  if (diffDay === 1) {
    return '昨天'
  }
  if (diffDay < 7) {
    return `${diffDay}天前`
  }
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7)
    return `${weeks}周前`
  }
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30)
    return `${months}个月前`
  }
  const years = Math.floor(diffDay / 365)
  return `${years}年前`
}
