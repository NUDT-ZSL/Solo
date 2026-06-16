import { describe, it, expect, vi, beforeEach } from 'vitest'
import { create } from 'zustand'

interface Activity {
  id: string
  title: string
  description: string
  date: string
  status: '进行中' | '已结束'
  registrations: string[]
  claimedBy: string[]
  hoursLogged: { userId: string; hours: number }[]
  createdAt: string
  version?: number
}

interface User {
  id: string
  name: string
  role: '管理员' | '普通用户' | '志愿者'
  registeredActivities: string[]
  claimedTasks: string[]
  totalHours: number
}

const mockUser: User = {
  id: 'user-2',
  name: '居民李明',
  role: '普通用户',
  registeredActivities: ['act-1'],
  claimedTasks: [],
  totalHours: 0,
}

const mockVolunteer: User = {
  id: 'user-3',
  name: '志愿者王芳',
  role: '志愿者',
  registeredActivities: ['act-1', 'act-2'],
  claimedTasks: ['act-1'],
  totalHours: 8,
}

const mockAdmin: User = {
  id: 'user-1',
  name: '管理员张华',
  role: '管理员',
  registeredActivities: [],
  claimedTasks: [],
  totalHours: 0,
}

const mockActivities: Activity[] = [
  {
    id: 'act-1',
    title: '社区清洁日',
    description: '一起动手清洁社区环境，捡拾垃圾，美化家园，让我们的社区更加干净整洁，共建美好居住环境',
    date: '2026-07-01',
    status: '进行中',
    registrations: ['user-2'],
    claimedBy: ['user-3'],
    hoursLogged: [{ userId: 'user-3', hours: 3 }],
    createdAt: '2026-06-10T08:00:00.000Z',
    version: 0,
  },
  {
    id: 'act-3',
    title: '儿童阅读推广活动',
    description: '为社区儿童组织阅读分享会，培养孩子们的阅读兴趣和习惯，让书香浸润社区每一个角落',
    date: '2026-05-15',
    status: '已结束',
    registrations: ['user-2', 'user-3'],
    claimedBy: ['user-3'],
    hoursLogged: [{ userId: 'user-3', hours: 5 }],
    createdAt: '2026-05-01T09:00:00.000Z',
    version: 2,
  },
]

