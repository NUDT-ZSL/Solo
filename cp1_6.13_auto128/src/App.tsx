import React, { useReducer, useEffect, useCallback, createContext, useContext } from 'react'
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import type { AppState, AppAction, Project, Paragraph, Member, StageConfirmation } from './types'
import { projectAPI, paragraphAPI } from './api'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import ProgressPanel from './components/ProgressPanel'
import CreateProjectModal from './components/CreateProjectModal'
import JoinProjectModal from './components/JoinProjectModal'
import ProjectOverview from './components/ProjectOverview'

const initialState: AppState = {
  user: null,
  projects: [],
  currentProject: null,
  paragraphs: [],
  sidebarCollapsed: false,
  loading: false,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload }
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload }
    case 'ADD_PROJECT':
      return { ...state, projects: [action.payload, ...state.projects] }
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload }
    case 'UPDATE_PROJECT': {
      const projects = state.projects.map(p =>
        p._id === action.payload._id ? action.payload : p
      )
      const currentProject =
        state.currentProject?._id === action.payload._id ? action.payload : state.currentProject
      return { ...state, projects, currentProject }
    }
    case 'SET_PARAGRAPHS':
      return { ...state, paragraphs: action.payload }
    case 'ADD_PARAGRAPH':
      return { ...state, paragraphs: [...state.paragraphs, action.payload] }
    case 'UPDATE_PARAGRAPH':
      return {
        ...state,
        paragraphs: state.paragraphs.map(p =>
          p._id === action.payload._id ? action.payload : p
        ),
      }
    case 'REMOVE_PARAGRAPH':
      return {
        ...state,
        paragraphs: state.paragraphs.filter(p => p._id !== action.payload),
      }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'ADD_MEMBER': {
      const projects = state.projects.map(p => {
        if (p._id === action.payload.projectId) {
          return { ...p, members: [...p.members, action.payload.member] }
        }
        return p
      })
      const currentProject =
        state.currentProject?._id === action.payload.projectId
          ? { ...state.currentProject, members: [...state.currentProject.members, action.payload.member] }
          : state.currentProject
      return { ...state, projects, currentProject }
    }
    case 'UPDATE_CONFIRMATIONS': {
      if (!state.currentProject) return state
      const updated = { ...state.currentProject, confirmations: action.payload }
      const projects = state.projects.map(p =>
        p._id === updated._id ? updated : p
      )
      return { ...state, currentProject: updated, projects }
    }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  createProject: (data: { name: string; genres: string[]; description: string }) => Promise<Project>
  joinProject: (projectId: string, inviteCode: string) => Promise<void>
  exportScore: (projectId: string, projectName: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext 必须在 AppProvider 内使用')
  return ctx
}

const getOrCreateUser = () => {
  try {
    const stored = localStorage.getItem('band_collab_user')
    if (stored) return JSON.parse(stored)
    const names = ['小李', '阿杰', '小林', '小王', '阿辰', '小熊']
    const randomName = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100)
    const user = {
      id: 'u_' + Date.now().toString(36),
      name: randomName,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(randomName)}`,
    }
    localStorage.setItem('band_collab_user', JSON.stringify(user))
    return user
  } catch {
    return {
      id: 'u_default',
      name: '用户' + Date.now().toString().slice(-4),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    }
  }
}

function AppContent() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    const user = getOrCreateUser()
    dispatch({ type: 'SET_USER', payload: user })
    loadProjects()
  }, [])

  useEffect(() => {
    if (id && state.user) {
      loadProjectDetail(id)
    } else {
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: null })
      dispatch({ type: 'SET_PARAGRAPHS', payload: [] })
    }
  }, [id, state.user?.id])

  const loadProjects = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const projects = await projectAPI.list()
      dispatch({ type: 'SET_PROJECTS', payload: projects })
    } catch (err) {
      console.error('加载项目列表失败:', err)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const loadProjectDetail = async (projectId: string) => {
    try {
      const project = await projectAPI.get(projectId)
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project })
      const paragraphs = await paragraphAPI.list(projectId)
      dispatch({ type: 'SET_PARAGRAPHS', payload: paragraphs })
    } catch (err) {
      console.error('加载项目详情失败:', err)
    }
  }

  const createProject = async (data: { name: string; genres: string[]; description: string }) => {
    if (!state.user) throw new Error('用户未登录')
    const project = await projectAPI.create({
      ...data,
      leaderName: state.user.name,
      leaderAvatar: state.user.avatar,
    })
    dispatch({ type: 'ADD_PROJECT', payload: project })
    return project
  }

  const joinProject = async (projectId: string, inviteCode: string) => {
    if (!state.user) throw new Error('用户未登录')
    const result = await projectAPI.join(projectId, {
      inviteCode,
      memberName: state.user.name,
      memberAvatar: state.user.avatar,
    })
    dispatch({ type: 'ADD_MEMBER', payload: { projectId, member: result.member } })
    await loadProjectDetail(projectId)
  }

  const exportScore = async (projectId: string, projectName: string) => {
    const data = await projectAPI.export(projectId)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}_export.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const value: AppContextValue = {
    state,
    dispatch,
    createProject,
    joinProject,
    exportScore,
  }

  const sidebarWidth = state.sidebarCollapsed ? '60px' : '280px'

  return (
    <AppContext.Provider value={value}>
      <div className="app-container">
        <Sidebar />
        <div
          className="main-content"
          style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.3s ease' }}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/project/:id" element={<ProjectPage />} />
            <Route path="/project/:id/editor" element={<EditorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <GlobalModals />
    </AppContext.Provider>
  )
}

function HomePage() {
  const { state } = useAppContext()
  return (
    <div className="home-page">
      <div className="home-header">
        <h1>🎵 BandCollab Studio</h1>
        <p>乐队协作创作平台 · 灵感不再被距离阻挡</p>
      </div>
      <div className="home-content">
        <div className="home-stats">
          <div className="stat-card">
            <div className="stat-number">{state.projects.length}</div>
            <div className="stat-label">项目总数</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {state.projects.filter(p => p.status === '创作中').length}
            </div>
            <div className="stat-label">创作中</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {state.projects.filter(p => p.status === '已发布').length}
            </div>
            <div className="stat-label">已发布</div>
          </div>
        </div>
        {state.projects.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎸</div>
            <h3>还没有项目</h3>
            <p>在左侧点击「+ 新建项目」开始你的音乐创作之旅</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectPage() {
  const { state } = useAppContext()
  if (!state.currentProject) {
    return <div className="loading-page">加载中...</div>
  }
  return <ProjectOverview />
}

function EditorPage() {
  const { state } = useAppContext()
  if (!state.currentProject) {
    return <div className="loading-page">加载中...</div>
  }
  return <Editor />
}

function GlobalModals() {
  const { state } = useAppContext()
  const [showCreate, setShowCreate] = React.useState(false)
  const [showJoin, setShowJoin] = React.useState(false)

  useEffect(() => {
    const handleShowCreate = () => setShowCreate(true)
    const handleShowJoin = () => setShowJoin(true)
    window.addEventListener('showCreateModal', handleShowCreate)
    window.addEventListener('showJoinModal', handleShowJoin)
    return () => {
      window.removeEventListener('showCreateModal', handleShowCreate)
      window.removeEventListener('showJoinModal', handleShowJoin)
    }
  }, [])

  return (
    <>
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      {showJoin && state.currentProject && (
        <JoinProjectModal onClose={() => setShowJoin(false)} />
      )}
    </>
  )
}

export default function App() {
  return <AppContent />
}
