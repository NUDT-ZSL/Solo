import { useRef, useEffect, useState, useCallback } from 'react';
import { OceanScene, type BubbleData } from '@/utils/OceanScene';
import { useOceanStore } from '@/store/oceanStore';
import ControlPanel from '@/components/ControlPanel';
import WritePoemModal from '@/components/WritePoemModal';
import PoemCard from '@/components/PoemCard';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<OceanScene | null>(null);
  const addedIdsRef = useRef<Set<string>>(new Set());
  const { poems, refreshOcean } = useOceanStore();
  const [bubbleCount, setBubbleCount] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const scene = new OceanScene(canvasRef.current);
    sceneRef.current = scene;

    scene.setCallbacks(
      (data: BubbleData) => {
        useOceanStore.getState().setPoemCardData(data);
      },
      () => {}
    );

    scene.start();

    for (const poem of useOceanStore.getState().poems) {
      scene.addBubble(poem);
      addedIdsRef.current.add(poem.id);
    }

    const interval = setInterval(() => {
      setBubbleCount(scene.getBubbleCount());
    }, 500);

    return () => {
      scene.stop();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    for (const poem of poems) {
      if (!addedIdsRef.current.has(poem.id)) {
        scene.addBubble(poem);
        addedIdsRef.current.add(poem.id);
      }
    }
  }, [poems]);

  useEffect(() => {
    const unsub = useOceanStore.subscribe((state, prev) => {
      const scene = sceneRef.current;
      if (!scene) return;

      if (state.collectedPoems.length > prev.collectedPoems.length) {
        const newCollected = state.collectedPoems.filter(
          p => !prev.collectedPoems.some(pp => pp.id === p.id)
        );
        for (const poem of newCollected) {
          scene.removeBubble(poem.id);
          addedIdsRef.current.delete(poem.id);
        }
      }
    });
    return unsub;
  }, []);

  const handleRefresh = useCallback(() => {
    refreshOcean();
    addedIdsRef.current.clear();
    if (sceneRef.current) {
      sceneRef.current.refreshOcean();
      for (const poem of useOceanStore.getState().poems) {
        sceneRef.current.addBubble(poem);
        addedIdsRef.current.add(poem.id);
      }
    }
  }, [refreshOcean]);

  return (
    <div className="ocean-page">
      <canvas ref={canvasRef} className="ocean-canvas" />
      <ControlPanel bubbleCount={bubbleCount} onRefresh={handleRefresh} />
      <WritePoemModal />
      <PoemCard />
    </div>
  );
}
