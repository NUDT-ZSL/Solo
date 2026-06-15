import React, { useReducer, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import GameCanvas, { type EditorMode } from '@/components/GameCanvas';
import EditorPanel from '@/components/EditorPanel';
import Toolbar from '@/components/Toolbar';
import ResultPanel from '@/components/ResultPanel';
import { type HexCoord, hexKey, type TerrainMap } from '@/utils/hexagonMath';
import {
  type Unit,
  type RaceType,
  type BattleLogEntry,
  type BattleStats,
  type BattleResult,
  type HistoryRecord,
  RACE_STATS,
  createUnit,
  simulateBattle,
} from '@/utils/battleLogic';

interface MapSummary {
  id: string;
  name: string;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
}

interface EditorState {
  mapId: string | null;
  mapName: string;
  terrains: TerrainMap;
  units: Unit[];
  mode: EditorMode;
  selectedHex: HexCoord | null;
  pulseHexes: Set<string>;
  history: Array<{ terrains: TerrainMap; units: Unit[] }>;
  historyIndex: number;
  battleLogs: BattleLogEntry[];
  battleStats: BattleStats[];
  battleWinner: RaceType | 'draw' | null;
  isSimulating: boolean;
  battleHistory: HistoryRecord[];
}

type EditorAction =
  | { type: 'SET_MAP'; mapId: string | null; mapName: string; terrains: TerrainMap; units: Unit[] }
  | { type: 'SET_MODE'; mode: EditorMode }
  | { type: 'PLACE_TERRAIN'; coord: HexCoord; terrainType: string; moveCost: number; passable: boolean }
  | { type: 'PLACE_UNIT'; coord: HexCoord; race: RaceType }
  | { type: 'SELECT_HEX'; coord: HexCoord | null }
  | { type: 'PULSE_HEX'; key: string }
  | { type: 'CLEAR_PULSE' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_MAP_NAME'; name: string }
  | { type: 'BATTLE_START' }
  | { type: 'BATTLE_LOG_APPEND'; logs: BattleLogEntry[] }
  | { type: 'BATTLE_FINISH'; result: BattleResult }
  | { type: 'ADD_HISTORY'; record: HistoryRecord }
  | { type: 'RESET_BATTLE' };

function cloneTerrains(t: TerrainMap): TerrainMap {
  const out: TerrainMap = {};
  for (const k of Object.keys(t)) {
    out[k] = { ...t[k] };
  }
  return out;
}

function cloneUnits(u: Unit[]): Unit[] {
  return u.map((unit) => ({ ...unit, coord: { ...unit.coord } }));
}

function pushHistory(
  history: Array<{ terrains: TerrainMap; units: Unit[] }>,
  terrains: TerrainMap,
  units: Unit[],
  index: number
) {
  const newHistory = history.slice(0, index + 1);
  newHistory.push({ terrains: cloneTerrains(terrains), units: cloneUnits(units) });
  if (newHistory.length > 20) newHistory.shift();
  return newHistory;
}

const initialState: EditorState = {
  mapId: null,
  mapName: '未命名地图',
  terrains: {},
  units: [],
  mode: 'edit',
  selectedHex: null,
  pulseHexes: new Set(),
  history: [{ terrains: {}, units: [] }],
  historyIndex: 0,
  battleLogs: [],
  battleStats: [],
  battleWinner: null,
  isSimulating: false,
  battleHistory: [],
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_MAP':
      return {
        ...state,
        mapId: action.mapId,
        mapName: action.mapName,
        terrains: action.terrains,
        units: action.units,
        history: [{ terrains: cloneTerrains(action.terrains), units: cloneUnits(action.units) }],
        historyIndex: 0,
        battleLogs: [],
        battleStats: [],
        battleWinner: null,
        isSimulating: false,
        battleHistory: [],
      };
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_MAP_NAME':
      return { ...state, mapName: action.name };
    case 'SELECT_HEX':
      return { ...state, selectedHex: action.coord };
    case 'PULSE_HEX': {
      const next = new Set(state.pulseHexes);
      next.add(action.key);
      return { ...state, pulseHexes: next };
    }
    case 'CLEAR_PULSE':
      return { ...state, pulseHexes: new Set() };
    case 'PLACE_TERRAIN': {
      const key = hexKey(action.coord);
      const newTerrains = { ...state.terrains };
      newTerrains[key] = { type: action.terrainType, moveCost: action.moveCost, passable: action.passable };
      const newHistory = pushHistory(state.history, newTerrains, state.units, state.historyIndex);
      return {
        ...state,
        terrains: newTerrains,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'PLACE_UNIT': {
      const key = hexKey(action.coord);
      const terrain = state.terrains[key];
      if (!terrain || !terrain.passable) return state;
      const existing = state.units.find((u) => hexKey(u.coord) === key);
      if (existing) return state;
      const raceNames: Record<RaceType, string[]> = {
        human: ['骑士', '剑士', '弓手'],
        elf: ['游侠', '法师', '射手'],
        orc: ['狂战士', '萨满', '猎手'],
      };
      const names = raceNames[action.race];
      const name = names[Math.floor(Math.random() * names.length)];
      const unit = createUnit(name, action.race, action.coord);
      const newUnits = [...state.units, unit];
      const newHistory = pushHistory(state.history, state.terrains, newUnits, state.historyIndex);
      return {
        ...state,
        units: newUnits,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      return {
        ...state,
        terrains: cloneTerrains(snapshot.terrains),
        units: cloneUnits(snapshot.units),
        historyIndex: newIndex,
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      return {
        ...state,
        terrains: cloneTerrains(snapshot.terrains),
        units: cloneUnits(snapshot.units),
        historyIndex: newIndex,
      };
    }
    case 'BATTLE_START':
      return { ...state, isSimulating: true, battleLogs: [], battleStats: [], battleWinner: null };
    case 'BATTLE_LOG_APPEND':
      return { ...state, battleLogs: [...state.battleLogs, ...action.logs] };
    case 'BATTLE_FINISH': {
      const record: HistoryRecord = {
        id: `hist_${Date.now()}`,
        timestamp: Date.now(),
        summary:
          action.result.winner === 'draw'
            ? '平局'
            : `${RACE_STATS[action.result.winner as RaceType].name}获胜`,
        winner: action.result.winner,
      };
      return {
        ...state,
        isSimulating: false,
        battleStats: action.result.stats,
        battleWinner: action.result.winner,
        battleHistory: [record, ...state.battleHistory],
      };
    }
    case 'ADD_HISTORY':
      return { ...state, battleHistory: [action.record, ...state.battleHistory] };
    case 'RESET_BATTLE':
      return { ...state, battleLogs: [], battleStats: [], battleWinner: null, isSimulating: false };
    default:
      return state;
  }
}

function EditorPage() {
  const { mapId } = useParams();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const simulationRef = useRef<number | null>(null);

  useEffect(() => {
    const loadMap = async () => {
      if (mapId) {
        try {
          const res = await fetch(`/api/maps/${mapId}`);
          if (res.ok) {
            const data = await res.json();
            dispatch({
              type: 'SET_MAP',
              mapId: data.id,
              mapName: data.name || '未命名地图',
              terrains: data.terrains || {},
              units: data.units || [],
            });
          }
        } catch {
          const saved = localStorage.getItem(`hexwar_draft_${mapId}`);
          if (saved) {
            const data = JSON.parse(saved);
            dispatch({
              type: 'SET_MAP',
              mapId: data.mapId,
              mapName: data.mapName,
              terrains: data.terrains,
              units: data.units,
            });
          }
        }
      } else {
        dispatch({ type: 'SET_MAP', mapId: null, mapName: '未命名地图', terrains: {}, units: [] });
      }
    };
    loadMap();
  }, [mapId]);

  useEffect(() => {
    const key = state.mapId || 'new';
    localStorage.setItem(
      `hexwar_draft_${key}`,
      JSON.stringify({
        mapId: state.mapId,
        mapName: state.mapName,
        terrains: state.terrains,
        units: state.units,
      })
    );
  }, [state.terrains, state.units, state.mapName, state.mapId]);

  const runBattle = useCallback(() => {
    dispatch({ type: 'BATTLE_START' });
    const units = cloneUnits(state.units);
    const terrain = cloneTerrains(state.terrains);
    setTimeout(() => {
      const result = simulateBattle(units, terrain, 10);
      const allLogs = result.logs;
      let logIndex = 0;
      const step = () => {
        const batch = allLogs.slice(logIndex, logIndex + 3);
        if (batch.length > 0) {
          dispatch({ type: 'BATTLE_LOG_APPEND', logs: batch });
          logIndex += 3;
          simulationRef.current = window.setTimeout(step, 80);
        } else {
          dispatch({ type: 'BATTLE_FINISH', result });
        }
      };
      step();
    }, 100);
  }, [state.units, state.terrains]);

  useEffect(() => {
    if (state.mode === 'battle' && !state.isSimulating && state.battleLogs.length === 0) {
      const raceSet = new Set(state.units.map((u) => u.race));
      if (raceSet.size >= 2) {
        runBattle();
      }
    }
  }, [state.mode]);

  useEffect(() => {
    return () => {
      if (simulationRef.current) clearTimeout(simulationRef.current);
    };
  }, []);

  const handleHexDrop = useCallback(
    (coord: HexCoord, dragData: string) => {
      try {
        const data = JSON.parse(dragData);
        if (data.kind === 'terrain') {
          dispatch({
            type: 'PLACE_TERRAIN',
            coord,
            terrainType: data.type,
            moveCost: data.moveCost,
            passable: data.passable,
          });
          dispatch({ type: 'PULSE_HEX', key: hexKey(coord) });
          setTimeout(() => dispatch({ type: 'CLEAR_PULSE' }), 500);
        } else if (data.kind === 'unit') {
          dispatch({ type: 'PLACE_UNIT', coord, race: data.race });
          dispatch({ type: 'PULSE_HEX', key: hexKey(coord) });
          setTimeout(() => dispatch({ type: 'CLEAR_PULSE' }), 500);
        }
      } catch {}
    },
    []
  );

  const handleHexClick = useCallback(
    (coord: HexCoord) => {
      if (state.mode === 'edit') {
        dispatch({ type: 'SELECT_HEX', coord });
        const key = hexKey(coord);
        if (state.terrains[key]) {
          dispatch({ type: 'PULSE_HEX', key });
          setTimeout(() => dispatch({ type: 'CLEAR_PULSE' }), 500);
        }
      }
    },
    [state.mode, state.terrains]
  );

  const handleSave = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 100, 100);
      const scale = 100 / 1000;
      ctx.scale(scale, scale);
      for (const [key, terrain] of Object.entries(state.terrains)) {
        const [q, r] = key.split(',').map(Number);
        const HEX_RADIUS = 40;
        const SQRT3 = Math.sqrt(3);
        const x = HEX_RADIUS * SQRT3 * (q + r / 2);
        const y = HEX_RADIUS * 1.5 * r;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (60 * i - 30);
          const hx = x + (HEX_RADIUS - 1) * Math.cos(angle);
          const hy = y + (HEX_RADIUS - 1) * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        const colors: Record<string, string> = { plain: '#a3e635', forest: '#16a34a', mountain: '#6b7280', river: '#38bdf8' };
        ctx.fillStyle = colors[terrain.type] || '#1e293b';
        ctx.fill();
      }
    }
    const thumbnail = canvas.toDataURL('image/png');

    const mapData = {
      name: state.mapName,
      thumbnail,
      gridWidth: 1000,
      gridHeight: 800,
      hexRadius: 40,
      terrains: state.terrains,
      units: state.units,
    };

    try {
      if (state.mapId) {
        await fetch(`/api/maps/${state.mapId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapData),
        });
      } else {
        const res = await fetch('/api/maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapData),
        });
        if (res.ok) {
          const data = await res.json();
          dispatch({ type: 'SET_MAP', mapId: data.id, mapName: data.name, terrains: data.terrains || state.terrains, units: data.units || state.units });
        }
      }
      alert('地图已保存！');
    } catch {
      alert('保存失败，请检查后端服务');
    }
  }, [state.mapId, state.mapName, state.terrains, state.units]);

  const handleResimulate = useCallback(() => {
    dispatch({ type: 'RESET_BATTLE' });
    runBattle();
  }, [runBattle]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#0f172a' }}>
      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        <EditorPanel visible={state.mode === 'edit'} />
        <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg" style={{ background: '#0f172a' }}>
          <GameCanvas
            terrains={state.terrains}
            units={state.units}
            mode={state.mode}
            selectedHex={state.selectedHex}
            pulseHexes={state.pulseHexes}
            onHexClick={handleHexClick}
            onHexDrop={handleHexDrop}
            onHexSelect={(coord) => dispatch({ type: 'SELECT_HEX', coord })}
          />
        </div>
        <ResultPanel
          visible={state.mode === 'battle'}
          logs={state.battleLogs}
          stats={state.battleStats}
          winner={state.battleWinner}
          isSimulating={state.isSimulating}
          onResimulate={handleResimulate}
          history={state.battleHistory}
        />
      </div>
      <Toolbar
        mode={state.mode}
        onModeChange={(mode) => dispatch({ type: 'SET_MODE', mode })}
        canUndo={state.historyIndex > 0}
        canRedo={state.historyIndex < state.history.length - 1}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onSave={handleSave}
        onBack={() => navigate('/')}
        mapName={state.mapName}
        onMapNameChange={(name) => dispatch({ type: 'SET_MAP_NAME', name })}
      />
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [maps, setMaps] = React.useState<MapSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadMaps = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maps');
      if (res.ok) {
        const data = await res.json();
        setMaps(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      if (!confirm('确定删除此地图？')) return;
      await fetch(`/api/maps/${id}`, { method: 'DELETE' });
      loadMaps();
    },
    [loadMaps]
  );

  return (
    <div className="min-h-screen w-full" style={{ background: '#0f172a' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>
              ⬡ HexWar Map Studio
            </h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              桌游策略地图编辑器 & 平衡性测试工具
            </p>
          </div>
          <button
            onClick={() => navigate('/editor')}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
            style={{ background: '#3b82f6', color: '#fff' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            + 新建地图
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm" style={{ color: '#64748b' }}>
              加载中...
            </div>
          </div>
        ) : maps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-4xl">🗺️</div>
            <p className="text-sm" style={{ color: '#64748b' }}>
              还没有地图，点击右上角创建一个
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((map) => (
              <div
                key={map.id}
                className="rounded-xl overflow-hidden transition-all duration-300 cursor-pointer"
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#334155';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
                onClick={() => navigate(`/editor/${map.id}`)}
              >
                <div
                  className="w-full flex items-center justify-center"
                  style={{ height: 120, background: '#0f172a' }}
                >
                  {map.thumbnail ? (
                    <img
                      src={map.thumbnail}
                      alt={map.name}
                      className="max-w-full max-h-full"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-2xl">⬡</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>
                    {map.name}
                  </h3>
                  <p className="text-[10px] mt-1" style={{ color: '#64748b' }}>
                    {new Date(map.updatedAt).toLocaleString('zh-CN')}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(map.id);
                    }}
                    className="mt-2 text-[10px] px-2 py-1 rounded transition-all duration-300"
                    style={{ color: '#94a3b8', background: 'transparent', border: '1px solid #334155' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444';
                      (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#334155';
                      (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/editor/:mapId" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}
