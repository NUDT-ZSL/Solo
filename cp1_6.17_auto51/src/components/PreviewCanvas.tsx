import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  useDraggable
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store'
import { getContainerStyle, getItemStyle } from '../engine'

function DraggableItem({
  id,
  isSelected,
  onClick
}: {
  id: string
  isSelected: boolean
  onClick: () => void
}) {
  const { layoutType, items } = useStore()
  const item = items.find((i) => i.id === id)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id
  })

  if (!item) return null

  const baseStyle = getItemStyle(layoutType, item)

  const style: React.CSSProperties = {
    ...baseStyle,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    outline: isSelected ? '3px solid var(--accent)' : 'none',
    outlineOffset: '2px',
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 100 : 'auto'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      {...listeners}
      {...attributes}
    />
  )
}

export function PreviewCanvas() {
  const {
    layoutType,
    flexContainer,
    gridContainer,
    items,
    selectedItemId,
    setSelectedItem,
    reorderItem
  } = useStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor)
  )

  const { setNodeRef } = useDroppable({
    id: 'canvas'
  })

  const containerStyle = useMemo(
    () => getContainerStyle(layoutType, flexContainer, gridContainer),
    [layoutType, flexContainer, gridContainer]
  )

  const handleDragStart = (_event: DragStartEvent) => {
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      reorderItem(active.id as string, over.id as string)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={setNodeRef}
        onClick={() => setSelectedItem(null)}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: 'var(--bg-primary)',
          transition: 'background-color 0.5s ease',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            right: '20px',
            bottom: '20px',
            backgroundImage: `radial-gradient(circle, var(--grid-line) 1px, transparent 1px), radial-gradient(circle, var(--grid-line) 1px, transparent 1px)`,
            backgroundSize: '25% 25%, 25% 25%',
            backgroundPosition: '0 0, 0 0',
            opacity: 0.5,
            pointerEvents: 'none'
          }}
        />

        <div style={containerStyle}>
          {items.map((item) => (
            <DraggableItem
              key={item.id}
              id={item.id}
              isSelected={selectedItemId === item.id}
              onClick={() => setSelectedItem(item.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {null}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
