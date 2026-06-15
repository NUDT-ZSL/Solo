import { useState } from 'react'
import type { Contour } from './types'
import { buildNestingTree } from './CodeGenerator'

interface PropertyPanelProps {
  selected: Contour | null
  contours: Contour[]
  onSelect: (id: string | null) => void
}

type TabKey = 'basic' | 'position' | 'nesting'

export default function PropertyPanel({
  selected,
  contours,
  onSelect
}: PropertyPanelProps) {
  const [tab, setTab] = useState<TabKey>('basic')

  const renderNestingTree = () => {
    if (contours.length === 0) {
      return <div className="empty-state">暂无轮廓数据</div>
    }

    const tree = buildNestingTree([...contours])

    const renderNode = (node: { contour: Contour; children: any[] }) => {
      const isCurrent = selected?.id === node.contour.id
      return (
        <div key={node.contour.id}>
          <div
            className={`nested-item ${isCurrent ? 'selected' : ''}`}
            onClick={() => onSelect(node.contour.id)}
            style={{ cursor: 'pointer' }}
          >
            <span style={{ marginRight: 4 }}>
              {node.children.length > 0 ? '▸' : '  '}
            </span>
            矩形 {Math.round(node.contour.width)}×{Math.round(node.contour.height)}
            <span className="nested-depth">L{node.contour.depth}</span>
          </div>
          {node.children.length > 0 && (
            <div className="nested-list">
              {node.children.map(renderNode)}
            </div>
          )}
        </div>
      )
    }

    return <div>{tree.map(renderNode)}</div>
  }

  const renderBasic = () => {
    if (!selected) {
      return <div className="empty-state">请在画布上点击选择一个轮廓</div>
    }
    return (
      <div className="tab-content">
        <div className="prop-group">
          <div className="prop-row">
            <span className="prop-label">ID</span>
            <span className="prop-value" style={{ fontSize: 11 }}>
              {selected.id.slice(-6)}
            </span>
          </div>
          <div className="prop-row">
            <span className="prop-label">嵌套深度</span>
            <span className="prop-value">
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(249, 115, 22, 0.15)',
                  color: '#f97316'
                }}
              >
                Level {selected.depth}
              </span>
            </span>
          </div>
          <div className="prop-row">
            <span className="prop-label">宽高比</span>
            <span className="prop-value">
              {(selected.width / selected.height).toFixed(2)}:1
            </span>
          </div>
          <div className="prop-row">
            <span className="prop-label">面积</span>
            <span className="prop-value">
              {Math.round(selected.width * selected.height).toLocaleString()} px²
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderPosition = () => {
    if (!selected) {
      return <div className="empty-state">请在画布上点击选择一个轮廓</div>
    }
    return (
      <div className="tab-content">
        <div className="prop-group">
          <div className="prop-row">
            <span className="prop-label">X 坐标</span>
            <span className="prop-value">{Math.round(selected.x)} px</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Y 坐标</span>
            <span className="prop-value">{Math.round(selected.y)} px</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">宽度</span>
            <span className="prop-value">{Math.round(selected.width)} px</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">高度</span>
            <span className="prop-value">{Math.round(selected.height)} px</span>
          </div>
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(108, 99, 255, 0.08)',
              borderRadius: 8,
              fontSize: 12,
              color: '#999',
              lineHeight: 1.6
            }}
          >
            <div style={{ marginBottom: 6, color: '#bbb' }}>
              💡 操作提示
            </div>
            <div>• 拖拽中央移动位置</div>
            <div>• 拖拽右下角缩放大小</div>
            <div>• 按 Delete 键删除选中</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="property-panel">
      <h3>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: 2,
            background: selected ? '#f97316' : '#555'
          }}
        ></span>
        属性面板
        {selected && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(249, 115, 22, 0.15)',
              color: '#f97316'
            }}
          >
            已选中
          </span>
        )}
      </h3>

      <div className="tabs">
        <div
          className={`tab ${tab === 'basic' ? 'active' : ''}`}
          onClick={() => setTab('basic')}
        >
          基本
        </div>
        <div
          className={`tab ${tab === 'position' ? 'active' : ''}`}
          onClick={() => setTab('position')}
        >
          位置
        </div>
        <div
          className={`tab ${tab === 'nesting' ? 'active' : ''}`}
          onClick={() => setTab('nesting')}
        >
          嵌套
        </div>
      </div>

      {tab === 'basic' && renderBasic()}
      {tab === 'position' && renderPosition()}
      {tab === 'nesting' && (
        <div className="tab-content">{renderNestingTree()}</div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(108, 99, 255, 0.05)',
          borderRadius: 8,
          border: '1px solid rgba(108, 99, 255, 0.15)'
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 8,
            color: '#8B86FF'
          }}
        >
          📊 统计
        </div>
        <div style={{ fontSize: 12, color: '#999', lineHeight: 1.8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span>总轮廓数</span>
            <span style={{ color: '#e0e0e0' }}>{contours.length}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span>最大深度</span>
            <span style={{ color: '#e0e0e0' }}>
              L
              {contours.length > 0
                ? Math.max(...contours.map((c) => c.depth))
                : 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
