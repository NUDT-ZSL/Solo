import type { Capsule, CreateCapsuleRequest } from '../../shared/types'

export class TimeCapsuleEngine {
  static isLocked(capsule: Capsule): boolean {
    return capsule.status === 'locked' && new Date(capsule.targetDate) > new Date()
  }

  static canUnseal(capsule: Capsule): boolean {
    return capsule.status === 'locked' && new Date(capsule.targetDate) <= new Date()
  }

  static isUnsealed(capsule: Capsule): boolean {
    return capsule.status === 'unsealed'
  }

  static getSummary(capsule: Capsule, maxLen: number = 6): string {
    return capsule.message.slice(0, maxLen) + (capsule.message.length > maxLen ? '…' : '')
  }

  static getColorForDate(targetDate: string): string {
    const now = new Date()
    const target = new Date(targetDate)
    const diffYears = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (diffYears <= 1) return '#f0c878'
    if (diffYears <= 5) return '#4a9eff'
    return '#9b59b6'
  }

  static formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  static getRemainingDays(targetDate: string): number {
    const now = new Date()
    const target = new Date(targetDate)
    const diff = target.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  static validateCreateRequest(req: CreateCapsuleRequest): string | null {
    if (!req.message || req.message.trim().length === 0) return '请输入寄语内容'
    if (req.message.length > 500) return '寄语内容不能超过500字'
    if (!req.targetDate) return '请选择开启日期'
    if (new Date(req.targetDate) <= new Date()) return '开启日期必须在未来'
    return null
  }
}
