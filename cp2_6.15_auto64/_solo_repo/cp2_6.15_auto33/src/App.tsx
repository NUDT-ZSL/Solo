import { useGameStore } from './store/useGameStore';
import MatchPanel from './ui/MatchPanel';
import GamePage from './pages/GamePage';

export default function App() {
  const { matchStatus } = useGameStore();

  if (matchStatus === 'playing' || matchStatus === 'ended') {
    return <GamePage />;
  }

  return <MatchPanel />;
}
