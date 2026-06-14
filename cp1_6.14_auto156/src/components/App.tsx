import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Skill, ExchangeRequest, Review } from '../types';
import { apiService } from '../services/apiService';
import SkillCard from './SkillCard';
import MessageCenter from './MessageCenter';
import RequestModal from './RequestModal';
import SkillDetail from './SkillDetail';
import './App.css';

type PageType = 'home' | 'messages' | 'profile';

interface SkillWithUser extends Skill {
  user: User;
}

interface RequestWithDetails extends ExchangeRequest {
  fromUser?: User;
  toUser?: User;
  fromSkill?: Skill;
  toSkill?: Skill;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [skills, setSkills] = useState<SkillWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedSkill, setSelectedSkill] = useState<SkillWithUser | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTarget, setRequestTarget] = useState<SkillWithUser | null>(null);
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);

  useEffect(() => {
    apiService.getCurrentUser().then(setCurrentUser);
    loadSkills();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadRequests();
    }
  }, [currentUser]);

  const loadSkills = useCallback((search?: string) => {
    apiService.getSkills(search).then(setSkills);
  }, []);

  const loadRequests = useCallback(() => {
    if (currentUser) {
      apiService.getRequests(currentUser.id).then(setRequests);
    }
  }, [currentUser]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    loadSkills(value);
  }, [loadSkills]);

  const handleSkillClick = useCallback((skill: SkillWithUser) => {
    setSelectedSkill(skill);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSkill(null);
  }, []);

  const handleRequestExchange = useCallback((skill: SkillWithUser) => {
    setRequestTarget(skill);
    setShowRequestModal(true);
  }, []);

  const handleRequestSent = useCallback(() => {
    setShowRequestModal(false);
    setRequestTarget(null);
    loadRequests();
  }, [loadRequests]);

  const handleRequestUpdate = useCallback(() => {
    loadRequests();
    loadSkills();
  }, [loadRequests, loadSkills]);

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const keyword = searchQuery.toLowerCase();
    return skills.filter(s =>
      s.name.toLowerCase().includes(keyword) ||
      s.user.nickname.toLowerCase().includes(keyword)
    );
  }, [skills, searchQuery]);

  if (!currentUser) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="logo" onClick={() => setCurrentPage('home')}>
            Skill<span className="logo-accent">Exchange</span>
          </h1>
          
          {currentPage === 'home' && (
            <div className="search-box">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="搜索技能或用户..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          )}

          <nav className="nav">
            <button
              className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentPage('home')}
            >
              发现
            </button>
            <button
              className={`nav-btn ${currentPage === 'messages' ? 'active' : ''}`}
              onClick={() => setCurrentPage('messages')}
            >
              消息
              {requests.filter(r => r.status === 'pending' && r.toUserId === currentUser.id).length > 0 && (
                <span className="badge">
                  {requests.filter(r => r.status === 'pending' && r.toUserId === currentUser.id).length}
                </span>
              )}
            </button>
            <button
              className={`nav-btn ${currentPage === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentPage('profile')}
            >
              我的
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {currentPage === 'home' && (
          <div className="skills-grid">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                user={skill.user}
                onClick={() => handleSkillClick(skill)}
              />
            ))}
          </div>
        )}

        {currentPage === 'messages' && (
          <MessageCenter
            requests={requests}
            currentUserId={currentUser.id}
            onUpdate={handleRequestUpdate}
          />
        )}

        {currentPage === 'profile' && (
          <div className="profile-page">
            <div className="profile-header">
              <img src={currentUser.avatar} alt={currentUser.nickname} className="profile-avatar" />
              <h2>{currentUser.nickname}</h2>
              <p className="profile-subtitle">我的技能卡</p>
            </div>
            <div className="skills-grid">
              {currentUser.skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  user={currentUser}
                  onClick={() => handleSkillClick({ ...skill, user: currentUser })}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedSkill && (
        <SkillDetail
          skill={selectedSkill}
          currentUser={currentUser}
          onClose={handleCloseDetail}
          onRequestExchange={handleRequestExchange}
        />
      )}

      {showRequestModal && requestTarget && currentUser && (
        <RequestModal
          targetSkill={requestTarget}
          currentUser={currentUser}
          onClose={() => setShowRequestModal(false)}
          onSent={handleRequestSent}
        />
      )}
    </div>
  );
};

export default App;
