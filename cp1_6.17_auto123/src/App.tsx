import { useCallback } from "react";
import { useGameStore } from "./store";
import TeamBuilder from "./components/TeamBuilder";
import BattleArena from "./components/BattleArena";
import StatsPanel from "./components/StatsPanel";

export default function App() {
  const {
    phase,
    slots,
    boss,
    battleActions,
    currentRound,
    battleStats,
    isBattleRunning,
    addChar,
    removeChar,
    applyPresetTeam,
    startBattle,
    processNextRound,
    resetToTeam,
  } = useGameStore();

  const handleProcessNextRound = useCallback(() => {
    processNextRound();
  }, [processNextRound]);

  return (
    <div className="app">
      {phase === "team" && (
        <TeamBuilder
          slots={slots}
          onAddChar={addChar}
          onRemoveChar={removeChar}
          onApplyPreset={applyPresetTeam}
          onStartBattle={startBattle}
        />
      )}

      {phase === "combat" && (
        <div className="combat-slide-in">
          <BattleArena
            characters={slots.filter(Boolean)}
            boss={boss}
            actions={battleActions}
            currentRound={currentRound}
            isBattleRunning={isBattleRunning}
            onProcessNextRound={handleProcessNextRound}
          />
        </div>
      )}

      {phase === "stats" && battleStats && (
        <StatsPanel stats={battleStats} onReset={resetToTeam} />
      )}
    </div>
  );
}