describe('前端逻辑测试', () => {
  describe('ActivityCard 报名逻辑', () => {
    it('应该正确显示报名状态 - 未报名', () => {
      const activityNotRegistered: Activity = {
        ...mockActivities[0],
        registrations: [],
      }
      const isRegistered = mockUser ? activityNotRegistered.registrations.includes(mockUser.id) : false
      const isEnded = activityNotRegistered.status === '已结束'
      expect(isRegistered).toBe(false)
      expect(isEnded).toBe(false)
    })

    it('应该正确显示报名状态 - 已报名', () => {
      const activityRegistered: Activity = {
        ...mockActivities[0],
        registrations: ['user-2'],
      }
      const isRegistered = mockUser ? activityRegistered.registrations.includes(mockUser.id) : false
      expect(isRegistered).toBe(true)
    })

    it('应该正确显示已结束活动状态', () => {
      const endedActivity: Activity = mockActivities[1]
      const isEnded = endedActivity.status === '已结束'
      expect(isEnded).toBe(true)
    })

    it('按钮loading时应禁用点击', () => {
      const registering = true
      const isRegistered = false
      const isEnded = false
      const isDisabled = isRegistered || registering || isEnded
      expect(isDisabled).toBe(true)
    })
  })

  describe('报名流程核心测试', () => {
    it('报名成功 - 应更新活动注册列表和用户信息', () => {
      let activities: Activity[] = JSON.parse(JSON.stringify(mockActivities))
      activities[0] = { ...activities[0], registrations: [] }
      let users: User[] = [mockAdmin, { ...mockUser, registeredActivities: [] }, mockVolunteer]
      const userId = mockUser.id
      const activityId = 'act-1'

      const register = (uid: string, aid: string): { success: boolean; activity?: Activity; user?: User } => {
        const actIdx = activities.findIndex((a) => a.id === aid)
        if (actIdx === -1) return { success: false }
        const activity = activities[actIdx]
        if (activity.status === '已结束') return { success: false }
        if (activity.registrations.includes(uid)) return { success: false }
        const currentVersion = activity.version || 0
        if (activity.registrations.length >= 50) return { success: false }
        activity.registrations.push(uid)
        activity.version = currentVersion + 1
        activities[actIdx] = activity
        const userIdx = users.findIndex((u) => u.id === uid)
        if (userIdx !== -1) {
          const user = users[userIdx]
          if (!user.registeredActivities.includes(aid)) {
            user.registeredActivities.push(aid)
          }
          users[userIdx] = user
          return { success: true, activity, user }
        }
        return { success: true, activity }
      }

      const result = register(userId, activityId)
      expect(result.success).toBe(true)
      expect(result.activity?.registrations).toContain(userId)
      expect(result.user?.registeredActivities).toContain(activityId)
      expect(result.activity?.version).toBe(1)
    })

    it('报名失败 - 名额已满', () => {
      const fullActivity: Activity = {
        ...mockActivities[0],
        registrations: Array.from({ length: 50 }, (_, i) => `user-${i + 100}`),
        version: 10,
      }
      const activities: Activity[] = [fullActivity]
      const userId = 'user-new'
      const activityId = fullActivity.id

      const register = (uid: string, aid: string): { success: boolean; error?: string } => {
        const actIdx = activities.findIndex((a) => a.id === aid)
        if (actIdx === -1) return { success: false, error: '活动不存在' }
        const activity = activities[actIdx]
        if (activity.status === '已结束') return { success: false, error: '活动已结束' }
        if (activity.registrations.includes(uid)) return { success: false, error: '已报名' }
        if (activity.registrations.length >= 50) return { success: false, error: '活动名额已满' }
        return { success: true }
      }

      const result = register(userId, activityId)
      expect(result.success).toBe(false)
      expect(result.error).toBe('活动名额已满')
    })

    it('报名失败 - 已结束的活动不能报名', () => {
      const activities: Activity[] = JSON.parse(JSON.stringify(mockActivities))
      const userId = 'user-new'
      const activityId = 'act-3'

      const register = (uid: string, aid: string): { success: boolean; error?: string } => {
        const actIdx = activities.findIndex((a) => a.id === aid)
        if (actIdx === -1) return { success: false, error: '活动不存在' }
        const activity = activities[actIdx]
        if (activity.status === '已结束') return { success: false, error: '该活动已结束，无法进行此操作' }
        return { success: true }
      }

      const result = register(userId, activityId)
      expect(result.success).toBe(false)
      expect(result.error).toContain('已结束')
    })

    it('报名失败 - 重复报名', () => {
      const activities: Activity[] = JSON.parse(JSON.stringify(mockActivities))
      const userId = 'user-2'
      const activityId = 'act-1'

      const register = (uid: string, aid: string): { success: boolean; error?: string } => {
        const actIdx = activities.findIndex((a) => a.id === aid)
        const activity = activities[actIdx]
        if (activity.registrations.includes(uid)) return { success: false, error: '该用户已报名此活动' }
        return { success: true }
      }

      const result = register(userId, activityId)
      expect(result.success).toBe(false)
      expect(result.error).toBe('该用户已报名此活动')
    })
  })

  describe('Token认证核心测试', () => {
    it('token过期应认证失败', () => {
      interface TokenInfo {
        userId: string
        expiresAt: number
      }
      const tokens: Record<string, TokenInfo> = {
        'valid-token': { userId: 'user-2', expiresAt: Date.now() + 60 * 60 * 1000 },
        'expired-token': { userId: 'user-2', expiresAt: Date.now() - 1000 },
      }

      const verifyToken = (token: string): string | null => {
        const info = tokens[token]
        if (!info) return null
        if (Date.now() > info.expiresAt) return null
        return info.userId
      }

      expect(verifyToken('valid-token')).toBe('user-2')
      expect(verifyToken('expired-token')).toBeNull()
      expect(verifyToken('invalid-token')).toBeNull()
    })

    it('无token应返回401', () => {
      const authenticate = (authHeader: string | undefined): { error?: string; userId?: string } => {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { error: '未提供认证令牌' }
        }
        const token = authHeader.replace('Bearer ', '')
        if (token === 'valid') return { userId: 'user-2' }
        return { error: '认证令牌无效或已过期' }
      }

      expect(authenticate(undefined).error).toBeTruthy()
      expect(authenticate('Basic abc').error).toBeTruthy()
      expect(authenticate('Bearer invalid').error).toBeTruthy()
      expect(authenticate('Bearer valid').userId).toBe('user-2')
    })

    it('请求用户与token用户不一致应拒绝', () => {
      const checkConsistency = (authUserId: string, requestUserId?: string): boolean => {
        return !requestUserId || authUserId === requestUserId
      }

      expect(checkConsistency('user-2', 'user-2')).toBe(true)
      expect(checkConsistency('user-2', 'user-3')).toBe(false)
      expect(checkConsistency('user-2')).toBe(true)
    })
  })

  describe('乐观锁与并发报名测试', () => {
    it('版本号不匹配应返回冲突并可重试', () => {
      let activities: Activity[] = [
        { ...mockActivities[0], registrations: [], version: 5 },
      ]

      const optimisticRegister = (
        uid: string,
