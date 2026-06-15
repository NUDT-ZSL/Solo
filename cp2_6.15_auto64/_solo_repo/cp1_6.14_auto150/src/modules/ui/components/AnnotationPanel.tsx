import React, { useState, useEffect } from 'react'
import type { Annotation } from '@/types'
import { eventBus } from '@/utils/EventBus'
import AnnotationCard from './AnnotationCard'
import VirtualList from './VirtualList'

const VIRTUAL_THRESHOLD = 50
const ITEM_HEIGHT = 100

interface AnnotationPanelProps {
  className?: string
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ className }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  useEffect(() => {
    const handleAnnotationChanged = (data: Annotation[]) => {
      setAnnotations(data)
    }

    eventBus.on('annotation:changed', handleAnnotationChanged)

    return () => {
      eventBus.off('annotation:changed', handleAnnotationChanged)
    }
  }, [])

  const renderCard = (
    annotation: Annotation,
    index: number,
    _style: React.CSSProperties
  ) => {
    return <AnnotationCard annotation={annotation} index={index} />
  }

  return (
    <div
      className={`annotation-panel ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#171923',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '48px',
          backgroundColor: '#2d3748',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: '#e2e8f0',
          }}
        >
          批注列表
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '12px' }}>
        {annotations.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#718096',
              textAlign: 'center',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📝</div>
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              暂无批注
            </div>
            <div style={{ fontSize: '11px' }}>
              点击模型表面添加批注
            </div>
          </div>
        ) : annotations.length > VIRTUAL_THRESHOLD ? (
          <VirtualList
            items={annotations}
            itemHeight={ITEM_HEIGHT}
            renderItem={renderCard}
            style={{ height: '100%' }}
          />
        ) : (
          <div
            style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {annotations.map((annotation, index) => (
              <AnnotationCard
                key={annotation.id}
                annotation={annotation}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AnnotationPanel
