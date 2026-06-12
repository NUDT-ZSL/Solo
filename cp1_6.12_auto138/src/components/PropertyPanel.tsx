import type { StyleConfig } from '@/types'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface PropertyPanelProps {
  styleConfig: StyleConfig
  onChange: (config: Partial<StyleConfig>) => void
  isDrawer?: boolean
  isOpen?: boolean
  onToggle?: () => void
}

interface PropertyItemProps {
  label: string
  children: React.ReactNode
}

function PropertyItem({ label, children }: PropertyItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-xs font-bold text-gray-700 shrink-0" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#333' }}>
        {label}
      </span>
      <div className="flex-1 flex justify-end" style={{ minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}

function SliderControl({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 appearance-none bg-gray-200 rounded-full outline-none cursor-pointer"
        style={{
          accentColor: '#4A90D9',
        }}
      />
      <span className="text-xs text-gray-500 w-10 text-right tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </span>
    </div>
  )
}

function ColorControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer appearance-none bg-transparent p-0"
          style={{ WebkitAppearance: 'none' }}
        />
      </div>
      <span className="text-xs text-gray-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </span>
    </div>
  )
}

function ShadowControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { label: '无', value: 'none' },
    { label: '轻微', value: '0 1px 3px rgba(0,0,0,0.06)' },
    { label: '中等', value: '0 4px 12px rgba(0,0,0,0.08)' },
    { label: '较强', value: '0 8px 32px rgba(0,0,0,0.15)' },
    { label: '内阴影', value: 'inset 0 1px 3px rgba(0,0,0,0.1)' },
  ]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white outline-none w-full transition-all duration-200 focus:border-[#4A90D9]"
      style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 8 }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function PropertyPanelContent({ styleConfig, onChange }: Omit<PropertyPanelProps, 'isDrawer' | 'isOpen' | 'onToggle'>) {
  return (
    <div className="py-4 px-4 space-y-1">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        样式属性
      </div>

      <PropertyItem label="文字颜色">
        <ColorControl value={styleConfig.color} onChange={(v) => onChange({ color: v })} />
      </PropertyItem>

      <PropertyItem label="背景颜色">
        <ColorControl value={styleConfig.backgroundColor} onChange={(v) => onChange({ backgroundColor: v })} />
      </PropertyItem>

      <PropertyItem label="字号">
        <SliderControl value={styleConfig.fontSize} min={10} max={32} step={1} onChange={(v) => onChange({ fontSize: v })} />
      </PropertyItem>

      <PropertyItem label="圆角">
        <SliderControl value={styleConfig.borderRadius} min={0} max={32} step={1} onChange={(v) => onChange({ borderRadius: v })} />
      </PropertyItem>

      <PropertyItem label="内边距">
        <SliderControl value={styleConfig.padding} min={0} max={48} step={2} onChange={(v) => onChange({ padding: v })} />
      </PropertyItem>

      <PropertyItem label="宽度">
        <SliderControl value={styleConfig.width} min={40} max={800} step={4} onChange={(v) => onChange({ width: v })} />
      </PropertyItem>

      <PropertyItem label="高度">
        <SliderControl value={styleConfig.height} min={20} max={600} step={4} onChange={(v) => onChange({ height: v })} />
      </PropertyItem>

      <PropertyItem label="阴影">
        <ShadowControl value={styleConfig.boxShadow} onChange={(v) => onChange({ boxShadow: v })} />
      </PropertyItem>
    </div>
  )
}

export default function PropertyPanel({ styleConfig, onChange, isDrawer, isOpen, onToggle }: PropertyPanelProps) {
  if (isDrawer) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 transition-transform duration-300 ease-in-out"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% - 40px))',
          maxHeight: '50vh',
          overflowY: 'auto',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <div
          className="flex items-center justify-center py-2 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            <span style={{ fontFamily: 'DM Sans, sans-serif' }}>属性面板</span>
          </div>
        </div>
        {isOpen && <PropertyPanelContent styleConfig={styleConfig} onChange={onChange} />}
      </div>
    )
  }

  return (
    <div
      className="h-full bg-white overflow-y-auto"
      style={{ width: 280, minWidth: 280, scrollbarWidth: 'thin' }}
    >
      <PropertyPanelContent styleConfig={styleConfig} onChange={onChange} />
    </div>
  )
}
