import type { Preset } from './store'

const COLORS = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#AB47BC']

export const presets: Preset[] = [
  {
    name: '圣杯布局',
    layoutType: 'grid',
    gridContainer: {
      gridTemplateColumns: '200px 1fr 200px',
      gridTemplateRows: '60px 1fr 60px',
      gap: 8
    },
    items: [
      {
        color: COLORS[0],
        gridProps: { width: 'auto' as any, height: 'auto' as any, gridColumn: '1 / -1', gridRow: '1' }
      },
      {
        color: COLORS[1],
        gridProps: { width: 'auto' as any, height: 'auto' as any, gridColumn: '1', gridRow: '2' }
      },
      {
        color: COLORS[2],
        gridProps: { width: 'auto' as any, height: 'auto' as any, gridColumn: '2', gridRow: '2' }
      },
      {
        color: COLORS[3],
        gridProps: { width: 'auto' as any, height: 'auto' as any, gridColumn: '3', gridRow: '2' }
      },
      {
        color: COLORS[4],
        gridProps: { width: 'auto' as any, height: 'auto' as any, gridColumn: '1 / -1', gridRow: '3' }
      }
    ]
  },
  {
    name: '经典卡片网格',
    layoutType: 'grid',
    gridContainer: {
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'auto',
      gap: 16
    },
    items: Array.from({ length: 6 }, (_, i) => ({
      color: COLORS[i % COLORS.length],
      gridProps: { width: 'auto' as any, height: 120 }
    }))
  },
  {
    name: '导航栏',
    layoutType: 'flex',
    flexContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'nowrap',
      gap: 16
    },
    items: [
      { color: COLORS[0], flexProps: { width: 100, height: 40 } },
      { color: COLORS[1], flexProps: { width: 60, height: 30 } },
      { color: COLORS[2], flexProps: { width: 60, height: 30 } },
      { color: COLORS[3], flexProps: { width: 60, height: 30 } },
      { color: COLORS[4], flexProps: { width: 80, height: 36 } }
    ]
  },
  {
    name: '仪表板',
    layoutType: 'grid',
    gridContainer: {
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'repeat(2, 150px)',
      gap: 16
    },
    items: [
      { color: COLORS[0], gridProps: { width: 'auto' as any, height: 'auto' as any, gridColumn: 'span 2' } },
      { color: COLORS[1], gridProps: { width: 'auto' as any, height: 'auto' as any } },
      { color: COLORS[2], gridProps: { width: 'auto' as any, height: 'auto' as any } },
      { color: COLORS[3], gridProps: { width: 'auto' as any, height: 'auto' as any, gridColumn: 'span 3' } },
      { color: COLORS[4], gridProps: { width: 'auto' as any, height: 'auto' as any } }
    ]
  },
  {
    name: '画廊',
    layoutType: 'flex',
    flexContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12
    },
    items: Array.from({ length: 8 }, (_, i) => ({
      color: COLORS[i % COLORS.length],
      flexProps: {
        width: i % 3 === 0 ? 160 : 120,
        height: i % 3 === 0 ? 160 : 120
      }
    }))
  }
]

export const defaultPreset = presets[2]
