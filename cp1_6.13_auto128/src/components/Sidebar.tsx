import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAppContext } from '../App'
import type { Project } from '../types'

const statusColors: Record<string, string> = {
  '创作中': '#f97316',
  '排练中': '#6366f1',
  '已发布': '#22c55e',
}

function ProjectCard({ project, collapsed }: { project: Project; collapsed: boolean }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(`/project/${project._id}`)

  if (collapsed) {
    return (
      <NavLink
        to={`/project/${project._id}`}
        className="sidebar-icon-item"
        title={project.name}
      >
        <div
          className="sidebar-icon-badge"
          style={{ backgroundColor: project.themeColor }}
        >
          {project.name.charAt(0)}
        </div>
      </NavLink>
    )
  }

  return (
    <NavLink
      to={`/project/${project._id}`}
      className={`sidebar-project-card ${isActive ? 'active' : ''}`}
      style={{ '--theme-color': project.themeColor } as React.CSSProperties}
    >
      <div
        className="sidebar-project-colorbar"
        style={{ backgroundColor: project.themeColor }}
      />
      <div className="sidebar-project-body">
        <div className="sidebar-project-top">
          <span className="sidebar-project-name" title={project.name}>
            {project.name}
          </span>
          <span
            className="sidebar-project-status"
            style={{ color: statusColors[project.status] }}
          >
            ● {project.status}
          </span>
        </div>
        <div className="sidebar-project-bottom">
          <div className="sidebar-project-genres">
            {project.genres?.slice(0, 3).map((g, i) => (
              <span key={i} className="sidebar-genre-tag">
                {g}
              </span>
            ))}
            {(project.genres?.length || 0) > 3 && (
              <span className="sidebar-genre-tag">+{project.genres!.length - 3}</span>
            )}
          </div>
          <div className="sidebar-project-avatars">
            {project.members?.slice(0, 4).map((m, i) => (
              <img
                key={m.id}
                src={m.avatar}
                alt={m.name}
                className="sidebar-member-avatar"
                style={{ zIndex: 4 - i, marginLeft: i > 0 ? '-10px' : '0' }}
              />
            ))}
            {(project.members?.length || 0) > 4 && (
              <span
                className="sidebar-member-avatar sidebar-member-more"
                style={{ marginLeft: '-10px' }}
              >
                +{project.members!.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>
    </NavLink>
  )
}

export default function Sidebar() {
  const { state, dispatch } = useAppContext()
  const navigate = useNavigate()

  const handleNewProject = () => {
    window.dispatchEvent(new CustomEvent('showCreateModal'))
  }

  const handleToggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }

  return (
    <aside
      className={`sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}`}
    >
      <div className="sidebar-header">
        {!state.sidebarCollapsed ? (
          <>
            <div className="sidebar-logo">
              <span className="sidebar-logo-icon">🎵</span>
              <span className="sidebar-logo-text">BandCollab</span>
            </div>
            <button
              className="sidebar-collapse-btn"
              onClick={handleToggleSidebar}
              title="收起侧边栏"
            >
              «
            </button>
          </>
        ) : (
          <button
            className="sidebar-collapse-btn center"
            onClick={handleToggleSidebar}
            title="展开侧边栏"
          >
            »
          </button>
        )}
      </div>

      <div className="sidebar-user-section">
        {state.user && !state.sidebarCollapsed ? (
          <div className="sidebar-user-card">
            <img
              src={state.user.avatar}
              alt={state.user.name}
              className="sidebar-user-avatar"
            />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{state.user.name}</div>
              <div className="sidebar-user-label">当前用户</div>
            </div>
          </div>
        ) : (
          state.user && (
            <div className="sidebar-user-icon-only" title={state.user.name}>
              <img
                src={state.user.avatar}
                alt={state.user.name}
                className="sidebar-user-avatar"
              />
            </div>
          )
        )}
      </div>

      <div className="sidebar-actions">
        {!state.sidebarCollapsed ? (
          <button className="sidebar-btn-primary" onClick={handleNewProject}>
            <span className="sidebar-btn-icon">+</span>
            <span>新建项目</span>
          </button>
        ) : (
          <button
            className="sidebar-btn-icon-only"
            onClick={handleNewProject}
            title="新建项目"
          >
            +
          </button>
        )}
      </div>

      <div className="sidebar-divider">
        {!state.sidebarCollapsed && <span>我的项目</span>}
      </div>

      <div className="sidebar-projects-list">
        {state.projects.map(project => (
          <ProjectCard
            key={project._id}
            project={project}
            collapsed={state.sidebarCollapsed}
          />
        ))}
        {state.projects.length === 0 && !state.sidebarCollapsed && (
          <div className="sidebar-empty">暂无项目</div>
        )}
      </div>

      <div className="sidebar-footer">
        {!state.sidebarCollapsed && (
          <div className="sidebar-footer-text">BandCollab Studio v1.0</div>
        )}
      </div>
    </aside>
  )
}
