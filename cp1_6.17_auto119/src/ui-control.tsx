import { useState, useEffect } from 'react'
import { store, type HeatmapParams, type SaccadeParams, type ChartParams, type ColorMapType, type ChartMode } from './store'

interface UIControlState {
  heatmap: HeatmapParams
  saccade: SaccadeParams
  chart: ChartParams
  palette: string[]
}

const SliderControl = (props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) => {
  const { label, value, min, max, step, unit, onChange } = props
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#3B82F6',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {typeof value === 'number' && !isNaN(value) ? value.toFixed(step < 1 ? 2 : 0) : value}{unit || ''}
        </span>
      </div>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(to right, #CBD5E1 0%, #CBD5E1 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`
        }} />
        <div style={{
          position: 'absolute',
          left: 0,
          height: 6,
          borderRadius: 3,
          width: `${percent}%`,
          background: 'linear-gradient(to right, #93C5FD, #3B82F6)',
          pointerEvents: 'none'
        }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'relative',
            width: '100%',
            height: 20,
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
            margin: 0,
            padding: 0,
            zIndex: 2
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-runnable-track {
            height: 6px;
            border-radius: 3px;
            background: transparent;
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 1px solid #94A3B8;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
            cursor: pointer;
            margin-top: -5px;
            transition: all 0.2s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
          }
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 1px solid #94A3B8;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
            cursor: pointer;
            transition: all 0.2s ease;
          }
        `}</style>
      </div>
    </div>
  )
}

const GroupTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 14,
    fontWeight: 600,
    color: '#334155',
    lineHeight: '28px',
    marginBottom: 12
  }}>
    {children}
  </div>
)

const Divider = () => (
  <div style={{
    height: 1,
    background: '#E2E8F0',
    margin: '16px 0 20px 0'
  }} />
)

const ColorMapSelector = (props: {
  value: ColorMapType
  onChange: (v: ColorMapType) => void
}) => {
  const options: { value: ColorMapType; label: string; gradient: string }[] = [
    {
      value: 'greenYellowRed',
      label: '绿-黄-红',
      gradient: 'linear-gradient(to right, #0000FF, #00FFC8, #00FF00, #FFE600, #FF0000)'
    },
    {
      value: 'blueRed',
      label: '蓝-红渐变',
      gradient: 'linear-gradient(to right, #003296, #1E78DC, #64B4FF, #C8C8C8, #FF9664, #E65032, #B40000)'
    }
  ]

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>渐变方案</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {options.map(opt => (
          <div
            key={opt.value}
            onClick={() => props.onChange(opt.value)}
            style={{
              flex: 1,
              cursor: 'pointer',
              borderRadius: 6,
              padding: 4,
              border: props.value === opt.value
                ? '2px solid #3B82F6'
                : '2px solid transparent',
              transition: 'all 0.2s ease',
              background: props.value === opt.value ? '#EFF6FF' : 'transparent'
            }}
          >
            <div style={{
              height: 18,
              borderRadius: 4,
              background: opt.gradient,
              marginBottom: 6,
              boxShadow: props.value === opt.value ? '0 0 0 1px rgba(59,130,246,0.3)' : 'none'
            }} />
            <div style={{
              fontSize: 11,
              textAlign: 'center',
              color: props.value === opt.value ? '#3B82F6' : '#64748B',
              fontWeight: props.value === opt.value ? 600 : 400
            }}>
              {opt.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ChartModeToggle = (props: {
  value: ChartMode
  onChange: (v: ChartMode) => void
}) => {
  const options: { value: ChartMode; label: string; icon: string }[] = [
    { value: 'bar', label: '柱状图', icon: '▊▊▊' },
    { value: 'stackedTimeline', label: '堆叠时间线', icon: '▬▬▬' }
  ]

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>显示模式</div>
      <div style={{
        display: 'flex',
        background: '#F1F5F9',
        borderRadius: 6,
        padding: 3
      }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => props.onChange(opt.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 4,
              border: 'none',
              background: props.value === opt.value ? '#FFFFFF' : 'transparent',
              color: props.value === opt.value ? '#3B82F6' : '#64748B',
              fontSize: 12,
              fontWeight: props.value === opt.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: props.value === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <div style={{ marginBottom: 2, letterSpacing: 1 }}>{opt.icon}</div>
            <div>{opt.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export const UIControl = () => {
  const [state, setState] = useState<UIControlState>(() => ({
    heatmap: store.getHeatmapParams(),
    saccade: store.getSaccadeParams(),
    chart: store.getChartParams(),
    palette: store.getColorPalette()
  }))

  useEffect(() => {
    const unsubscribe = store.on('store:updated', () => {
      setState({
        heatmap: store.getHeatmapParams(),
        saccade: store.getSaccadeParams(),
        chart: store.getChartParams(),
        palette: store.getColorPalette()
      })
    })
    return unsubscribe
  }, [])

  return (
    <div style={{
      width: 300,
      height: '100%',
      background: '#FFFFFF',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.05)',
      padding: 16,
      boxSizing: 'border-box',
      overflowY: 'auto',
      transition: 'all 0.2s ease'
    }}>
      <GroupTitle>热力图参数</GroupTitle>
      <SliderControl
        label="模糊半径"
        value={state.heatmap.blurRadius}
        min={3}
        max={30}
        step={1}
        unit="px"
        onChange={(v) => store.setHeatmapParams({ blurRadius: v })}
      />
      <SliderControl
        label="透明度"
        value={state.heatmap.opacity}
        min={0.1}
        max={1.0}
        step={0.05}
        onChange={(v) => store.setHeatmapParams({ opacity: v })}
      />
      <ColorMapSelector
        value={state.heatmap.colorMap}
        onChange={(v) => store.setHeatmapParams({ colorMap: v })}
      />

      <Divider />

      <GroupTitle>扫视路径参数</GroupTitle>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>线条颜色</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {state.palette.map((color) => (
            <div
              key={color}
              onClick={() => store.setSaccadeParams({ lineColor: color })}
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                background: color,
                cursor: 'pointer',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                transform: state.saccade.lineColor === color ? 'scale(1.1)' : 'scale(1)',
                boxShadow: state.saccade.lineColor === color
                  ? `0 0 0 3px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.15)`
                  : '0 1px 3px rgba(0,0,0,0.1)',
                outline: state.saccade.lineColor === color
                  ? '2px solid #3B82F6'
                  : '2px solid transparent',
                outlineOffset: 2
              }}
              onMouseEnter={(e) => {
                if (state.saccade.lineColor !== color) {
                  e.currentTarget.style.transform = 'scale(1.1)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                if (state.saccade.lineColor !== color) {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                }
              }}
            />
          ))}
        </div>
      </div>
      <SliderControl
        label="线条宽度"
        value={state.saccade.lineWidth}
        min={1}
        max={5}
        step={1}
        unit="px"
        onChange={(v) => store.setSaccadeParams({ lineWidth: v })}
      />

      <Divider />

      <GroupTitle>统计图参数</GroupTitle>
      <ChartModeToggle
        value={state.chart.mode}
        onChange={(v) => store.setChartParams({ mode: v })}
      />
    </div>
  )
}
