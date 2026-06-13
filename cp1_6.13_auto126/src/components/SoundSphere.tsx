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
  const addedRef = useRef(false);
  const prevPositionRef = useRef({
    x: source.position.x,
    y: source.position.y,
    z: source.position.z,
  });

  useEffect(() => {
    if (!sceneManager) return;
    if (!addedRef.current) {
      sceneManager.addSphere(source);
      addedRef.current = true;
      prevPositionRef.current = {
        x: source.position.x,
        y: source.position.y,
        z: source.position.z,
      };
    }
    return () => {
      if (addedRef.current && sceneManager) {
        sceneManager.removeSphere(source.id);
        addedRef.current = false;
      }
    };
  }, [source.id, sceneManager]);

  useEffect(() => {
    if (!sceneManager || !addedRef.current) return;
    sceneManager.selectSphere(isSelected ? source.id : null);
  }, [isSelected, source.id, sceneManager]);

  useEffect(() => {
    if (!sceneManager || !addedRef.current) return;
    const p = source.position;
    const prev = prevPositionRef.current;
    if (p.x !== prev.x || p.y !== prev.y || p.z !== prev.z) {
      sceneManager.updateSpherePosition(source.id, p.x, p.y, p.z);
      prevPositionRef.current = { x: p.x, y: p.y, z: p.z };
    }
  }, [source.id, source.position.x, source.position.y, source.position.z, sceneManager]);

  return null;
};

export default SoundSphere;
