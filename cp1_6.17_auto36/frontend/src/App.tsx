import React, { useState, useEffect, useCallback } from 'react';
import { Kanban } from './kanban';
import { Voting } from './voting';
import { Dashboard } from './dashboard';
import { api } from './api';
import type { Card, Project, TeamMember, RiskAlert } from './types';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [risks, setRisks] = useState<RiskAlert[]>([]);
  const [showVoting, setShowVoting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentUser] = useState<TeamMember>({
    id: 'u1',
    name: '张伟',
    role: 'manager'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsData, membersData] = await Promise.all([
        api.getProjects(),
        api.getTeamMembers()
      ]);
      
      setProjects(projectsData);
      setTeamMembers(membersData);
      
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  const loadProjectData = useCallback(async (projectId: string) => {
    try {
      const [cardsData, risksData] = await Promise.all([
        api.getCards(projectId),
        api.getRisks(projectId)
      ]);
      setCards(cardsData);
      setRisks(risksData);
    } catch (err) {
      console.error('Failed to load project data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject.id);
    }
  }, [selectedProject, loadProjectData]);

  const highRiskCardIds = new Set(
    risks.filter(r => r.level === 'high').map(r => r.cardId)
  );

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setSidebarOpen(false);
  };

  const handleCardsChange = (newCards: Card[]) => {
    setCards(newCards);
  };

  const handleVotingConfirm = () => {
    setShowVoting(false);
    if (selectedProject) {
      loadProjectData(selectedProject.id);
    }
  };

  const handleRefresh = () => {
    if (selectedProject) {
      loadProjectData(selectedProject.id);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button 
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <h1 className="app-title">
          <span className="logo">📊</span>
          Project Pulse
        </h1>
        <div className="user-info">
          <span className="user-name">{currentUser.name}</span>
          <span className="user-role">
            {currentUser.role === 'manager' ? '项目经理' : 
             currentUser.role === 'tech_lead' ? '技术负责人' :
             currentUser.role === 'designer' ? '设计师' : '开发者'}
          </span>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>项目列表</h3>
          </div>
          <div className="project-list">
            {projects.map(project => (
              <div
                key={project.id}
                className={`project-item ${selectedProject?.id === project.id ? 'active' : ''}`}
                onClick={() => handleProjectSelect(project)}
              >
                <div className="project-icon">📁</div>
                <div className="project-info">
                  <div className="project-name">{project.name}</div>
                  <div className="project-desc">{project.description}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="main-content">
          {selectedProject ? (
            <>
              <div className="project-header">
                <div>
                  <h2 className="project-title">{selectedProject.name}</h2>
                  <p className="project-description">{selectedProject.description}</p>
                </div>
                <button className="btn btn-refresh" onClick={handleRefresh}>
                  🔄 刷新
                </button>
              </div>

              <div className="content-grid">
                <div className="kanban-section">
                  <Kanban
                    cards={cards}
                    onCardsChange={handleCardsChange}
                    teamMembers={teamMembers}
                    highRiskCardIds={highRiskCardIds}
                    onOpenVoting={() => setShowVoting(true)}
                    projectId={selectedProject.id}
                  />
                </div>

                <div className="dashboard-section">
                  <Dashboard
                    projectId={selectedProject.id}
                    teamMembers={teamMembers}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="no-project">
              <div className="no-project-icon">📋</div>
              <h3>请选择一个项目</h3>
              <p>从左侧项目列表中选择一个项目开始管理</p>
            </div>
          )}
        </main>
      </div>

      {showVoting && selectedProject && (
        <Voting
          cards={cards}
          currentUser={currentUser}
          onClose={() => setShowVoting(false)}
          onConfirm={handleVotingConfirm}
          minVoters={3}
        />
      )}
    </div>
  );
};

export default App;
