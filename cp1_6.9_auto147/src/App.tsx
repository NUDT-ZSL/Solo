import { useEffect, useRef, useState } from 'react';
import { initGame, updateGame, handleInput, getGameData } from './gameEngine';
import { renderGame } from './renderer';
import { InputState } from './types';

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const gameInitializedRef = useRef<boolean>(false);
  const inputRef = useRef<InputState>({
    warm: { up: false, down: false, left: false, right: false },
    cool: { up: false, down: false, left: false, right: false },
    space: false,
  });
  const spacePressedRef = useRef<boolean>(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setCanvasSize({ width, height });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!gameInitializedRef.current) {
      initGame(canvasSize.width, canvasSize.height);
      gameInitializedRef.current = true;
    }

    const gameLoop = (time: number) => {
      const data = getGameData();
      if (data) {
        data.creatures.warm.input = { ...inputRef.current.warm };
        data.creatures.cool.input = { ...inputRef.current.cool };
      }

      if (inputRef.current.space && !spacePressedRef.current) {
        spacePressedRef.current = true;
        handleInput(inputRef.current);
      }
      if (!inputRef.current.space) {
        spacePressedRef.current = false;
      }

      updateGame(time);
      renderGame(ctx, canvasSize.width, canvasSize.height);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          inputRef.current.warm.up = true;
          break;
        case 'KeyS':
          inputRef.current.warm.down = true;
          break;
        case 'KeyA':
          inputRef.current.warm.left = true;
          break;
        case 'KeyD':
          inputRef.current.warm.right = true;
          break;
        case 'ArrowUp':
          e.preventDefault();
          inputRef.current.cool.up = true;
          break;
        case 'ArrowDown':
          e.preventDefault();
          inputRef.current.cool.down = true;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          inputRef.current.cool.left = true;
          break;
        case 'ArrowRight':
          e.preventDefault();
          inputRef.current.cool.right = true;
          break;
        case 'Space':
          e.preventDefault();
          inputRef.current.space = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          inputRef.current.warm.up = false;
          break;
        case 'KeyS':
          inputRef.current.warm.down = false;
          break;
        case 'KeyA':
          inputRef.current.warm.left = false;
          break;
        case 'KeyD':
          inputRef.current.warm.right = false;
          break;
        case 'ArrowUp':
          inputRef.current.cool.up = false;
          break;
        case 'ArrowDown':
          inputRef.current.cool.down = false;
          break;
        case 'ArrowLeft':
          inputRef.current.cool.left = false;
          break;
        case 'ArrowRight':
          inputRef.current.cool.right = false;
          break;
        case 'Space':
          inputRef.current.space = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default App;
