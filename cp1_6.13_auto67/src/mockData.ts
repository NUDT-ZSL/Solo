export interface TemplateElement {
  id: string
  type: 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  opacity: number
  zIndex: number
  content?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  src?: string
}

export interface Template {
  id: string
  name: string
  gradient: { from: string; to: string }
  width: number
  height: number
  elements: TemplateElement[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'template-1',
    name: '清新绿意',
    gradient: { from: '#d1fae5', to: '#ffffff' },
    width: 600,
    height: 900,
    elements: [
      { id: 'el-title', type: 'text', content: '社区春日茶话会', x: 60, y: 80, width: 480, height: 60, fontSize: 40, fontWeight: 700, color: '#065f46', opacity: 1, zIndex: 3 },
      { id: 'el-subtitle', type: 'text', content: '与邻居共赴一场温暖之约', x: 60, y: 160, width: 480, height: 36, fontSize: 22, fontWeight: 500, color: '#047857', opacity: 0.9, zIndex: 2 },
      { id: 'el-image', type: 'image', src: '', x: 100, y: 230, width: 400, height: 300, opacity: 1, zIndex: 1 },
      { id: 'el-date', type: 'text', content: '2026年6月20日 周六 14:00', x: 60, y: 580, width: 480, height: 32, fontSize: 20, fontWeight: 600, color: '#065f46', opacity: 1, zIndex: 2 },
      { id: 'el-location', type: 'text', content: '社区中心二楼多功能厅', x: 60, y: 630, width: 480, height: 28, fontSize: 18, fontWeight: 400, color: '#047857', opacity: 0.85, zIndex: 2 }
    ]
  },
  {
    id: 'template-2',
    name: '暖橙时光',
    gradient: { from: '#fed7aa', to: '#fef3c7' },
    width: 600,
    height: 900,
    elements: [
      { id: 'el-title', type: 'text', content: '亲子烘焙工坊', x: 60, y: 80, width: 480, height: 60, fontSize: 40, fontWeight: 700, color: '#9a3412', opacity: 1, zIndex: 3 },
      { id: 'el-subtitle', type: 'text', content: '和孩子一起制作甜蜜回忆', x: 60, y: 160, width: 480, height: 36, fontSize: 22, fontWeight: 500, color: '#c2410c', opacity: 0.9, zIndex: 2 },
      { id: 'el-image', type: 'image', src: '', x: 100, y: 230, width: 400, height: 300, opacity: 1, zIndex: 1 },
      { id: 'el-date', type: 'text', content: '2026年7月5日 周日 10:00', x: 60, y: 580, width: 480, height: 32, fontSize: 20, fontWeight: 600, color: '#9a3412', opacity: 1, zIndex: 2 },
      { id: 'el-location', type: 'text', content: '社区活动中心·创意厨房', x: 60, y: 630, width: 480, height: 28, fontSize: 18, fontWeight: 400, color: '#c2410c', opacity: 0.85, zIndex: 2 }
    ]
  },
  {
    id: 'template-3',
    name: '深蓝商务',
    gradient: { from: '#1e3a5f', to: '#e2e8f0' },
    width: 600,
    height: 900,
    elements: [
      { id: 'el-title', type: 'text', content: '创业分享沙龙', x: 60, y: 80, width: 480, height: 60, fontSize: 40, fontWeight: 700, color: '#ffffff', opacity: 1, zIndex: 3 },
      { id: 'el-subtitle', type: 'text', content: '洞察行业趋势 链接创业伙伴', x: 60, y: 160, width: 480, height: 36, fontSize: 22, fontWeight: 500, color: '#bfdbfe', opacity: 0.95, zIndex: 2 },
      { id: 'el-image', type: 'image', src: '', x: 100, y: 230, width: 400, height: 300, opacity: 1, zIndex: 1 },
      { id: 'el-date', type: 'text', content: '2026年6月28日 周日 19:00', x: 60, y: 580, width: 480, height: 32, fontSize: 20, fontWeight: 600, color: '#ffffff', opacity: 1, zIndex: 2 },
      { id: 'el-location', type: 'text', content: '社区创业空间·路演厅', x: 60, y: 630, width: 480, height: 28, fontSize: 18, fontWeight: 400, color: '#bfdbfe', opacity: 0.9, zIndex: 2 }
    ]
  }
]

export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#1f2937', '#6b7280', '#ffffff'
]
