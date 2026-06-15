import React, { useEffect, useState } from 'react';
import type { Monster, Weapon } from '../types';
import { eventBus } from '../utils/EventBus';

interface BattleSceneProps {
  monster: Monster;
  weapons: Weapon[];
  playerHp: number;
  playerMaxHp: number;
}

export const BattleScene: React.FC<BattleSceneProps> = ({ monster, weapons, playerHp, playerMaxHp }) => {
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(weapons[0]?.id || '');
  const [monsterHp, setMonsterHp] = useState<number>(monster.hp);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [playerAttacking, setPlayerAttacking] = useState(false);
  const [monsterHit, setMonsterHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [redflash, setRedflash] = useState(false);
  const [monsterDamage, setMonsterDamage] = useState<number | null>(null);
  const [playerDamage, setPlayerDamage] = useState<number | null>(null);

  useEffect(() => {
    setMonsterHp(monster.hp);
    setIsPlayerTurn(true);
    if (!selectedWeaponId && weapons.length > 0) {
      setSelectedWeaponId(weapons[0].id);
    }
  }, [monster.id, weapons]);

  useEffect(() => {
    const offPlayerAttack = eventBus.on('battle:player-attack', ({ damage }) => {
      setPlayerAttacking(true);
      setShowSlash(true);
      setIsPlayerTurn(false);
      setMonsterDamage(damage);
      window.setTimeout(() => {
        setPlayerAttacking(false);
        setMonsterHit(true);
        setShowSlash(false);
        setMonsterHp((hp) => Math.max(0, hp - damage));
        window.setTimeout(() => {
          setMonsterHit(false);
          setMonsterDamage(null);
        }, 400);
      }, 400);
    });
    const offMonsterAttack = eventBus.on('battle:monster-attack', ({ damage }) => {
      setShake(true);
      setRedflash(true);
      setPlayerDamage(damage);
      window.setTimeout(() => {
        setShake(false);
        setPlayerHit(true);
        window.setTimeout(() => {
          setRedflash(false);
          setPlayerHit(false);
          setPlayerDamage(null);
          setIsPlayerTurn(true);
        }, 300);
      }, 200);
    });
    return () => {
      offPlayerAttack();
      offMonsterAttack();
    };
  }, []);

  const handleAttack = () => {
    if (!isPlayerTurn || !selectedWeaponId) return;
    eventBus.emit('player:attack', { weaponId: selectedWeaponId });
  };

  const handleFlee = () => {
    if (!isPlayerTurn) return;
    eventBus.emit('battle:flee', undefined);
  };

  const monsterHpPct = (monsterHp / monster.maxHp) * 100;
  const playerHpPct = (playerHp / playerMaxHp) * 100;

  return (
    <div className={`battle-overlay ${shake ? 'shake' : ''} ${redflash ? 'redflash' : ''}`}>
      <button className="battle-flee-btn" onClick={handleFlee} disabled={!isPlayerTurn}>
        🏃 逃跑
      </button>
      <div className={`battle-turn-indicator ${isPlayerTurn ? 'player-turn' : 'enemy-turn'}`}>
        {isPlayerTurn ? '⏳ 你的回合' : '💢 敌人回合'}
      </div>
      <div className="battle-title">⚔️ 战斗！</div>
      <div className="battle-arena">
        <div className="battle-unit monster">
          <span className="battle-unit-name monster-name">{monster.icon} {monster.name}</span>
          <div className="battle-hp-bar">
            <div className="battle-hp-fill" style={{ width: `${monsterHpPct}%` }} />
            <span className="battle-hp-text">{monsterHp} / {monster.maxHp}</span>
          </div>
          <div className={`battle-sprite ${monsterHit ? 'hit' : ''}`}>
            {monster.icon}
            {monsterDamage !== null && (
              <span className="battle-damage-float">-{monsterDamage}</span>
            )}
          </div>
        </div>

        <div className="battle-vs">VS</div>

        <div className="battle-unit player">
          <span className="battle-unit-name player-name">🧙 冒险者</span>
          <div className="battle-hp-bar">
            <div className="battle-hp-fill player-hp" style={{ width: `${playerHpPct}%` }} />
            <span className="battle-hp-text">{playerHp} / {playerMaxHp}</span>
          </div>
          <div className={`battle-sprite player-sprite-big ${playerAttacking ? 'attacking' : ''} ${playerHit ? 'hit' : ''}`}>
            🧙
            {showSlash && <div className="slash-effect" />}
            {playerDamage !== null && (
              <span className="battle-damage-float player-dmg">-{playerDamage}</span>
            )}
          </div>
        </div>
      </div>

      <div className="battle-weapons">
        {weapons.map((w) => (
          <button
            key={w.id}
            className={`battle-weapon-btn ${selectedWeaponId === w.id ? 'selected' : ''}`}
            onClick={() => setSelectedWeaponId(w.id)}
            disabled={!isPlayerTurn}
          >
            {w.icon}
            <span className="battle-weapon-dmg">伤害{w.damage}</span>
          </button>
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: 120, left: '50%', transform: 'translateX(-50%)' }}>
        <button
          className="modal-btn"
          onClick={handleAttack}
          disabled={!isPlayerTurn}
          style={{ width: 160, height: 44, fontSize: 16, marginTop: 0 }}
        >
          ⚔️ 攻击
        </button>
      </div>
    </div>
  );
};
