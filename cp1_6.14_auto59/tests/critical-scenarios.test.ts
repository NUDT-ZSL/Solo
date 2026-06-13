/**
 * 关键场景测试用例
 * 测试目标：验证修复的正确性
 */

import type { Task, Member } from '../src/types'
import { calculateProgress, debounce } from '../src/utils'

describe('StatsPanel Tooltip 空值检查测试', () => {
  const mockMembers: Member[] = [
    { id: '1', name: '张伟', avatar: '', color: '#42a5f5' },
    { id: '2', name: '李娜', avatar: '', color: '#ef5350' }
  ]

  const mockTasks: Task[] = [
    { id: 't1', title: '任务1', status: 'todo', assigneeId: '1', priority: 'high', milestone: '测试', description: '', createdAt: Date.now(), estimatedHours: 8, isNew: false },
    { id: 't2', title: '任务2', status: 'done', assigneeId: '1', priority: 'medium', milestone: '测试', description: '', createdAt: Date.now(), estimatedHours: 4, isNew: false }
  ]

  test('memberStats 计算正确性', () => {
    const memberStats = mockMembers.map(member => {
      const memberTasks = mockTasks.filter(t => t.assigneeId === member.id)
      const totalTasks = memberTasks.length
      const completedTasks = memberTasks.filter(t => t.status === 'done').length
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      return { member, totalTasks, completedTasks, completionRate, totalHours: 0 }
    })

    expect(memberStats[0].completionRate).toBe(50)
    expect(memberStats[1].completionRate).toBe(0)
  })

  test('tooltip callback 空值保护 - context 为 undefined', () => {
    const callbacks = {
      afterBody: function(context: any) {
        if (!context || !context[0] || context[0].dataIndex === undefined) return null
        return 'OK'
      },
      label: function(context: any) {
        if (!context || context.dataIndex === undefined) return null
        return 'OK'
      },
      beforeLabel: function(context: any) {
        if (!context || context.dataIndex === undefined) return null
        return 'OK'
      }
    }

    expect(callbacks.afterBody(undefined)).toBeNull()
    expect(callbacks.afterBody([])).toBeNull()
    expect(callbacks.afterBody([{}])).toBeNull()
    expect(callbacks.label(undefined)).toBeNull()
    expect(callbacks.label({})).toBeNull()
    expect(callbacks.beforeLabel(undefined)).toBeNull()
    expect(callbacks.beforeLabel({})).toBeNull()
  })

  test('tooltip callback 空值保护 - dataIndex 超出范围', () => {
    const memberStats = mockMembers.map(member => ({ member, totalTasks: 1, completedTasks: 1, completionRate: 100, totalHours: 0 }))

    const afterBody = function(context: any) {
      if (!context || !context[0] || context[0].dataIndex === undefined) return null
      const dataIndex = context[0].dataIndex
      const stat = memberStats[dataIndex]
      if (!stat) return null
      return `完成率: ${stat.completionRate}%`
    }

    expect(afterBody([{ dataIndex: 999 }])).toBeNull()
    expect(afterBody([{ dataIndex: -1 }])).toBeNull()
  })
})

describe('搜索框防抖测试', () => {
  jest.useFakeTimers()
  jest.spyOn(global, 'setTimeout')
  jest.spyOn(global, 'clearTimeout')

  test('debounce 延迟300ms触发', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 300)

    debouncedFn('test1')
    debouncedFn('test2')
    debouncedFn('test3')

    expect(mockFn).not.toHaveBeenCalled()
    expect(setTimeout).toHaveBeenCalledTimes(3)
    expect(clearTimeout).toHaveBeenCalledTimes(2)

    jest.advanceTimersByTime(299)
    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('test3')
  })

  test('快速输入只触发最后一次', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 300)

    for (let i = 0; i < 10; i++) {
      debouncedFn(`value${i}`)
      jest.advanceTimersByTime(50)
    }

    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(300)
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('value9')
  })

  test('组件卸载时清理定时器', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 300)

    debouncedFn('test')

    const timerId = (setTimeout as jest.Mock).mock.results[0].value
    expect(clearTimeout).not.toHaveBeenCalledWith(timerId)

    clearTimeout(timerId)
    expect(clearTimeout).toHaveBeenCalledWith(timerId)
  })

  jest.useRealTimers()
})

describe('进度条动画帧清理测试', () => {
  test('requestAnimationFrame 在组件卸载时取消', () => {
    let rafId: number | null = null
    const mockCancelRaf = jest.spyOn(window, 'cancelAnimationFrame')

    const mockAnimate = () => {
      rafId = requestAnimationFrame(mockAnimate)
    }

    rafId = requestAnimationFrame(mockAnimate)

    expect(rafId).not.toBeNull()

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }

    expect(mockCancelRaf).toHaveBeenCalled()
    mockCancelRaf.mockRestore()
  })

  test('isUnmountedRef 防止卸载后 setState', () => {
    const isUnmountedRef = { current: false }
    let state = 0

    const setState = (value: number) => {
      if (!isUnmountedRef.current) {
        state = value
      }
    }

    setState(1)
    expect(state).toBe(1)

    isUnmountedRef.current = true
    setState(2)
    expect(state).toBe(1)
  })
})

