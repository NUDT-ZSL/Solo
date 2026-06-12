import { useEffect, useState } from 'react';
import HostView from './HostView';
import Viewer from './Viewer';
import type { Role } from './types';

function App() {
  const [role, setRole] = useState<Role>('viewer');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'host') {
      setRole('host');
    } else {
      setRole('viewer');
    }
  }, []);

  return role === 'host' ? <HostView /> : <Viewer />;
}

export default App;
