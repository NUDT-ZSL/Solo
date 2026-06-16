import { useReducer, useCallback, useMemo } from 'react';
import { Part, Monster, createMonsterFromParts, PARTS, getPartById, BattleMonster } from './utils/monsterData';
import { saveTeam, loadTeam, saveBattleLog, savePokedexEntry } from './utils/storage';
import MenuScreen from './components/MenuScreen';
import AssembleScreen from './components/AssembleScreen';
import PrepareScreen from './components/PrepareScreen';
import PokedexScreen from './components/PokedexScreen';
import BattleScreen from './components/BattleScreen';
import HistoryScreen from './components/HistoryScreen';
import { playClickSound } from './utils/audio';

export type PageType = 'menu' | 'assemble' | 'prepare' | 'pokedex' | 'battle' | 'history';

interface GameState {
  page: PageType;
  currentParts: {
    head: Part | null;
    torso: Part | null;
    legs: Part | null;
    tail: Part | null;
  };
  team: Monster[];
  enemyTeam: Monster[];
  battleResult: 'win' | 'lose' | null;
}

type Action =
  | { type: 'SET_PAGE'; page: PageType }
  | { type: 'SET_PART'; partType: 'head' | 'torso' | 'legs' | 'tail'; part: Part | null }
  | { type: 'CLEAR_PARTS' }
  | { type: 'ADD_TO_TEAM'; monster: Monster }
  | { type: 'REMOVE_FROM_TEAM'; monsterId: string }
  | { type: 'REORDER_TEAM'; fromIndex: number; toIndex: number }
  | { type: 'SET_ENEMY_TEAM'; team: Monster[] }
  | { type: 'SET_BATTLE_RESULT'; result: 'win' | 'lose' | null };

const initialState: GameState = {
  page: 'menu',
  currentParts: { head: null, torso: null, legs: null, tail: null },
  team: [],
  enemyTeam: [],
  battleResult: null,
};

function loadInitialTeam(): Monster[] {
  const saved = loadTeam();
  return saved
    .map(s => {
      const partsMap: { [key: string]: Part | undefined } = {};
      s.parts.forEach(p => { partsMap[p.type] = p; });
      return createMonsterFromParts({
        head: partsMap.head || null,
        torso: partsMap.torso || null,
        legs: partsMap.legs || null,
        tail: partsMap.tail || null,
      });
    })
    .filter((m): m is Monster => !!m);
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'SET_PART':
      return {
        ...state,
        currentParts: { ...state.currentParts, [action.partType]: action.part },
      };
    case 'CLEAR_PARTS':
      return {
        ...state,
        currentParts: { head: null, torso: null, legs: null, tail: null },
      };
    case 'ADD_TO_TEAM': {
      if (state.team.length >= 3) return state;
      const newTeam = [...state.team, action.monster];
      saveTeam(newTeam);
      savePokedexEntry(action.monster);
      return { ...state, team: newTeam };
    }
    case 'REMOVE_FROM_TEAM': {
      const newTeam = state.team.filter(m => m.id !== action.monsterId);
      saveTeam(newTeam);
      return { ...state, team: newTeam };
    }
    case 'REORDER_TEAM': {
      const newTeam = [...state.team];
      const [removed] = newTeam.splice(action.fromIndex, 1);
      newTeam.splice(action.toIndex, 0, removed);
      saveTeam(newTeam);
      return { ...state, team: newTeam };
    }
    case 'SET_ENEMY_TEAM':
      return { ...state, enemyTeam: action.team };
    case 'SET_BATTLE_RESULT':
      return { ...state, battleResult: action.result };
    default:
      return state;
  }
}

function generateRandomEnemyTeam(): Monster[] {
  const types: ('head' | 'torso' | 'legs' | 'tail')[] = ['head', 'torso', 'legs', 'tail'];
  const team: Monster[] = [];
  const teamSize = 1 + Math.floor(Math.random() * 3);

  for (let i = 0; i < teamSize; i++) {
    const parts = { head: null, torso: null, legs: null, tail: null } as {
      head: Part | null; torso: Part | null; legs: Part | null; tail: Part | null;
    };
    for (const t of types) {
      const available = PARTS.filter(p => p.type === t);
      parts[t] = available[Math.floor(Math.random() * available.length)];
    }
    const monster = createMonsterFromParts(parts);
    if (monster) team.push(monster);
  }

  return team;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    ...initialState,
    team: loadInitialTeam(),
  }));

  const navigateTo = useCallback((page: PageType) => {
    playClickSound();
    if (page === 'battle' && state.team.length > 0) {
      const enemies = generateRandomEnemyTeam();
      dispatch({ type: 'SET_ENEMY_TEAM', team: enemies });
      dispatch({ type: 'SET_BATTLE_RESULT', result: null });
    }
    dispatch({ type: 'SET_PAGE', page });
  }, [state.team.length]);

  const setPart = useCallback((partType: 'head' | 'torso' | 'legs' | 'tail', part: Part | null) => {
    dispatch({ type: 'SET_PART', partType, part });
  }, []);

  const clearParts = useCallback(() => {
    dispatch({ type: 'CLEAR_PARTS' });
  }, []);

  const currentMonster = useMemo(() => createMonsterFromParts(state.currentParts), [state.currentParts]);

  const addToTeam = useCallback(() => {
    if (currentMonster && state.team.length < 3) {
      dispatch({ type: 'ADD_TO_TEAM', monster: currentMonster });
      dispatch({ type: 'CLEAR_PARTS' });
    }
  }, [currentMonster, state.team.length]);

  const removeFromTeam = useCallback((monsterId: string) => {
    dispatch({ type: 'REMOVE_FROM_TEAM', monsterId });
  }, []);

  const reorderTeam = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_TEAM', fromIndex, toIndex });
  }, []);

  const onBattleEnd = useCallback((result: 'win' | 'lose', turns: number) => {
    dispatch({ type: 'SET_BATTLE_RESULT', result });
    const playerIds = state.team.map(m => {
      const ids = [m.parts.head, m.parts.torso, m.parts.legs, m.parts.tail]
        .map(p => p?.id || '')
        .filter(Boolean);
      return ids;
    });
    const enemyIds = state.enemyTeam.map(m => {
      const ids = [m.parts.head, m.parts.torso, m.parts.legs, m.parts.tail]
        .map(p => p?.id || '')
        .filter(Boolean);
      return ids;
    });
    saveBattleLog(playerIds, enemyIds, result, turns);
  }, [state.team, state.enemyTeam]);

  const renderPage = () => {
    switch (state.page) {
      case 'menu':
        return <MenuScreen onNavigate={navigateTo} />;
      case 'assemble':
        return (
          <AssembleScreen
            currentParts={state.currentParts}
            setPart={setPart}
            clearParts={clearParts}
            currentMonster={currentMonster}
            onAddToTeam={addToTeam}
            teamSize={state.team.length}
            onNavigate={navigateTo}
          />
        );
      case 'prepare':
        return (
          <PrepareScreen
            team={state.team}
            onRemove={removeFromTeam}
            onReorder={reorderTeam}
            onNavigate={navigateTo}
          />
        );
      case 'pokedex':
        return <PokedexScreen onNavigate={navigateTo} />;
      case 'battle':
        return (
          <BattleScreen
            playerTeam={state.team}
            enemyTeam={state.enemyTeam}
            onBattleEnd={onBattleEnd}
            onNavigate={navigateTo}
            battleResult={state.battleResult}
          />
        );
      case 'history':
        return <HistoryScreen onNavigate={navigateTo} />;
      default:
        return <MenuScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1E1E2E' }}>
      {renderPage()}
    </div>
  );
}
