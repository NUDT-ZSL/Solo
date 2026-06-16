import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Scene from './components/Scene';
import ControlPanel from './components/ControlPanel';
import moleculeDataRaw from '../data/molecule.json';
import {
  parseMoleculeData,
  rotateDihedral,
  computeConformationEnergy,
  computeDihedralAngle,
  type Atom,
  type MoleculeData,
} from './logic/MoleculeEngine';
import './App.css';

function App() {
  const moleculeData: MoleculeData = useMemo(
    () => parseMoleculeData(moleculeDataRaw),
    []
  );

  const initialAtoms = useMemo(() => {
    return rotateDihedral(
      moleculeData.atoms,
      moleculeData.dihedralAtoms,
      moleculeData.initialDihedral
    );
  }, [moleculeData]);

  const [atoms, setAtoms] = useState<Atom[]>(initialAtoms);
  const [originalAtoms, setOriginalAtoms] = useState<Atom[]>(initialAtoms);
  const [savedAtoms, setSavedAtoms] = useState<Atom[] | null>(null);
  const [currentDihedral, setCurrentDihedral] = useState<number>(
    moleculeData.initialDihedral
  );
  const [targetDihedral, setTargetDihedral] = useState<number>(
    moleculeData.initialDihedral
  );
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);

  const animationRef = useRef<number | null>(null);
  const originalAtomsRef = useRef<Atom[]>(initialAtoms);

  useEffect(() => {
    originalAtomsRef.current = originalAtoms;
  }, [originalAtoms]);

  const energy = useMemo(() => {
    return computeConformationEnergy(atoms);
  }, [atoms]);

  const dihedralAngle = useMemo(() => {
    return computeDihedralAngle(atoms, moleculeData.dihedralAtoms);
  }, [atoms, moleculeData.dihedralAtoms]);

  const backgroundIntensity = useMemo(() => {
    const maxAngle = 180;
    return Math.min(
      Math.abs(dihedralAngle - moleculeData.initialDihedral) / maxAngle,
      1
    );
  }, [dihedralAngle, moleculeData.initialDihedral]);

  const backgroundColor = useMemo(() => {
    const t = backgroundIntensity;
    const r1 = 11, g1 = 12, b1 = 16;
    const r2 = 44, g2 = 62, b2 = 80;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    const alpha = 0.4 + t * 0.6;
    return `linear-gradient(135deg, rgb(${r1}, ${g1}, ${b1}) 0%, rgba(${r}, ${g}, ${b}, ${alpha}) 100%)`;
  }, [backgroundIntensity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const diff = targetDihedral - currentDihedral;
    if (Math.abs(diff) < 0.1) return;

    const duration = 500;
    const startTime = performance.now();
    const startAngle = currentDihedral;
    const startAtoms = [...originalAtomsRef.current];

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const newAngle = startAngle + diff * eased;

      setCurrentDihedral(newAngle);
      setAtoms(
        rotateDihedral(startAtoms, moleculeData.dihedralAtoms, newAngle)
      );

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetDihedral, moleculeData.dihedralAtoms, currentDihedral]);

  const handleDihedralChange = useCallback((angle: number) => {
    setTargetDihedral(angle);
  }, []);

  const handleReset = useCallback(() => {
    setOriginalAtoms(initialAtoms);
    originalAtomsRef.current = initialAtoms;
    setTargetDihedral(moleculeData.initialDihedral);
    setCurrentDihedral(moleculeData.initialDihedral);
    setAtoms(initialAtoms);
    setSavedAtoms(null);
    setIsComparisonMode(false);
  }, [moleculeData, initialAtoms]);

  const handleSaveConformation = useCallback(() => {
    setSavedAtoms(atoms.map((a) => ({ ...a })));
  }, [atoms]);

  const handleToggleComparison = useCallback(() => {
    if (!savedAtoms) {
      setSavedAtoms(atoms.map((a) => ({ ...a })));
    }
    setIsComparisonMode((prev) => !prev);
  }, [savedAtoms, atoms]);

  return (
    <div
      className="app-container"
      style={{
        background: backgroundColor,
      }}
    >
      <header className="title-bar">
        <div className="title-left">
          <span className="molecule-name">{moleculeData.name}</span>
        </div>
        <div className="title-right">
          <div className="dihedral-value">
            二面角: {dihedralAngle.toFixed(1)}°
          </div>
          <div className="energy-badge">
            <span className="energy-value">{energy.toFixed(2)}</span>
            <span className="energy-unit">kcal/mol</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <ControlPanel
          dihedralAngle={targetDihedral}
          onDihedralChange={handleDihedralChange}
          onReset={handleReset}
          onSaveConformation={handleSaveConformation}
          onToggleComparison={handleToggleComparison}
          isComparisonMode={isComparisonMode}
          hasSavedConformation={savedAtoms !== null}
        />

        <div className="scene-container">
          <Scene
            atoms={atoms}
            bonds={moleculeData.bonds}
            dihedralAtomIds={moleculeData.dihedralAtoms}
            isComparisonMode={isComparisonMode}
            referenceAtoms={savedAtoms}
            isInitialAnimating={isAnimating}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
