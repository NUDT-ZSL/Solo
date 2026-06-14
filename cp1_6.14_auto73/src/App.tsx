import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import JobBoard from './components/JobBoard';
import JobDetail from './components/JobDetail';
import CandidateBoard from './components/CandidateBoard';
import { candidatesApi } from './utils/api';
import type { Candidate } from './types';

type View = 'jobs' | 'candidates' | 'job-detail';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('jobs');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadCandidates = useCallback(async () => {
    try {
      const data = await candidatesApi.getAll();
      setCandidates(data);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates, refreshKey]);

  const onboardCount = candidates.filter((c) => {
    if (c.stage !== 'offer' || !c.offer?.onboardDate) return false;
    const onboard = new Date(c.offer.onboardDate);
    const now = new Date();
    const diff = onboard.getTime() - now.getTime();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const handleNavigate = (view: string) => {
    if (view === 'jobs') {
      setCurrentView('jobs');
      setSelectedJobId(null);
    } else if (view === 'candidates') {
      setCurrentView('candidates');
      setSelectedJobId(null);
    }
  };

  const handleJobClick = (jobId: string) => {
    setSelectedJobId(jobId);
    setCurrentView('job-detail');
  };

  const handleBack = () => {
    setCurrentView('jobs');
    setSelectedJobId(null);
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  const renderContent = () => {
    switch (currentView) {
      case 'jobs':
        return <JobBoard onJobClick={handleJobClick} onRefresh={refresh} />;
      case 'job-detail':
        return selectedJobId ? (
          <JobDetail jobId={selectedJobId} onBack={handleBack} onRefresh={refresh} />
        ) : null;
      case 'candidates':
        return <CandidateBoard candidates={candidates} onRefresh={refresh} />;
      default:
        return <JobBoard onJobClick={handleJobClick} onRefresh={refresh} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentView={currentView === 'job-detail' ? 'jobs' : currentView}
        onNavigate={handleNavigate}
        onboardCount={onboardCount}
      />
      <div className="main-content">
        {onboardCount > 0 && (
          <div className="badge-count">{onboardCount}</div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
