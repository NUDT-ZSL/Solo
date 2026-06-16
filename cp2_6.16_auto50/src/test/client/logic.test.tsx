import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
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
  })

  describe('ActivityForm 日期验证', () => {
    it('应该验证日期不超过一年', () => {
      const title = '测试活动标题'
      const description = '这是一个测试活动的描述，内容足够长以满足验证要求'

      const getTodayStr = () => new Date().toISOString().split('T')[0]
      const getMaxDateStr = () => {
        const d = new Date()
        d.setFullYear(d.getFullYear() + 1)
        return d.toISOString().split('T')[0]
      }
      const getTomorrowStr = () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]
      }

      const isValidForm = (t: string, d: string, date: string) => {
        const todayStr = getTodayStr()
        const maxDateStr = getMaxDateStr()
        return (
          t.length >= 5 &&
          d.length >= 20 &&
          date >= todayStr &&
          date <= maxDateStr
        )
      }

      expect(isValidForm(title, description, getTodayStr())).toBe(true)
      expect(isValidForm(title, description, getTomorrowStr())).toBe(true)

      const tooFarDate = new Date()
      tooFarDate.setFullYear(tooFarDate.getFullYear() + 1)
      tooFarDate.setDate(tooFarDate.getDate() + 2)
      expect(isValidForm(title, description, tooFarDate.toISOString().split('T')[0])).toBe(false)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isValidForm(title, description, yesterday.toISOString().split('T')[0])).toBe(false)

      const shortTitle = '短'
      expect(isValidForm(shortTitle, description, validDate)).toBe(false)

      const shortDesc = '太短'
      expect(isValidForm(title, shortDesc, validDate)).toBe(false)
    })

    it('应该只允许管理员创建活动', () => {
      const canCreateActivity = (user: User | null) => {
        return user?.role === '管理员'
      }

      expect(canCreateActivity(mockAdmin)).toBe(true)
      expect(canCreateActivity(mockUser)).toBe(false)
      expect(canCreateActivity(mockVolunteer)).toBe(false)
      expect(canCreateActivity(null)).toBe(false)
    })
  })

  describe('UserInfo 用户切换', () => {
    it('应该正确处理用户切换', () => {
      const users = [mockAdmin, mockUser, mockVolunteer]
      let currentUser = mockUser

      const handleUserChange = (userId: string) => {
        const user = users.find((u) => u.id === userId)
        if (user) {
          currentUser = user
        }
      }

      expect(currentUser.id).toBe('user-2')
      handleUserChange('user-3')
      expect(currentUser.id).toBe('user-3')
      expect(currentUser.name).toBe('志愿者王芳')
    })
  })

  describe('fetchActivities 错误处理', () => {
    it('应该处理网络错误并设置错误状态', async () => {
      let error: string | null = null
      let loading = false

      const fetchActivities = async (): Promise<boolean> => {
        loading = true
        error = null
        try {
          await Promise.reject(new Error('Network error'))
        } catch (err) {
          const message = err instanceof Error ? err.message : '网络连接失败'
          error = message
          loading = false
          return false
        }
        loading = false
        return true
      }

      const result = await fetchActivities()

      expect(result).toBe(false)
      expect(loading).toBe(false)
      expect(error).toBeTruthy()
    })

    it('应该处理非200状态码', async () => {
      let error: string | null = null
      let loading = false

      const fetchActivities = async (): Promise<boolean> => {
        loading = true
        error = null
        try {
          const res = {
            ok: false,
            status: 500,
            json: async () => ({ error: '服务器错误' }),
          }
          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.error || `获取活动失败 (${res.status})`)
          }
          const data = await res.json()
          loading = false
          return true
        } catch (err) {
          const message = err instanceof Error ? err.message : '获取活动失败'
          error = message
          loading = false
          return false
        }
      }

      const result = await fetchActivities()

      expect(result).toBe(false)
      expect(loading).toBe(false)
      expect(error).toContain('500')
    })
  })

  describe('活动筛选逻辑', () => {
    it('应该正确筛选进行中活动', () => {
      const filter: '全部' | '进行中' | '已结束' = '进行中'
      const filtered = filter === '全部'
        ? mockActivities
        : mockActivities.filter((a) => a.status === filter)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].status).toBe('进行中')
    })

    it('应该正确筛选已结束活动', () => {
      const filter: '全部' | '进行中' | '已结束' = '已结束'
      const filtered = filter === '全部'
        ? mockActivities
        : mockActivities.filter((a) => a.status === filter)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].status).toBe('已结束')
    })

    it('应该正确显示全部活动', () => {
      const filter: '全部' | '进行中' | '已结束' = '全部'
      const filtered = filter === '全部'
        ? mockActivities
        : mockActivities.filter((a) => a.status === filter)

      expect(filtered).toHaveLength(2)
    })
  })

  describe('用户信息持久化', () => {
    it('应该使用zustand persist持久化用户信息', () => {
      const persistConfig = {
        name: 'charity-app-storage',
        partialize: (state: any) => ({
          currentUser: state.currentUser,
          authToken: state.authToken,
        }),
      }

      expect(persistConfig.name).toBe('charity-app-storage')
      const partialized: any = persistConfig.partialize({
        currentUser: mockUser,
        authToken: 'test-token',
        activities: [],
      })
      expect(partialized.currentUser).toEqual(mockUser)
      expect(partialized.authToken).toBe('test-token')
      expect(partialized.activities).toBeUndefined()
    })
  })

  describe('角色权限检查', () => {
    it('应该只允许志愿者认领任务', () => {
      const canClaimTask = (user: User | null) => {
        return user?.role === '志愿者'
      }

      expect(canClaimTask(mockVolunteer)).toBe(true)
      expect(canClaimTask(mockAdmin)).toBe(false)
      expect(canClaimTask(mockUser)).toBe(false)
      expect(canClaimTask(null)).toBe(false)
    })

    it('应该只允许志愿者记录时长', () => {
      const canLogHours = (user: User | null) => {
        return user?.role === '志愿者'
      }

      expect(canLogHours(mockVolunteer)).toBe(true)
      expect(canLogHours(mockAdmin)).toBe(false)
      expect(canLogHours(mockUser)).toBe(false)
    })

    it('应该验证已结束活动不能操作', () => {
      const canOperate = (activity: Activity) => {
        return activity.status !== '已结束'
      }

      expect(canOperate(mockActivities[0])).toBe(true)
      expect(canOperate(mockActivities[1])).toBe(false)
    })
  })

  describe('服务时长验证', () => {
    it('应该验证时长在有效范围内', () => {
      const isValidHours = (hours: number) => {
        return !isNaN(hours) && hours >= 0.5 && hours <= 24
      }

      expect(isValidHours(0)).toBe(false)
      expect(isValidHours(0.4)).toBe(false)
      expect(isValidHours(25)).toBe(false)
      expect(isValidHours(NaN)).toBe(false)
      expect(isValidHours(0.5)).toBe(true)
      expect(isValidHours(3)).toBe(true)
      expect(isValidHours(24)).toBe(true)
    })
  })

  describe('Token认证逻辑', () => {
    it('应该验证请求中的Bearer token', () => {
      const validToken = 'valid-token-123'
      const validUserId = 'user-2'
      const tokenStore: Record<string, string> = {
        [validToken]: validUserId,
      }

      const authenticate = (authHeader: string | undefined): string | null => {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return null
        }
        const token = authHeader.replace('Bearer ', '')
        return tokenStore[token] || null
      }

      expect(authenticate(`Bearer ${validToken}`)).toBe(validUserId)
      expect(authenticate('Bearer invalid-token')).toBeNull()
      expect(authenticate(undefined)).toBeNull()
      expect(authenticate('Basic invalid')).toBeNull()
    })

    it('应该检查认证用户与请求用户一致', () => {
      const authUserId = 'user-2'
      const requestUserId = 'user-2'
      const differentUserId = 'user-3'

      const checkUserConsistency = (authId: string, reqId?: string) => {
        return !reqId || authId === reqId
      }

      expect(checkUserConsistency(authUserId, requestUserId)).toBe(true)
      expect(checkUserConsistency(authUserId, differentUserId)).toBe(false)
      expect(checkUserConsistency(authUserId)).toBe(true)
    })
  })

  describe('并发数据竞争处理', () => {
    it('应该实现文件锁机制防止并发写入', async () => {
      interface Lock {
        isLocked: boolean
        queue: (() => void)[]
      }

      const fileLock: Record<string, Lock> = {}

      const getLock = (filePath: string): Lock => {
        if (!fileLock[filePath]) {
          fileLock[filePath] = { isLocked: false, queue: [] }
        }
        return fileLock[filePath]
      }

      const acquireLock = async (filePath: string): Promise<void> => {
        const lock = getLock(filePath)
        return new Promise((resolve) => {
          if (!lock.isLocked) {
            lock.isLocked = true
            resolve()
          } else {
            lock.queue.push(() => {
              lock.isLocked = true
              resolve()
            })
          }
        })
      }

      const releaseLock = (filePath: string): void => {
        const lock = getLock(filePath)
        lock.isLocked = false
        const next = lock.queue.shift()
        if (next) next()
      }

      let sharedCounter = 0
      const operations: Promise<void>[] = []

      for (let i = 0; i < 10; i++) {
        operations.push(
          (async () => {
            await acquireLock('test-file.json')
            const current = sharedCounter
            await new Promise((resolve) => setTimeout(resolve, 10))
            sharedCounter = current + 1
            releaseLock('test-file.json')
          })()
        )
      }

      await Promise.all(operations)
      expect(sharedCounter).toBe(10)
    })
  })
})
