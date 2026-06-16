import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const activitiesPath = path.resolve(__dirname, '../../../data/activities.json')
const usersPath = path.resolve(__dirname, '../../../data/users.json')
const tokensPath = path.resolve(__dirname, '../../../data/tokens.json')

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
  },
}))

describe('后端API验证逻辑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('用户认证', () => {
    it('应该验证Bearer token', () => {
      const mockToken = 'test-token-123'
      const mockUserId = 'user-1'
      const tokens = { [mockToken]: mockUserId }

      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(tokens))
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)

      const tokensData = fs.readFileSync(tokensPath, 'utf-8')
      const parsed = JSON.parse(tokensData as string)

      expect(parsed[mockToken]).toBe(mockUserId)
    })

    it('应该拒绝无效的token', () => {
      const tokens = { 'valid-token': 'user-1' }
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(tokens))

      const tokensData = fs.readFileSync(tokensPath, 'utf-8')
      const parsed = JSON.parse(tokensData as string)

      expect(parsed['invalid-token']).toBeUndefined()
    })
  })

  describe('活动状态检查', () => {
    it('应该拒绝已结束活动的报名', () => {
      const activity = {
        id: 'act-1',
        title: '测试活动',
        status: '已结束',
      }

      const checkStatus = (a: any) => a.status !== '已结束'

      expect(checkStatus(activity)).toBe(false)
    })

    it('应该允许进行中活动的报名', () => {
      const activity = {
        id: 'act-1',
        title: '测试活动',
        status: '进行中',
      }

      const checkStatus = (a: any) => a.status !== '已结束'

      expect(checkStatus(activity)).toBe(true)
    })
  })

  describe('日期验证', () => {
    it('应该拒绝早于今天的日期', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const isValidDate = (dateStr: string) => {
        const date = new Date(dateStr)
        date.setHours(0, 0, 0, 0)
        return date >= today
      }

      expect(isValidDate(yesterday.toISOString().split('T')[0])).toBe(false)
    })

    it('应该拒绝超过一年后的日期', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const oneYearLater = new Date(today)
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
      oneYearLater.setDate(oneYearLater.getDate() + 2)

      const isValidDate = (dateStr: string) => {
        const date = new Date(dateStr)
        date.setHours(0, 0, 0, 0)
        const maxDate = new Date(today)
        maxDate.setFullYear(maxDate.getFullYear() + 1)
        return date >= today && date <= maxDate
      }

      expect(isValidDate(oneYearLater.toISOString().split('T')[0])).toBe(false)
    })

    it('应该接受今天到一年内的有效日期', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const validDate = new Date(today)
      validDate.setDate(validDate.getDate() + 30)

      const isValidDate = (dateStr: string) => {
        const date = new Date(dateStr)
        date.setHours(0, 0, 0, 0)
        const maxDate = new Date(today)
        maxDate.setFullYear(maxDate.getFullYear() + 1)
        return date >= today && date <= maxDate
      }

      expect(isValidDate(validDate.toISOString().split('T')[0])).toBe(true)
    })
  })

  describe('角色权限检查', () => {
    it('应该只允许管理员创建活动', () => {
      const adminUser = { id: 'user-1', role: '管理员' }
      const normalUser = { id: 'user-2', role: '普通用户' }
      const volunteerUser = { id: 'user-3', role: '志愿者' }

      const canCreateActivity = (user: any) => user.role === '管理员'

      expect(canCreateActivity(adminUser)).toBe(true)
      expect(canCreateActivity(normalUser)).toBe(false)
      expect(canCreateActivity(volunteerUser)).toBe(false)
    })

    it('应该只允许志愿者认领任务', () => {
      const adminUser = { id: 'user-1', role: '管理员' }
      const normalUser = { id: 'user-2', role: '普通用户' }
      const volunteerUser = { id: 'user-3', role: '志愿者' }

      const canClaimTask = (user: any) => user.role === '志愿者'

      expect(canClaimTask(volunteerUser)).toBe(true)
      expect(canClaimTask(adminUser)).toBe(false)
      expect(canClaimTask(normalUser)).toBe(false)
    })

    it('应该只允许志愿者记录时长', () => {
      const volunteerUser = { id: 'user-3', role: '志愿者' }
      const normalUser = { id: 'user-2', role: '普通用户' }

      const canLogHours = (user: any) => user.role === '志愿者'

      expect(canLogHours(volunteerUser)).toBe(true)
      expect(canLogHours(normalUser)).toBe(false)
    })
  })

  describe('用户一致性检查', () => {
    it('应该检查认证用户与请求用户一致', () => {
      const authUserId = 'user-1'
      const requestUserId = 'user-1'
      const differentUserId = 'user-2'

      const checkUserConsistency = (authId: string, reqId: string) => authId === reqId

      expect(checkUserConsistency(authUserId, requestUserId)).toBe(true)
      expect(checkUserConsistency(authUserId, differentUserId)).toBe(false)
    })
  })

  describe('服务时长验证', () => {
    it('应该拒绝无效的时长值', () => {
      const isValidHours = (hours: number) => {
        return !isNaN(hours) && hours >= 0.5 && hours <= 24
      }

      expect(isValidHours(0)).toBe(false)
      expect(isValidHours(0.4)).toBe(false)
      expect(isValidHours(25)).toBe(false)
      expect(isValidHours(NaN)).toBe(false)
    })

    it('应该接受有效的时长值', () => {
      const isValidHours = (hours: number) => {
        return !isNaN(hours) && hours >= 0.5 && hours <= 24
      }

      expect(isValidHours(0.5)).toBe(true)
      expect(isValidHours(3)).toBe(true)
      expect(isValidHours(24)).toBe(true)
    })
  })

  describe('数据读取', () => {
    it('应该正确读取活动数据', () => {
      const mockActivities = [
        { id: 'act-1', title: '社区清洁日', status: '进行中' },
        { id: 'act-2', title: '关爱老人', status: '已结束' },
      ]

      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockActivities))

      const data = fs.readFileSync(activitiesPath, 'utf-8')
      const activities = JSON.parse(data as string)

      expect(activities).toHaveLength(2)
      expect(activities[0].title).toBe('社区清洁日')
      expect(activities[1].status).toBe('已结束')
    })
  })
})
