import { useReducer, useEffect, useCallback, useState, useMemo, useRef } from 'react'
import type { AppState, Action, Task, TaskStatus } from './types'
import {
  generateMockMembers,
  generateMockTasks,
  calculateProgress,
  saveToLocalStorage,
  loadFromLocalStorage
} from './utils'
import Board from './Board'
import StatsPanel from './StatsPanel'
import TaskModal from './TaskModal'

const STORAGE_KEY = 'kanbandflow_data'

const initialState: AppState = {
  tasks: [],
  members: [],
  searchKeyword: ''
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT_DATA':
      return {
        ...state,
        tasks: action.payload.tasks,
        members: action.payload.members
      }
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [action.payload, ...state.tasks]
      }
    case 'UPDATE_TASK_STATUS': {
      const { taskId, newStatus } = action.payload
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      }
    }
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        )
      }
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      }
    case 'SET_SEARCH_KEYWORD':
      return {
        ...state,
        searchKeyword: action.payload
      }
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [newTaskId, setNewTaskId] = useState<string | null>(null)
  const [displayProgress, setDisplayProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const currentProgressRef = useRef(0)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const savedData = loadFromLocalStorage<{ tasks: Task[]; members: any[] } | null>(STORAGE_KEY, null)
    if (savedData && savedData.tasks.length > 0) {
      dispatch({
        type: 'INIT_DATA',
        payload: savedData
      })
    } else {
      const members = generateMockMembers()
      const tasks = generateMockTasks(members)
      dispatch({
        type: 'INIT_DATA',
        payload: { tasks, members }
      })
    }
  }, [])

  useEffect(() => {
    if (state.tasks.length > 0 && state.members.length > 0) {
      const timer = setTimeout(() => {
        saveToLocalStorage(STORAGE_KEY, {
          tasks: state.tasks,
          members: state.members
        })
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [state.tasks, state.members])

  const progress = useMemo(() => calculateProgress(state.tasks), [state.tasks])

  useEffect(() => {
    const startValue = currentProgressRef.current
    const endValue = progress
    const duration = 300
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progressRatio = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progressRatio, 3)
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOut)
      setDisplayProgress(currentValue)
      currentProgressRef.current = currentValue

      if (progressRatio < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        currentProgressRef.current = endValue
      }
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [progress])

  const debouncedSetSearch = useCallback((value: string) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchTimerRef.current = setTimeout(() => {
      dispatch({ type: 'SET_SEARCH_KEYWORD', payload: value })
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
    debouncedSetSearch(e.target.value)
  }, [debouncedSetSearch])

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return

    const { draggableId, destination } = result
    const newStatus = destination.droppableId as TaskStatus

    dispatch({
      type: 'UPDATE_TASK_STATUS',
      payload: { taskId: draggableId, newStatus }
    })
  }, [])

  const handleCreateTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTaskIdValue = crypto.randomUUID()
    const newTask: Task = {
      ...taskData,
      id: newTaskIdValue,
      createdAt: Date.now()
    }
    dispatch({ type: 'ADD_TASK', payload: newTask })
    setNewTaskId(newTaskIdValue)
    setIsModalOpen(false)

    setTimeout(() => {
      setNewTaskId(null)
    }, 1000)
  }, [])

  const filteredTasks = useMemo(() => {
    if (!state.searchKeyword.trim()) return state.tasks
    const keyword = state.searchKeyword.toLowerCase()
    return state.tasks.filter(task =>
      task.title.toLowerCase().includes(keyword) ||
      task.description.toLowerCase().includes(keyword)
    )
  }, [state.tasks, state.searchKeyword])

  const maxVisibleMembers = 5
  const visibleMembers = state.members.slice(0, maxVisibleMembers)
  const extraMembersCount = state.members.length > maxVisibleMembers
    ? state.members.length - maxVisibleMembers
    : 0

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <nav style={{
        height: '56px',
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>
          KanbandFlow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="搜索任务..."
              value={searchInput}
              onChange={handleSearchChange}
              style={{
                width: '280px',
                height: '36px',
                padding: '0 12px 0 36px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#f5f5f5'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1976d2'
                e.target.style.background = '#ffffff'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0'
                e.target.style.background = '#f5f5f5'
              }}
            />
            <svg
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: '#999'
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {visibleMembers.map((member, index) => (
              <div
                key={member.id}
                title={member.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  marginLeft: index > 0 ? '-8px' : '0',
                  overflow: 'hidden',
                  background: member.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  zIndex: visibleMembers.length - index
                }}
              >
                {member.name.charAt(0)}
              </div>
            ))}
            {extraMembersCount > 0 && (
              <div
                title={`还有 ${extraMembersCount} 位成员`}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  marginLeft: '-8px',
                  background: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '12px',
                  fontWeight: 600,
                  zIndex: 0
                }}
              >
                +{extraMembersCount}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #66bb6a 0%, #42a5f5 100%)',
                  width: `${displayProgress}%`,
                  transition: 'width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#333',
              minWidth: '60px',
              textAlign: 'right',
              transition: 'color 0.3s ease'
            }}
          >
            {displayProgress}%
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 16px', position: 'relative' }}>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            position: 'absolute',
            top: '0',
            right: '24px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: '#1976d2',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '24px',
            transition: 'background-color 0.2s, transform 0.1s',
            boxShadow: '0 4px 12px rgba(25,118,210,0.4)',
            zIndex: 50
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1565c0'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1976d2'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.96)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          +
        </button>

        <Board
          tasks={filteredTasks}
          members={state.members}
          onDragEnd={handleDragEnd}
          newTaskId={newTaskId}
        />
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        <StatsPanel tasks={state.tasks} members={state.members} />
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateTask}
        members={state.members}
        milestones={[
          '产品原型设计',
          '前端页面开发',
          '后端接口开发',
          '数据库设计',
          '用户测试',
          '性能优化',
          '功能迭代',
          'Bug修复',
          '文档完善',
          '代码审查'
        ]}
      />
    </div>
  )
}
