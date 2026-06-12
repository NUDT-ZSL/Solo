import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { PaletteVersion } from '../types'
import { deleteVersion, setBaseline, reorderVersions } from '../api'
import { formatDate, isLightColor } from '../utils/colorUtils'

interface VersionListProps {
  versions: PaletteVersion[]
  baselineId: string | null
  selectedId: string | null
  onSelect: (id: string) => void
  onVersionsChange: () => void
}

export default function VersionList({
  versions,
  baselineId,
  selectedId,
  onSelect,
  onVersionsChange
}: VersionListProps) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个版本吗？')) return

    setDeletingIds(prev => new Set(prev).add(id))
    
    setTimeout(async () => {
      try {
        await deleteVersion(id)
        onVersionsChange()
      } catch (error) {
        console.error('Error deleting version:', error)
        alert('删除失败')
      } finally {
        setDeletingIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    }, 300)
  }

  const handleSetBaseline = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await setBaseline(id)
      onVersionsChange()
    } catch (error) {
      console.error('Error setting baseline:', error)
      alert('设置基准失败')
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const startIndex = result.source.index
    const endIndex = result.destination.index

    if (startIndex === endIndex) return

    const nonBaselineVersions = versions.filter(v => v.id !== baselineId)
    const baselineOffset = baselineId ? 1 : 0

    const adjustedStart = startIndex - baselineOffset
    const adjustedEnd = endIndex - baselineOffset

    if (adjustedStart < 0 || adjustedEnd < 0) return

    const newOrder = Array.from(nonBaselineVersions)
    const [removed] = newOrder.splice(adjustedStart, 1)
    newOrder.splice(adjustedEnd, 0, removed)

    try {
      await reorderVersions(newOrder.map(v => v.id))
      onVersionsChange()
    } catch (error) {
      console.error('Error reordering:', error)
    }
  }

  const baselineVersion = versions.find(v => v.id === baselineId)
  const otherVersions = versions.filter(v => v.id !== baselineId)
  const displayVersions = baselineVersion ? [baselineVersion, ...otherVersions] : otherVersions

  const getCardStyle = (version: PaletteVersion) => {
    const mainColor = version.colors[0]?.hex || '#4F46E5'
    const isLight = isLightColor(mainColor)
    return {
      backgroundColor: mainColor,
      color: isLight ? '#1F2937' : '#FFFFFF'
    }
  }

  return (
    <div className="version-list">
      {versions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">暂无配色方案版本</div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="versions">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}
              >
                {displayVersions.map((version, index) => {
                  const isBaseline = version.id === baselineId
                  const isDeleting = deletingIds.has(version.id)
                  
                  return (
                    <Draggable
                      key={version.id}
                      draggableId={version.id}
                      index={index}
                      isDragDisabled={isBaseline}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`version-card ${selectedId === version.id ? 'selected' : ''} ${isBaseline ? 'baseline' : ''} ${isDeleting ? 'deleting' : ''}`}
                          style={{
                            ...getCardStyle(version),
                            ...provided.draggableProps.style,
                            transition: snapshot.isDragging ? 'none' : 'all 0.3s ease'
                          }}
                          onClick={() => onSelect(version.id)}
                        >
                          <div className="version-card-actions">
                            <button
                              className={`card-action-btn baseline-btn ${isBaseline ? 'active' : ''}`}
                              onClick={(e) => handleSetBaseline(e, version.id)}
                              title={isBaseline ? '取消基准' : '设为基准'}
                            >
                              {isBaseline ? '★' : '☆'}
                            </button>
                            <button
                              className="card-action-btn"
                              onClick={(e) => handleDelete(e, version.id)}
                              title="删除"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="version-card-name">{version.name}</div>
                          <div className="version-card-date">
                            {formatDate(version.createdAt)}
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            gap: '4px', 
                            position: 'absolute', 
                            bottom: '12px', 
                            left: '12px', 
                            right: '12px' 
                          }}>
                            {version.colors.slice(0, 5).map((color, i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  height: '16px',
                                  borderRadius: '3px',
                                  backgroundColor: color.hex,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  )
}
