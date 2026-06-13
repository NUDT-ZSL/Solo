import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';

const AppContent: React.FC = () => {
  const { currentUser, login } = useApp();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'meeting'>('dashboard');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await login('user1');
      } catch (error) {
        console.error('登录失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [login]);

  const handleMeetingClick = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setCurrentPage('meeting');
  };

  const handleBackToDashboard = () => {
    setSelectedMeetingId(null);
    setCurrentPage('dashboard');
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>正在加载...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={styles.loginContainer}>
        <h1 style={styles.loginTitle}>BookCollab</h1>
        <p style={styles.loginSubtitle}>在线选题协作与决策平台</p>
        <button
          style={styles.loginButton}
          onClick={() => login('user1')}
        >
          以张编辑身份登录
        </button>
      </div>
    );
  }

  return (
    <div style={styles.app