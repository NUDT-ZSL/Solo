import { v4 as uuidv4 } from 'uuid'
import type { Task, Member, TaskStatus, Priority } from './types'

const memberNames = ['张伟', '李娜', '王强', '刘芳', '陈明', '杨洋', '赵雪', '周杰']
const memberColors = ['#42a5f5', '#ef5350', '#66bb6a', '#ffa726', '#ab47bc', '#26c6da', '#ff7043', '#5c6bc0']

const milestones = [
  '产品原型设计',
  '前端页面开发',
  '后端接口开发',
  '数据库设计',
  '用户测试',
  '性能优化',
  '功能迭代',
  'Bug修复',
  '文档完善',
  '代码审查'
]

const taskTitles = [
  '设计登录页面UI',
  '实现用户认证API',
  '配置数据库连接池',
  '编写单元测试用例',
  '优化首页加载速度',
  '修复移动端适配问题',
  '实现数据导出功能',
  '设计数据库表结构',
  '开发消息通知系统',
  '集成第三方支付SDK',
  '编写项目技术文档',
  '实现权限管理模块',
  '优化SQL查询性能',
  '开发文件上传组件',
  '实现搜索过滤功能',
  '设计Dashboard图表',
  '开发用户管理后台',
  '实现WebSocket实时推送',
  '配置CI/CD流水线',
  '编写接口文档',
  '实现数据缓存策略',
  '开发评论系统',
  '优化图片加载性能',
  '实现多语言支持',
  '设计系统架构图',
  '开发日志分析工具',
  '实现数据备份功能',
  '优化移动端手势操作',
  '开发报表生成功能',
  '实现单点登录集成'
]

export function generateMockMembers(): Member[] {
  return memberNames.map((name, index) => ({
    id: uuidv4(),
    name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    color: memberColors[index]
  }))
}

export function generateMockTasks(members: Member[]): Task[] {
  const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']
  const priorities: Priority[] = ['high', 'medium', 'low']
  
  return taskTitles.map((title) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const assigneeId = members[Math.floor(Math.random() * members.length)].id
    const milestone = milestones[Math.floor(Math.random() * milestones.length)]
    
    return {
      id: uuidv4(),
      title,
      status,
      assigneeId,
      priority,
      milestone,
      description: `${title}的详细描述，包括任务目标、验收标准和技术要求等内容。`,
      createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      estimatedHours: Math.floor(Math.random() * 40) + 1
    }
  })
}

export function calculateProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  const doneCount = tasks.filter(t => t.status === 'done').length
  return Math.round((doneCount / tasks.length) * 100)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function getStatusName(status: TaskStatus): string {
  const names: Record<TaskStatus, string> = {
    todo: '待办',
    in_progress: '进行中',
    review: '待审核',
    done: '已完成'
  }
  return names[status]
}

export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    todo: '#e3f2fd',
    in_progress: '#fff3e0',
    review: '#fce4ec',
    done: '#e8f5e9'
  }
  return colors[status]
}

export function getPriorityColor(priority: Priority): string {
  const colors: Record<Priority, string> = {
    high: '#ff5252',
    medium: '#ffb74d',
    low: '#66bb6a'
  }
  return colors[priority]
}

export function getPriorityName(priority: Priority): string {
  const names: Record<Priority, string> = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return names[priority]
}

export function saveToLocalStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (e) {
    console.error('Failed to load from localStorage:', e)
    return defaultValue
  }
}
