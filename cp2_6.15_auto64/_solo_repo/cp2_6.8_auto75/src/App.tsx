import React from 'react';
import { useApp } from './context/AppContext';
import LandingPage from './components/LandingPage';
import EditorPanel from './components/EditorPanel';
import DashboardPanel from './components/DashboardPanel';
import BroadcastModal from './components/BroadcastModal';
import ErrorToast from './components/ErrorToast';

const App: React.FC = () => {
  const { role, broadcastCode, error, dismissBroadcastCode, clearError } = useApp();

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {!role && <LandingPage />}
      {role === 'student' && <EditorPanel />}
      {role === 'teacher' && <DashboardPanel />}
      {broadcastCode && (
        <BroadcastModal code={broadcastCode.code} from={broadcastCode.fromNickname} onClose={dismissBroadcastCode} />
      )}
      {error && <ErrorToast message={error} onClose={clearError} />}
    </div>
  );
};

export default App;
