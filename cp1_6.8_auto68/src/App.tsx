import GameCanvas from '@/components/GameCanvas';
import UILayer from '@/components/UILayer';

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
      <GameCanvas />
      <UILayer />
    </div>
  );
}
