import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  Cell,
  LogEntry,
  LogType,
  Monster,
  Weapon,
  ModalId,
  ChestData,
  GameOverData,
  ShopData,
} from './types';
import { eventBus } from './utils/EventBus';
import { diceEngine } from './DiceEngine';
import { gridMap } from './GridMap';
import { eventResolver } from './EventResolver';
import { GameBoard } from './components/GameBoard';
import { LogPanel } from './components/LogPanel';
import { DiceButton } from './components/DiceButton';
import { Modal } from './components/Modal';
import { BattleScene } from './components/BattleScene';

let logIdCounter = 0;

const App: React.FC = () => {
  const [cells, setCells] = useState<Cell[][]>([]);
  const [playerX, setPlayerX] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [playerHp, setPlayerHp] = useState(5);
  const [playerMaxHp, setPlayerMaxHp] = useState(5);
  const [playerGold, setPlayerGold] = useState(0);
  const [playerWeapons, setPlayerWeapons] = useState<Weapon[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [inBattle, setInBattle] = useState(false);
  const [currentMonster, setCurrentMonster] = useState<Monster | null>(null);
  const [killCount, setKillCount] = useState(0);
  const [modalId, setModalId] = useState<ModalId | null>(null);
  const [modalData, setModalData] = useState<ChestData | GameOverData | ShopData | null>(null);
  const [battleModeBoard, setBattleModeBoard] = useState(false);
  const initialized = useRef(false);

  const addLog = useCallback((message: string, type: LogType = 'info') => {
    setLogs((prev) => [
      ...prev.slice(-99),
      { id: ++logIdCounter, message, type, timestamp: Date.now() },
    ]);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    gridMap.generate();
    setCells([...gridMap.cells.map((row) => [...row])]);
    setPlayerX(gridMap.playerX);
    setPlayerY(gridMap.playerY);

    const initialPlayer = eventResolver.getPlayer();
    setPlayerHp(initialPlayer.hp);
    setPlayerMaxHp(initialPlayer.maxHp);
    setPlayerGold(initialPlayer.gold);
    setPlayerWeapons([...initialPlayer.weapons]);
    setKillCount(eventResolver.getKillCount());

    const offDice = diceEngine.init();
    const offGrid = gridMap.init();
    const offResolver = eventResolver.init(gridMap);

    addLog('🏰 欢迎来到 CrystalCrawl 水晶地牢！', 'success');
    addLog('🎯 目标：从起点🚩走到终点🏆，掷骰决定步数。', 'info');

    const offRolling = eventBus.on('dice:rolling', () => {
      setRolling(true);
    });
    const offDiceResult = eventBus.on('dice:result', () => {
      window.setTimeout(() => setRolling(false), 500);
    });
    const offMoveStart = eventBus.on('player:move-start', () => {
      setMoving(true);
    });
    const offPosition = eventBus.on('player:position', ({ x, y }) => {
      setPlayerX(x);
      setPlayerY(y);
      setCells([...gridMap.cells.map((row) => [...row])]);
    });
    const offMoveEnd = eventBus.on('player:move-end', () => {
      setMoving(false);
    });
    const offHpChange = eventBus.on('player:hp-change', ({ hp }) => {
      setPlayerHp(hp);
    });
    const offGoldChange = eventBus.on('player:gold-change', ({ gold }) => {
      setPlayerGold(gold);
    });
    const offWeaponAdd = eventBus.on('player:weapon-add', ({ weapon }) => {
      setPlayerWeapons((prev) => [...prev, weapon]);
    });
    const offBattleStart = eventBus.on('battle:start', ({ monster }) => {
      setInBattle(true);
      setCurrentMonster({ ...monster });
      setBattleModeBoard(true);
    });
    const offBattleEnd = eventBus.on('battle:end', ({ victory }) => {
      setInBattle(false);
      setCurrentMonster(null);
      setBattleModeBoard(false);
      setKillCount(eventResolver.getKillCount());
      if (victory) {
        const p = eventResolver.getPlayer();
        setPlayerGold(p.gold);
        setPlayerHp(p.hp);
      }
    });
    const offLog = eventBus.on('log:add', ({ message, type }) => {
      addLog(message, type || 'info');
    });
    const offModalOpen = eventBus.on('modal:open', ({ id, data }) => {
      setModalId(id);
      setModalData(data);
    });
    const offModalClose = eventBus.on('modal:close', () => {
      setModalId(null);
      setModalData(null);
    });
    const offGameOver = eventBus.on('game:over', () => {
      setMoving(false);
      setRolling(false);
    });
    const offGameRestart = eventBus.on('game:restart', () => {
      window.setTimeout(() => {
        setCells([...gridMap.cells.map((row) => [...row])]);
        setPlayerX(gridMap.playerX);
        setPlayerY(gridMap.playerY);
        const p = eventResolver.getPlayer();
        setPlayerHp(p.hp);
        setPlayerMaxHp(p.maxHp);
        setPlayerGold(p.gold);
        setPlayerWeapons([...p.weapons]);
        setKillCount(0);
        setInBattle(false);
        setCurrentMonster(null);
        setBattleModeBoard(false);
        setLogs([]);
        setModalId(null);
        setModalData(null);
        addLog('🔄 新的冒险开始了！', 'success');
      }, 50);
    });
    const offShopBuy = eventBus.on('shop:buy', ({ index }) => {
      const shopModalData = modalData as ShopData | null;
      if (!shopModalData || !shopModalData.items[index]) return;
      const item = shopModalData.items[index];
      if (playerGold < item.price) return;
      if (item.type === 'weapon') {
        const w = item.payload as Weapon;
        setPlayerWeapons((prev) => [...prev, w]);
        setPlayerGold((g) => g - item.price);
        addLog(`🛒 购买了 ${w.icon}${w.name}！`, 'success');
      } else if (item.type === 'heal') {
        const heal = item.payload as number;
        setPlayerHp((hp) => Math.min(playerMaxHp, hp + heal));
        setPlayerGold((g) => g - item.price);
        addLog(`🛒 使用恢复药水，恢复 ${heal} HP！`, 'success');
      }
    });

    return () => {
      offDice();
      offGrid();
      offResolver();
      offRolling();
      offDiceResult();
      offMoveStart();
      offPosition();
      offMoveEnd();
      offHpChange();
      offGoldChange();
      offWeaponAdd();
      offBattleStart();
      offBattleEnd();
      offLog();
      offModalOpen();
      offModalClose();
      offGameOver();
      offGameRestart();
      offShopBuy();
    };
  }, [addLog, playerGold, playerMaxHp, modalData]);

  const hearts = '❤️'.repeat(Math.max(0, playerHp)) + '🖤'.repeat(Math.max(0, playerMaxHp - playerHp));
  const diceDisabled = rolling || moving || inBattle || modalId !== null;

  return (
    <div className="app-root">
      <div className="hud-title">⚔️ CRYSTAL CRAWL ⚔️</div>
      <div className="hud-top-left">
        <div className="hud-hp">
          <span className="hearts">{hearts}</span>
          <span>{playerHp}/{playerMaxHp}</span>
        </div>
        <div className="hud-gold">
          <span>💰</span>
          <span>{playerGold}</span>
        </div>
        <div className="hud-weapons">
          {playerWeapons.map((w) => (
            <div key={w.id} className="weapon-icon" title={`${w.name} (伤害${w.damage})`}>
              {w.icon}
            </div>
          ))}
        </div>
      </div>
      <div className="hud-kills">⚔️ 击杀: {killCount}</div>

      <div className="game-board-wrapper">
        <GameBoard
          cells={cells}
          playerX={playerX}
          playerY={playerY}
          battleMode={battleModeBoard}
        />
        <DiceButton disabled={diceDisabled} />
      </div>

      <LogPanel logs={logs} />

      {inBattle && currentMonster && (
        <BattleScene
          monster={currentMonster}
          weapons={playerWeapons}
          playerHp={playerHp}
          playerMaxHp={playerMaxHp}
        />
      )}

      {modalId && (
        <Modal id={modalId} data={modalData} playerGold={playerGold} />
      )}
    </div>
  );
};

export default App;
