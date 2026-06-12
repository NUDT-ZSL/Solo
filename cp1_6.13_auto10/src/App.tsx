import { useEffect, useState, useCallback } from 'react';
import type {
  PlayerState,
  Enemy,
  Card,
  CombatResult,
  GamePhase,
  ChestReward,
} from './types';
import {
  getOrCreatePlayer,
  updatePlayer,
  resetPlayer,
  getRandomEnemies,
  getRandomCards,
  completeBattle,
  openChest,
  getRarityColor,
  getTypeIcon,
} from './cardPool';
import { runCombat } from './combatEngine';
import BattleView from './components/BattleView';
import CardSelectionModal from './components/CardSelectionModal';

type ChestPhase = 'idle' | 'shaking' | 'opening' | 'opened';

function StatBar({ player }: { player: PlayerState }) {
  return (
    <div className="top-bar">
      <div className="stat hp">
        <span className="stat-icon hp-icon">❤</span>
        <span className="stat-value">{player.hp} / {player.maxHp}</span>
      </div>
      <div className="divider" />
      <div className="stat gold">
        <span className="stat-icon gold-icon">⬢</span>
        <span className="stat-value">{player.gold}</span>
      </div>
      <div className="divider" />
      <div className="stat stage">
        <span className="stat-icon stage-icon">⚔</span>
        <span className="stat-value">关卡 {player.stage}</span>
      </div>
    </div>
  );
}

