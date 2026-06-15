import { useState, useEffect } from 'react';
import PanelEditor from './pages/PanelEditor';
import { useStore } from './store/useStore';
import { auth } from './utils/auth';
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const { setUser: setStoreUser } = useStore();

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    setUser(currentUser);
    setStoreUser(currentUser);
  }, [setStoreUser]);

  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-color)',
          fontSize: 16,
          color: '#666'
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div className="app">
      <PanelEditor user={user} />
    </div>
  );
}

export default App;
