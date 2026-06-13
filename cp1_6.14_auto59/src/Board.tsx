import { useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import type { Task, Member, TaskStatus } from './types'
import { getStatusName, getStatusColor, getPriorityColor, getPriorityName } from './utils'

interface BoardProps {
  tasks: Task[]
  members: Member[]
  onDragEnd: (result: DropResult) => void
}

const columns: { id: TaskStatus; name: string }[] = [
  { id: 'todo', name: '待办' },
  { id: 'in_progress', name: '进行中' },
  { id: 'review', name: '待审核' },
  { id: 'done', name: '已完成' }
]

interface TaskCardProps {
  task: Task
  member: Member | undefined
  index: number
  isNew?: boolean
}

function TaskCard({ task, member, index, isNew }: TaskCardProps) {
  const statusColor = getStatusColor(task.status)
  const priorityColor = getPriorityColor(task.priority)
  const priorityName = getPriorityName(task.priority)

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.5 : 1,
            transform: snapshot.isDragging
              ? `${provided.draggableProps.style?.transform} scale(0.9)`
              : provided.draggableProps.style?.transform,
            transition: snapshot.isDragging
              ? 'none'
              : 'background-color 0.3s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            animation: isNew ? 'flyInFromTop 0.3s ease-out, bounceBack 0.2s ease-out 0.3s' : 'none',
            background: snapshot.isDragging ? '#ffffff' : statusColor,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
            boxShadow: snapshot.isDragging
              ? '0 8px 24px rgba(0,0,0,0.15)'
              : '0 1px 3px rgba(0,0,0,0.08)',
            cursor: 'grab',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div
              style={{
                flex: 1,
                fontSize: '14px',
                fontWeight: 500,
                color: '#333',
                lineHeight: '1.4',
                wordBreak: 'break-word',
                paddingRight: '8px'
              }}
            >
              {task.title}
            </div>
            {member && (
              <div
                title={member.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #e0e0e0',
                  flexShrink: 0,
                  overflow: 'hidden',
                  background: member.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                {member.name.charAt(0)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#ffffff',
                backgroundColor: priorityColor,
                fontWeight: 500
              }}
            >
              {priorityName}
            </span>
          </div>

          <div style={{
            fontSize: '12px',
            color: '#666',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            📍 {task.milestone}
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default function Board({ tasks, members, onDragEnd }: BoardProps) {
  const getMemberById = (id: string) => members.find(m => m.id === id)

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    }
    tasks.forEach(task => {
      grouped[task.status].push(task)
    })
    return grouped
  }, [tasks])

  const newTaskIds = useMemo(() => {
    const now = Date.now()
    return new Set(
      tasks
        .filter(task => now - task.createdAt < 1000)
        .map(task => task.id)
    )
  }, [tasks])

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', gap: '16px', paddingTop: '60px' }}>
        {columns.map(column => (
          <div
            key={column.id}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#ffffff',
                borderRadius: '8px',
                marginBottom: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#444' }}>
                {getStatusName(column.id)}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#666',
                  background: '#f0f0f0',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}
              >
                {tasksByStatus[column.id].length}
              </span>
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    flex: 1,
                    background: snapshot.isDraggingOver ? '#f0f0f0' : '#fafafa',
                    borderRadius: '8px',
                    padding: '12px',
                    transition: 'background-color 0.2s ease',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    minHeight: '200px'
                  }}
                >
                  {tasksByStatus[column.id].map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      member={getMemberById(task.assigneeId)}
                      index={index}
                      isNew={newTaskIds.has(task.id)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