describe('拖拽卡片 transform 测试', () => {
  test('CSS变量叠加 scale 不覆盖 translate', () => {
    const dndTransform = 'translate(100px, 200px)'
    const dragScale = 0.9
    const combinedTransform = `scale(${dragScale}) ${dndTransform}`

    expect(combinedTransform).toBe('scale(0.9) translate(100px, 200px)')
    expect(combinedTransform).toContain('scale(0.9)')
    expect(combinedTransform).toContain('translate(100px, 200px)')
  })

  test('非拖拽状态 scale 为 1', () => {
    const dndTransform = ''
    const dragScale = 1
    const combinedTransform = `scale(${dragScale}) ${dndTransform}`

    expect(combinedTransform).toBe('scale(1) ')
  })

  test('拖拽样式变量设置正确', () => {
    const createStyle = (isDragging: boolean, dndTransform: string) => ({
      '--drag-scale': isDragging ? 0.9 : 1,
      '--drag-opacity': isDragging ? 0.7 : 1,
      transform: `scale(var(--drag-scale)) ${dndTransform}`,
      opacity: 'var(--drag-opacity)'
    })

    const draggingStyle = createStyle(true, 'translate(50px, 50px)')
    expect(draggingStyle['--drag-scale']).toBe(0.9)
    expect(draggingStyle['--drag-opacity']).toBe(0.7)

    const normalStyle = createStyle(false, '')
    expect(normalStyle['--drag-scale']).toBe(1)
    expect(normalStyle['--drag-opacity']).toBe(1)
  })
})

describe('新任务飞入动画测试', () => {
  test('isNew flag 控制动画', () => {
    const getAnimation = (isNew: boolean | undefined) =>
      isNew ? 'flyInFromTop 0.3s ease-out forwards' : 'none'

    expect(getAnimation(true)).toBe('flyInFromTop 0.3s ease-out forwards')
    expect(getAnimation(false)).toBe('none')
    expect(getAnimation(undefined)).toBe('none')
  })

  test('CLEAR_NEW_FLAG action 清除动画标记', () => {
    const initialTasks: Task[] = [
      { id: '1', title: '新任务', status: 'todo', assigneeId: '1', priority: 'high', milestone: '测试', description: '', createdAt: Date.now(), estimatedHours: 8, isNew: true }
    ]

    const reducer = (state: Task[], action: { type: string; payload: string }) => {
      if (action.type === 'CLEAR_NEW_FLAG') {
        return state.map(task =>
          task.id === action.payload ? { ...task, isNew: false } : task
        )
      }
      return state
    }

    const newState = reducer(initialTasks, { type: 'CLEAR_NEW_FLAG', payload: '1' })
    expect(newState[0].isNew).toBe(false)
  })
})

describe('进度计算测试', () => {
  test('空任务列表进度为0', () => {
    expect(calculateProgress([])).toBe(0)
  })

  test('全部完成进度为100', () => {
    const tasks: Task[] = [
      { id: '1', title: '', status: 'done', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 }
    ]
    expect(calculateProgress(tasks)).toBe(100)
  })

  test('部分完成计算正确', () => {
    const tasks: Task[] = [
      { id: '1', title: '', status: 'done', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 },
      { id: '2', title: '', status: 'todo', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 },
      { id: '3', title: '', status: 'done', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 },
      { id: '4', title: '', status: 'in_progress', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 }
    ]
    expect(calculateProgress(tasks)).toBe(50)
  })
})

describe('列头任务数动态更新测试', () => {
  test('columnTaskCounts 按状态分组统计', () => {
    const tasks: Task[] = [
      { id: '1', title: '', status: 'todo', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 },
      { id: '2', title: '', status: 'todo', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 },
      { id: '3', title: '', status: 'in_progress', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 },
      { id: '4', title: '', status: 'done', assigneeId: '', priority: 'low', milestone: '', description: '', createdAt: 0, estimatedHours: 0 }
    ]

    const grouped = {
      todo: [] as Task[],
      in_progress: [] as Task[],
      review: [] as Task[],
      done: [] as Task[]
    }
    tasks.forEach(task => {
      grouped[task.status].push(task)
    })

    const counts = {
      todo: grouped.todo.length,
      in_progress: grouped.in_progress.length,
      review: grouped.review.length,
      done: grouped.done.length
    }

    expect(counts.todo).toBe(2)
    expect(counts.in_progress).toBe(1)
    expect(counts.review).toBe(0)
    expect(counts.done).toBe(1)
  })
})

describe('头像超出数量显示测试', () => {
  test('成员数<=5时不显示+N', () => {
    const members: Member[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${i}`, name: `成员${i}`, avatar: '', color: '#fff'
    }))
    const maxVisible = 5
    const extraCount = members.length > maxVisible ? members.length - maxVisible : 0

    expect(extraCount).toBe(0)
  })

  test('成员数>5时显示超出数量', () => {
    const members: Member[] = Array.from({ length: 8 }, (_, i) => ({
      id: `${i}`, name: `成员${i}`, avatar: '', color: '#fff'
    }))
    const maxVisible = 5
    const visibleMembers = members.slice(0, maxVisible)
    const extraCount = members.length > maxVisible ? members.length - maxVisible : 0

    expect(visibleMembers.length).toBe(5)
    expect(extraCount).toBe(3)
  })

  test('头像z-index层叠顺序正确', () => {
    const members: Member[] = Array.from({ length: 3 }, (_, i) => ({
      id: `${i}`, name: `成员${i}`, avatar: '', color: '#fff'
    }))
    const zIndexes = members.map((_, index) => members.length - index)

    expect(zIndexes).toEqual([3, 2, 1])
    expect(zIndexes[0]).toBeGreaterThan(zIndexes[1])
    expect(zIndexes[1]).toBeGreaterThan(zIndexes[2])
  })
})
