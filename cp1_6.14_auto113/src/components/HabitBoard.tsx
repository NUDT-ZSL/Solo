import { useStore, type Habit } from '@/store'
import { useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Check } from 'lucide-react'

const tagConfig: Record<string, { label: string; color: string; bg: string }> = {
  health: { label: '健康', color: '#00b894', bg: '#00b89422' },
  study: { label: '学习', color: '#6c5ce7', bg: '#6c5ce722' },
  creative: { label: '创作', color: '#fdcb6e', bg: '#fdcb6e22' },
  life: { label: '生活', color: '#74b9ff', bg: '#74b9ff22' },
}

function SortableCard({ habit, onToggle }: { habit: Habit; onToggle: (h: Habit) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  })

  const cardStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const tag = tagConfig[habit.tag] || tagConfig.life
  const bgColor = habit.completed ? '#e8f5e9' : '#ffcdd2'

  return (
    <div ref={setNodeRef} style={cardStyle} className="flex items-center gap-3">
      <div
        className="flex items-center gap-3 cursor-default"
        style={{
          width: 280,
          height: 120,
          background: bgColor,
          borderRadius: 16,
          boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.25s ease, background 0.25s ease',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
        }}
      >
        <button
          className="flex-shrink-0 p-1 cursor-grab active:cursor-grabbing ml-2"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} className="text-gray-400" />
        </button>

        <button
          onClick={() => onToggle(habit)}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            background: habit.completed ? '#4caf50' : 'transparent',
            border: habit.completed ? 'none' : '2px solid #e57373',
          }}
        >
          {habit.completed && <Check size={16} style={{ color: '#ffffff' }} />}
        </button>

        <div className="flex-1 min-w-0 pr-3">
          <div className="font-semibold text-gray-800 text-sm truncate">{habit.name}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: tag.bg, color: tag.color }}
            >
              {tag.label}
            </span>
            <span className="text-xs text-gray-500">
              {habit.completedCount}/{habit.dailyGoal}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-white/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((habit.completedCount / habit.dailyGoal) * 100, 100)}%`,
                background: tag.color,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HabitBoard() {
  const { habits, fetchHabits, updateHabit } = useStore()

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleToggle = useCallback(
    async (habit: Habit) => {
      const newCompleted = !habit.completed
      const newCount = newCompleted
        ? Math.min(habit.completedCount + 1, habit.dailyGoal)
        : Math.max(habit.completedCount - 1, 0)
      const fullyDone = newCount >= habit.dailyGoal

      await updateHabit(habit.id, {
        completed: fullyDone,
        completedCount: newCount,
      })

      if (fullyDone && !habit.completed) {
        const { updateProfile } = useStore.getState()
        updateProfile({ exp: (useStore.getState().profile?.exp ?? 0) + 25 })
      }
    },
    [updateHabit]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIdx = habits.findIndex((h) => h.id === active.id)
      const newIdx = habits.findIndex((h) => h.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return

      const reordered = arrayMove(habits, oldIdx, newIdx)
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order !== i) {
          updateHabit(reordered[i].id, { order: i })
        }
      }
    },
    [habits, updateHabit]
  )

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-gray-700 tracking-wide flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#6c5ce7] to-[#00b894]" />
        今日任务链
      </h3>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
          {habits.map((habit) => (
            <SortableCard key={habit.id} habit={habit} onToggle={handleToggle} />
          ))}
        </SortableContext>
      </DndContext>

      {habits.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          还没有习惯，去添加一个吧！
        </div>
      )}
    </div>
  )
}
