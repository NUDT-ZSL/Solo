import React, { useEffect, useRef } from 'react';
import { SoundSource } from '../audio/AudioEngine';
import { SceneManager } from '../scene/SceneManager';

interface SoundSphereProps {
  source: SoundSource;
  sceneManager: SceneManager | null;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SoundSource>) => void;
}

const SoundSphere: React.FC<SoundSphereProps> = ({
  source,
  sceneManager,
  isSelected,
  onSelect,
  onUpdate,
}) => {
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sceneManager) return;

    if (prevIdRef.current && prevIdRef.current !== source.id) {
      sceneManager.removeSphere(prevIdRef.current);
    }

    if (!prevIdRef.current || prevIdRef.current !== source.id) {
      sceneManager.addSphere(source);
      prevIdRef.current = source.id;
    }

    return () => {
      if (prevIdRef.current && sceneManager) {
        sceneManager.removeSphere(prevIdRef.current);
        prevIdRef.current = null;
      }
    };
  }, [source.id]);

  useEffect(() => {
    if (!sceneManager) return;
    sceneManager.selectSphere(isSelected ? source.id : null);
  }, [isSelected, source.id, sceneManager]);

  useEffect(() => {
    if (!sceneManager) return;
    sceneManager.updateSpherePosition(
      source.id,
      source.position.x,
      source.position.y,
      source.position.z
    );
  }, [source.position.x, source.position.y, source.position.z, sceneManager]);

  return null;
};

export default SoundSphere;
