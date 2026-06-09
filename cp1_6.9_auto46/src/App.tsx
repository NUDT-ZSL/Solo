import { useEffect, useState, useCallback } from 'react';
import Home from './pages/Home';
import ViewBottle from './pages/ViewBottle';
import WaveParticles from './components/WaveParticles';
import { BottleListItem, Stats } from './types';

type Route = { name: 'home' } | { name: 'bottle'; id: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { name: 'home' };
  if (hash.startsWith('bottle/')) {
    const id = hash.slice(7).toUpperCase();
    if (id) return { name: 'bottle', id };
  }
  return { name: 'home' };
}

function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [bottles, setBottles] = useState<BottleListItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    lockedCount: 0,
    totalCount: 0,
    recentOpened: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((newRoute: Route) => {
    if (newRoute.name === 'home') {
      window.location.hash = '#/';
    } else {
      window.location.hash = `#/bottle/${newRoute.id}`;
    }
    setRoute(newRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchBottles = useCallback(async () => {
    try {
      const res = await fetch('/api/bottles');
      if (res.ok) {
        const data = await res.json();
        setBottles(data);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (route.name === 'home') {
      fetchBottles();
      fetchStats();
      const interval = setInterval(fetchStats, 5000);
      return () => clearInterval(interval);
    }
  }, [route.name, fetchBottles, fetchStats]);

  const onCreateBottle = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchBottles().finally(() => setLoading(false));
    fetchStats();
  }, [fetchBottles, fetchStats]);

  return (
    <>
      {route.name === 'home' && <WaveParticles />}
      <div id="app-root-inner">
        {route.name === 'home' ? (
          <Home
            bottles={bottles}
            stats={stats}
            loading={loading}
            error={error}
            setError={setError}
            onNavigate={navigate}
            onCreateBottle={onCreateBottle}
          />
        ) : (
          <ViewBottle id={route.id} onNavigate={navigate} />
        )}
      </div>
    </>
  );
}

export default App;
