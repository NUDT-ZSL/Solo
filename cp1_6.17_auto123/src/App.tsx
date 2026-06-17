import { useState, useCallback, useRef } from "react";
import type { ICharacter, IBoss, ActionResult, BattleStats, GamePhase } from "./team-module";
import { addCharacter, removeCharacter, createCharacter, PRESET_TEAMS, resetCharacterForBattle, applyPreset } from "./team-module";
import { createBoss, simulateRound } from "./combat-module";
import { calculateBattleStats } from "./stats-module";
import TeamBuilder from "./components/TeamBuilder";
import BattleArena from "./components/BattleArena";
import StatsPanel from "./components/StatsPanel";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("team");
  const [slots, setSlots] = useState<(ICharacter | null)[]>([null, null, null, null]);
  const [boss, setBoss] = useState<IBoss>(createBoss());
  const [battleActions, setBattleActions] = useState<ActionResult[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [battleStats, setBattleStats] = useState<BattleStats | null>(null);
  const [isBattleRunning, setIsBattleRunning] = useState<boolean>(false);
  const battleKeyRef = useRef<number>(0);

  const handleAddChar = useCallback((characterId: string, slotIndex: number) => {
    setSlots((prev) => addCharacter(prev, characterId, slotIndex));
  }, []);

  const handleRemoveChar = useCallback((slotIndex: number) => {
    setSlots((prev) => removeCharacter(prev, slotIndex));
  }, []);

  const handleApplyPreset = useCallback((presetIndex: number) => {
    const preset = PRESET_TEAMS[presetIndex];
    if (!preset) return;
    setSlots(applyPreset(preset));
  }, []);

  const handleStartBattle = useCallback(() => {
    const activeChars = slots.filter((c): c is ICharacter => c !== null);
    if (activeChars.length === 0) return;

    battleKeyRef.current += 1;

    const resetChars = activeChars.map((c) => resetCharacterForBattle(c));
    const newSlots: (ICharacter | null)[] = [null, null, null, null];
    resetChars.forEach((c, i) => {
      newSlots[i] = c;
    });

    setSlots(newSlots);
    setBoss(createBoss());
    setBattleActions([]);
    setCurrentRound(0);
    setBattleStats(null);
    setIsBattleRunning(true);
    setPhase("combat");
  }, [slots]);

  const handleProcessNextRound = useCallback(() => {
    if (!isBattleRunning) return;

    const activeChars = slots.filter((c): c is ICharacter => c !== null);
    const aliveChars = activeChars.filter((c) => c.isAlive);

    if (aliveChars.length === 0 || !boss.isAlive) {
      const stats = calculateBattleStats(battleActions, activeChars, boss, !boss.isAlive, currentRound);
      setBattleStats(stats);
      setIsBattleRunning(false);
      setPhase("stats");
      return;
    }

    const nextRound = currentRound + 1;
    const mutableChars = activeChars.map((c) => ({ ...c }));
    const mutableBoss = { ...boss };

    const roundActions = simulateRound(mutableChars, mutableBoss, nextRound);
    const allActions = [...battleActions, ...roundActions];

    const updatedSlots = slots.map((s) => {
      if (!s) return null;
      const found = mutableChars.find((c) => c.id === s.id);
      return found ? { ...found } : s;
    });

    const aliveAfter = mutableChars.filter((c) => c.isAlive);
    const battleOver = !mutableBoss.isAlive || aliveAfter.length === 0 || nextRound >= 15;

    setBattleActions(allActions);
    setCurrentRound(nextRound);
    setSlots(updatedSlots);
    setBoss(mutableBoss);

    if (battleOver) {
      const stats = calculateBattleStats(allActions, mutableChars, mutableBoss, !mutableBoss.isAlive, nextRound);
      setBattleStats(stats);
      setIsBattleRunning(false);
      setPhase("stats");
    }
  }, [isBattleRunning, slots, boss, battleActions, currentRound]);

  const handleResetToTeam = useCallback(() => {
    setPhase("team");
    setSlots([null, null, null, null]);
    setBoss(createBoss());
    setBattleActions([]);
    setCurrentRound(0);
    setBattleStats(null);
    setIsBattleRunning(false);
  }, []);

  return (
    <div className="app">
      {phase === "team" && (
        <TeamBuilder
          slots={slots}
          onAddChar={handleAddChar}
          onRemoveChar={handleRemoveChar}
          onApplyPreset={handleApplyPreset}
          onStartBattle={handleStartBattle}
        />
      )}

      {phase === "combat" && (
        <div key={battleKeyRef.current} className="combat-slide-in">
          <BattleArena
            characters={slots.filter((c): c is ICharacter => c !== null)}
            boss={boss}
            actions={battleActions}
            currentRound={currentRound}
            isBattleRunning={isBattleRunning}
            onProcessNextRound={handleProcessNextRound}
          />
        </div>
      )}

      {phase === "stats" && battleStats && (
        <StatsPanel stats={battleStats} onReset={handleResetToTeam} />
      )}
    </div>
  );
}
