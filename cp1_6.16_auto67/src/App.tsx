import { useState, useEffect, useCallback, useMemo } from 'react';
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

  const initialActualDihedral = useMemo(() => {
    return computeDihedralAngle(moleculeData.atoms, moleculeData.dihedralAtoms);
  }, [moleculeData]);

  const [atoms, setAtoms] = useState<Atom[]>(moleculeData.atoms);
  const [originalAtoms, setOriginalAtoms] = useState<Atom[]>(moleculeData.atoms);
  const [savedAtoms, setSavedAtoms] = useState<Atom[] | null>(null);
  const [currentDihedral, setCurrentDihedral] = useState<number>(
    initialActualDihedral
  );
  const [targetDihedral, setTargetDihedral] = useState<number>(
    initialActualDihedral
  );
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);

  const energy = useMemo(() => {
    return computeConformationEnergy(atoms);
  }, [atoms]);

  const dihedralAngle = useMemo(() => {
    return computeDihedralAngle(atoms, moleculeData.dihedralAtoms);
  }, [atoms, moleculeData.dihedralAtoms]);

  const backgroundIntensity = useMemo(() => {
    const maxAngle = 180;
    return Math.min(Math.abs(dihedralAngle - initialActualDihedral) / maxAngle, 1);
  }, [dihedralAngle, initialActualDihedral]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const diff = targetDihedral - currentDihedral;
    if (Math.abs(diff) < 0.1) return;

    const duration = 500;
    const startTime = performance.now();
    const startAngle = currentDihedral;

    let animationId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const newAngle = startAngle + diff * eased;

      setCurrentDihedral(newAngle);
      setAtoms(rotateDihedral(originalAtoms, moleculeData.dihedralAtoms, newAngle));

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [targetDihedral, originalAtoms, moleculeData.dihedralAtoms, currentDihedral]);

  const handleDihedralChange = useCallback(
    (angle: number) => {
      setTargetDihedral(angle);
    },
    []
  );

  const handleReset = useCallback(() => {
    setOriginalAtoms(moleculeData.atoms);
    setTargetDihedral(initialActualDihedral);
    setCurrentDihedral(initialActualDihedral);
    setAtoms(moleculeData.atoms);
    setSavedAtoms(null);
    setIsComparisonMode(false);
  }, [moleculeData, initialActualDihedral]);

  const handleSaveConformation = useCallback(() => {
    setSavedAtoms([...atoms]);
  }, [atoms]);

  const handleToggleComparison = useCallback(() => {
    if (!savedAtoms) {
      setSavedAtoms([...atoms]);
    }
    setIsComparisonMode((prev) => !prev);
  }, [savedAtoms, atoms]);

  return (
    <div
      className="app-container"
      style={{
        background: `linear-gradient(135deg, #0B0C10 0%, rgba(44, 62, 80, ${0.4 + backgroundIntensity * 0.6}) 100%)`,
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
