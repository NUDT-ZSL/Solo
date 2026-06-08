import { useRef } from 'react';
import GameCanvas from './GameCanvas';
import UILayer from './UILayer';
import type { GameEngine } from './GameEngine';

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <GameCanvas engineRef={engineRef} />
      <UILayer engineRef={engineRef} />
    </div>
  );
}