function EnemySelect({
  enemies,
  onPick,
}: {
  enemies: Enemy[];
  onPick: (e: Enemy) => void;
}) {
  return (
    <div className="enemy-select">
      <h2 className="section-title">选择你的对手</h2>
      <div className="enemy-grid">
        {enemies.map(e => {
          const ratio = Math.max(0, e.hp / e.maxHp);
          return (
            <button
              key={e.instanceId || e.id}
              className="enemy-card"
              onClick={() => onPick(e)}
            >
              <div className="enemy-left">
                <div className="enemy-emoji">👹</div>
                <div className="enemy-name">{e.name}</div>
                <div className="enemy-stats">
                  <span>攻 {e.atk}</span>
                  <span>防 {e.def}</span>
                </div>
              </div>
              <div className="enemy-right">
                <div className="enemy-hp-label">HP</div>
                <div className="enemy-hp-wrap">
                  <div
                    className="enemy-hp-fill"
                    style={{ width: `${ratio * 100}%` }}
                  />
                  <span className="enemy-hp-text">{e.hp}</span>
                </div>
                <div className="enemy-desc">{e.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChestBox({
  phase,
  reward,
  onOpen,
  onClose,
}: {
  phase: ChestPhase;
  reward: ChestReward | null;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div className={`chest-stage ${phase}`}>
      {phase === 'idle' && (
        <div className="chest-prompt">
          <p>你发现了一个神秘宝箱！</p>
          <button className="btn-primary" onClick={onOpen}>打开宝箱</button>
        </div>
      )}
      {(phase === 'shaking' || phase === 'opening') && (
        <div className={`chest-box ${phase}`}>
          <div className="chest-lid" />
          <div className="chest-body" />
          <div className="chest-lock" />
        </div>
      )}
      {phase === 'opened' && reward && (
        <div className="chest-reward">
          <h3>🎉 奖励获得！</h3>
          {reward.type === 'card' && reward.card && (
            <div
              className="rc-card reward-card"
              style={{
                borderColor: getRarityColor(reward.card.rarity),
                boxShadow: `0 0 20px ${getRarityColor(reward.card.rarity)}aa`,
              }}
            >
              <div className="rc-card-cost">
                <div className="diamond"><span>{reward.card.cost}</span></div>
              </div>
              <div className="rc-card-type">{getTypeIcon(reward.card.type)}</div>
              <div className="rc-card-name">{reward.card.name}</div>
              <div className="rc-card-desc">{reward.card.desc}</div>
              <div className="rc-card-value">{reward.card.value}</div>
            </div>
          )}
          {reward.type === 'gold' && (
            <div className="reward-text gold-reward">💰 +{reward.amount} 金币</div>
          )}
          {reward.type === 'heal' && (
            <div className="reward-text heal-reward">❤ +{reward.amount} 生命</div>
          )}
          <button className="btn-primary" onClick={onClose}>收下并继续</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [selectedEnemy, setSelectedEnemy] = useState<Enemy | null>(null);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [rewardCards, setRewardCards] = useState<Card[]>([]);
  const [earnedGold, setEarnedGold] = useState(0);
  const [chestReward, setChestReward] = useState<ChestReward | null>(null);
  const [chestPhase, setChestPhase] = useState<ChestPhase>('idle');
  const [loadMsg, setLoadMsg] = useState<string>('加载游戏数据...');
  const [deckPreviewOpen, setDeckPreviewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await getOrCreatePlayer();
        setPlayer(p);
      } catch (e) {
        setLoadMsg('连接后端失败，请先运行 node server/index.js');
      }
    })();
  }, []);

  const startNewRun = useCallback(async () => {
    if (!player) return;
    setPhase('enemy_select');
    try {
      const es = await getRandomEnemies(player.level, 3);
      setEnemies(es);
    } catch {
      setEnemies([]);
    }
  }, [player]);

  const pickEnemy = useCallback(async (e: Enemy) => {
    if (!player) return;
    setSelectedEnemy(e);
    const result = runCombat(player, e);
    setCombatResult(result);
    setPhase('battle');
  }, [player]);

  const finishBattle = useCallback(async () => {
    if (!player || !selectedEnemy || !combatResult) return;
    const victory = combatResult.victory;
    const gold = victory ? Math.floor(Math.random() * 51) + 50 : 0;
    setEarnedGold(gold);
    const hpChange = combatResult.playerFinalHp - player.hp;

    if (victory) {
      try {
        const cards = await getRandomCards(3, player.level);
        setRewardCards(cards);
      } catch {
        setRewardCards([]);
      }
      const settled = await completeBattle(true, gold, null, hpChange);
      setPlayer(settled.player);
      setChestPhase('idle');
      setPhase('battle_end');
    } else {
      const settled = await completeBattle(false, 0, null, 0);
      setPlayer(settled.player);
      setPhase('game_over');
    }
  }, [player, selectedEnemy, combatResult]);

  const pickReward = useCallback(
    async (card: Card | null) => {
      if (!player) return;
      if (card) {
        const updated = await updatePlayer({
          deck: [...player.deck, { ...card, uid: card.uid || `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }],
        });
        setPlayer(updated);
      }
      setRewardCards([]);
      setPhase('reward');
    },
    [player]
  );

  const openChestHandler = useCallback(async () => {
    setChestPhase('shaking');
    setTimeout(async () => {
      setChestPhase('opening');
      const r = await openChest();
      setTimeout(() => {
        setChestReward(r);
        setChestPhase('opened');
      }, 350);
    }, 300);
  }, []);

  const applyChestRewardAndContinue = useCallback(async () => {
    if (!player || !chestReward) return;
    let updated = player;
    if (chestReward.type === 'card' && chestReward.card) {
      updated = await updatePlayer({
        deck: [
          ...player.deck,
          {
            ...chestReward.card,
            uid: chestReward.card.uid || `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          },
        ],
      });
    } else if (chestReward.type === 'gold') {
      updated = await updatePlayer({ gold: player.gold + (chestReward.amount || 0) });
    } else if (chestReward.type === 'heal') {
      updated = await updatePlayer({
        hp: Math.min(player.maxHp, player.hp + (chestReward.amount || 0)),
      });
    }
    setPlayer(updated);
    setChestReward(null);
    setChestPhase('idle');
    // 继续下一关
    setPhase('enemy_select');
    try {
      const es = await getRandomEnemies(updated.level, 3);
      setEnemies(es);
    } catch {
      setEnemies([]);
    }
  }, [player, chestReward]);

  const resetGame = useCallback(async () => {
    await resetPlayer();
    const p = await getOrCreatePlayer();
    setPlayer(p);
    setCombatResult(null);
    setSelectedEnemy(null);
    setChestReward(null);
    setChestPhase('idle');
    setPhase('menu');
  }, []);

  const openDeckPreview = () => setDeckPreviewOpen(true);
  const closeDeckPreview = () => setDeckPreviewOpen(false);

  if (!player) {
    return (
      <div className="app-root">
        <div className="game-container center-loading">
          <div className="loading-text">{loadMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="game-container">
        <StatBar player={player} />
        <div className="main-stage">
          {phase === 'menu' && (
            <div className="menu-screen">
              <div className="game-logo">
                <span className="logo-r">R</span>ogueCard
              </div>
              <p className="tagline">黑暗奇幻 · Roguelike卡牌战斗</p>
              <div className="menu-btns">
                <button className="btn-primary big" onClick={startNewRun}>
                  开始战斗
                </button>
                <button className="btn-secondary big" onClick={openDeckPreview}>
                  查看牌组 ({player.deck.length})
                </button>
                {player.stage > 1 && (
                  <button className="btn-ghost" onClick={resetGame}>
                    重置进度
                  </button>
                )}
              </div>
              <div className="menu-info">
                <div>等级 <b>Lv.{player.level}</b></div>
                <div>当前牌组 <b>{player.deck.length}</b> 张</div>
              </div>
            </div>
          )}

          {phase === 'enemy_select' && (
            <EnemySelect enemies={enemies} onPick={pickEnemy} />
          )}

          {phase === 'battle' && selectedEnemy && combatResult && (
            <BattleView
              result={combatResult}
              player={player}
              enemy={selectedEnemy}
              deck={player.deck}
              speed={1.2}
              onFinish={finishBattle}
            />
          )}

          {phase === 'battle_end' && combatResult && (
            <div className="reward-screen">
              <div className="reward-header">
                <h2>🏆 战斗胜利！</h2>
                <p className="reward-sub">{combatResult.summary}</p>
                <p className="reward-gold">💰 获得金币 +{earnedGold}</p>
              </div>
              <ChestBox
                phase={chestPhase}
                reward={chestReward}
                onOpen={openChestHandler}
                onClose={applyChestRewardAndContinue}
              />
              {rewardCards.length > 0 && chestPhase === 'idle' && (
                <CardSelectionModal
                  title="从以下卡牌中选择一张加入牌组"
                  cards={rewardCards}
                  onSelect={pickReward}
                />
              )}
            </div>
          )}

          {phase === 'reward' && (
            <div className="reward-screen">
              <div className="reward-header">
                <h2>宝箱奖励</h2>
              </div>
              <ChestBox
                phase={chestPhase}
                reward={chestReward}
                onOpen={openChestHandler}
                onClose={applyChestRewardAndContinue}
              />
            </div>
          )}

          {phase === 'game_over' && (
            <div className="game-over-screen">
              <h2>💀 游戏结束</h2>
              <p>你在 <b>第 {player.stage} 关</b> 倒下了...</p>
              <p>已为你重置游戏进度，重新开始冒险吧！</p>
              <div className="menu-btns">
                <button className="btn-primary big" onClick={() => setPhase('menu')}>
                  返回主菜单
                </button>
              </div>
            </div>
          )}
        </div>

        {deckPreviewOpen && (
          <div className="modal-backdrop in" onClick={closeDeckPreview}>
            <div className="card-selection-modal in" onClick={e => e.stopPropagation()}>
              <h2 className="modal-title">当前牌组 ({player.deck.length}张)</h2>
              <div className="card-grid deck-preview">
                {player.deck.map((c, i) => {
                  const border = getRarityColor(c.rarity);
                  return (
                    <div
                      key={c.uid || c.id + i}
                      className="rc-card rarity-common"
                      style={{
                        borderColor: border,
                        boxShadow: `0 0 10px ${border}55`,
                      }}
                    >
                      <div className="rc-card-cost">
                        <div className="diamond"><span>{c.cost}</span></div>
                      </div>
                      <div className="rc-card-type">{getTypeIcon(c.type)}</div>
                      <div className="rc-card-name">{c.name}</div>
                      <div className="rc-card-desc">{c.desc}</div>
                      <div className="rc-card-value">{c.value}</div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-footer">
                <button className="btn-skip" onClick={closeDeckPreview}>关闭</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
