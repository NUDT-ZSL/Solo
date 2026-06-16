import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Card, Deck, BattleState, BattleUnit } from '../types';
import {
  createBattleState,
  playCard,
  attack,
  attackHero,
  endTurn,
  clearPendingEffect,
  runAITurn
} from '../game/CardEngine';

interface BattleArenaProps {
  allCards: Card[];
  playerDeck: Deck;
  aiDeck: Deck;
  battleState?: BattleState | null;
  onBattleStateChange: (state: BattleState) => void;
  onBattleEnd: (state: BattleState) => void;
  onBack: () => void;
}

const MAX_FIELD_SIZE = 5;

const BattleArena: React.FC<BattleArenaProps> = ({
  allCards,
  playerDeck,
  aiDeck,
  battleState: _battleState,
  onBattleStateChange,
  onBattleEnd,
  onBack
}) => {
  const [localState, setLocalState] = useState<BattleState | null>(null);
  const [selectedHandCard, setSelectedHandCard] = useState<Card | null>(null);
  const [selectedFieldUnit, setSelectedFieldUnit] = useState<BattleUnit | null>(null);
  const [attackingUnit, setAttackingUnit] = useState<BattleUnit | null>(null);
  const [attackTarget, setAttackTarget] = useState<BattleUnit | null>(null);
  const [isAITurn, setIsAITurn] = useState(false);
  const [effectFlash, setEffectFlash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const battleEndedRef = useRef(false);

  useEffect(() => {
    const playerCards = playerDeck.cardIds
      .map(id => allCards.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    const aiCards = aiDeck.cardIds
      .map(id => allCards.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    
    const state = createBattleState(playerCards, aiCards);
    setLocalState(state);
    onBattleStateChange(state);
    battleEndedRef.current = false;
  }, [playerDeck, aiDeck, allCards]);

  useEffect(() => {
    if (!localState) return;
    
    if (localState.pendingEffect && !effectFlash) {
      setEffectFlash(localState.pendingEffect.name);
      setTimeout(() => {
        setEffectFlash(null);
        const newState = { ...localState };
        clearPendingEffect(newState);
        setLocalState(newState);
        onBattleStateChange(newState);
      }, 800);
    }
  }, [localState?.pendingEffect, effectFlash]);

  useEffect(() => {
    if (!localState || !localState.gameOver || battleEndedRef.current) return;
    battleEndedRef.current = true;
    onBattleEnd(localState);
  }, [localState?.gameOver]);

  useEffect(() => {
    if (!localState || localState.currentPlayer !== 'ai' || localState.gameOver || isAITurn) return;
    
    setIsAITurn(true);
    showMessage('AI回合...');
    
    const aiTimeout = setTimeout(() => {
      const stateCopy = JSON.parse(JSON.stringify(localState)) as BattleState;
      runAITurn(stateCopy);
      
      setTimeout(() => {
        setLocalState(stateCopy);
        onBattleStateChange(stateCopy);
        setIsAITurn(false);
      }, 300);
    }, 500);
    
    return () => clearTimeout(aiTimeout);
  }, [localState?.currentPlayer, localState?.gameOver]);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 1500);
  }, []);

  const updateState = useCallback((newState: BattleState) => {
    setLocalState(newState);
    onBattleStateChange(newState);
  }, [onBattleStateChange]);

  const handleHandCardClick = (card: Card) => {
    if (!localState || localState.currentPlayer !== 'player' || isAITurn) return;
    if (card.cost > localState.playerMana) {
      showMessage('法力值不足');
      return;
    }
    
    if (selectedHandCard === card) {
      setSelectedHandCard(null);
      return;
    }
    
    setSelectedHandCard(card);
    setSelectedFieldUnit(null);
  };

  const handlePlayerSlotClick = (slotIndex: number) => {
    if (!localState || !selectedHandCard || localState.currentPlayer !== 'player' || isAITurn) return;
    
    const stateCopy = JSON.parse(JSON.stringify(localState)) as BattleState;
    const cardRef = stateCopy.playerHand.find(c => c.id === selectedHandCard.id);
    if (!cardRef) return;
    
    const result = playCard(stateCopy, cardRef, slotIndex, 'player');
    
    if (result.success) {
      setSelectedHandCard(null);
      updateState(stateCopy);
    } else {
      showMessage(result.message);
    }
  };

  const handleFieldUnitClick = (unit: BattleUnit) => {
    if (!localState || localState.currentPlayer !== 'player' || isAITurn) return;
    
    if (unit.owner === 'player') {
      if (unit.hasAttacked) {
        showMessage('本回合已攻击');
        return;
      }
      setSelectedFieldUnit(unit);
      setSelectedHandCard(null);
    } else {
      if (!selectedFieldUnit) {
        showMessage('请先选择一个己方单位');
        return;
      }
      
      setAttackingUnit(selectedFieldUnit);
      setAttackTarget(unit);
      
      setTimeout(() => {
        const stateCopy = JSON.parse(JSON.stringify(localState)) as BattleState;
        const attackerRef = stateCopy.playerField.find(u => u.instanceId === selectedFieldUnit.instanceId);
        const defenderRef = stateCopy.aiField.find(u => u.instanceId === unit.instanceId);
        
        if (attackerRef && defenderRef) {
          const result = attack(stateCopy, attackerRef, defenderRef);
          if (result.success) {
            updateState(stateCopy);
          } else {
            showMessage(result.message);
          }
        }
        
        setAttackingUnit(null);
        setAttackTarget(null);
        setSelectedFieldUnit(null);
      }, 300);
    }
  };

  const handleAIHeroClick = () => {
    if (!localState || !selectedFieldUnit || localState.currentPlayer !== 'player' || isAITurn) return;
    if (localState.aiField.length > 0) {
      showMessage('必须先消灭敌方单位');
      return;
    }
    
    const stateCopy = JSON.parse(JSON.stringify(localState)) as BattleState;
    const attackerRef = stateCopy.playerField.find(u => u.instanceId === selectedFieldUnit.instanceId);
    
    if (attackerRef) {
      const result = attackHero(stateCopy, attackerRef, 'ai');
      if (result.success) {
        updateState(stateCopy);
        setSelectedFieldUnit(null);
      } else {
        showMessage(result.message);
      }
    }
  };

  const handleEndTurn = () => {
    if (!localState || localState.currentPlayer !== 'player' || isAITurn) return;
    
    const stateCopy = JSON.parse(JSON.stringify(localState)) as BattleState;
    endTurn(stateCopy);
    setSelectedHandCard(null);
    setSelectedFieldUnit(null);
    updateState(stateCopy);
  };

  if (!localState) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#E94560',
        fontSize: '24px'
      }}>
        初始化对战...
      </div>
    );
  }

  const renderFieldSlot = (
    unit: BattleUnit | undefined,
    slotIndex: number,
    owner: 'player' | 'ai',
    isTargetable: boolean
  ) => {
    const isSelected = selectedFieldUnit?.instanceId === unit?.instanceId;
    const isAttacking = attackingUnit?.instanceId === unit?.instanceId;
    const isTarget = attackTarget?.instanceId === unit?.instanceId;
    
    if (owner === 'player' && !unit && selectedHandCard) {
      return (
        <div
          key={slotIndex}
          onClick={() => handlePlayerSlotClick(slotIndex)}
          style={{
            width: '110px',
            height: '150px',
            border: '2px dashed #32CD32',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'rgba(50, 205, 50, 0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(50, 205, 50, 0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(50, 205, 50, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span style={{ color: '#32CD32', fontSize: '14px' }}>点击部署</span>
        </div>
      );
    }
    
    if (!unit) {
      return (
        <div
          key={slotIndex}
          style={{
            width: '110px',
            height: '150px',
            border: '2px dashed #0F3460',
            borderRadius: '10px',
            opacity: 0.3
          }}
        />
      );
    }
    
    return (
      <div
        key={unit.instanceId}
        onClick={() => handleFieldUnitClick(unit)}
        style={{
          position: 'relative',
          width: '110px',
          height: '150px',
          background: '#16213E',
          border: `3px solid ${isSelected ? '#FF6347' : isTarget ? '#FF0' : '#0F3460'}`,
          borderRadius: '10px',
          padding: '8px',
          cursor: owner === 'player' && !unit.hasAttacked ? 'pointer' : isTargetable ? 'pointer' : 'default',
          transition: 'transform 0.3s ease, box-shadow 0.2s ease',
          transform: isAttacking ? 'translateX(-120px)' : isTarget ? 'scale(1.1)' : 'none',
          boxShadow: isSelected 
            ? '0 0 20px rgba(255, 99, 71, 0.6)' 
            : isTarget 
              ? '0 0 20px rgba(255, 255, 0, 0.6)'
              : '0 4px 12px rgba(0,0,0,0.4)',
          opacity: unit.hasAttacked && owner === 'player' ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if ((owner === 'player' && !unit.hasAttacked) || isTargetable) {
            e.currentTarget.style.transform = isAttacking 
              ? 'translateX(-120px)' 
              : `translateY(-5px) scale(${isTarget ? '1.15' : '1.05'})`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isAttacking ? 'translateX(-120px)' : isTarget ? 'scale(1.1)' : 'none';
        }}
      >
        <div style={{
          position: 'absolute',
          top: '-6px',
          left: '-6px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#FFD700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '13px',
          color: '#1A1A2E',
          boxShadow: '0 2px 6px rgba(255, 215, 0, 0.5)',
          zIndex: 10
        }}>
          {unit.cost}
        </div>
        
        <h4 style={{
          color: '#E94560',
          fontSize: '12px',
          margin: '0 0 6px 0',
          fontWeight: 700,
          textAlign: 'center'
        }}>
          {unit.name}
        </h4>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: '1px solid #0F3460'
        }}>
          <span style={{ color: '#FF6B6B', fontWeight: 700, fontSize: '14px' }}>
            ⚔️ {unit.currentAttack}
          </span>
          <span style={{ color: '#4ECDC4', fontWeight: 700, fontSize: '14px' }}>
            ❤️ {unit.currentHealth}
          </span>
        </div>
      </div>
    );
  };

  const renderHandCard = (card: Card, index: number) => {
    const isSelected = selectedHandCard?.id === card.id;
    const canPlay = card.cost <= localState.playerMana;
    
    return (
      <div
        key={`${card.id}-${index}`}
        onClick={() => handleHandCardClick(card)}
        style={{
          position: 'relative',
          width: '90px',
          height: '125px',
          background: '#16213E',
          border: `3px solid ${isSelected ? '#FF6347' : '#0F3460'}`,
          borderRadius: '10px',
          padding: '8px',
          cursor: canPlay ? 'pointer' : 'not-allowed',
          transition: 'all 0.1s ease',
          transform: isSelected ? 'scale(1.1)' : 'none',
          boxShadow: isSelected 
            ? '0 0 25px rgba(255, 99, 71, 0.7)' 
            : '0 4px 12px rgba(0,0,0,0.4)',
          opacity: canPlay ? 1 : 0.5,
          margin: isSelected ? '0 15px' : '0 5px',
          marginTop: isSelected ? '-20px' : '0'
        }}
        onMouseEnter={(e) => {
          if (canPlay && !isSelected) {
            e.currentTarget.style.transform = 'translateY(-15px) scale(1.08)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(233, 69, 96, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
          }
        }}
      >
        <div style={{
          position: 'absolute',
          top: '-6px',
          left: '-6px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: canPlay ? '#FFD700' : '#666',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '12px',
          color: '#1A1A2E',
          zIndex: 10
        }}>
          {card.cost}
        </div>
        
        <h4 style={{
          color: '#E94560',
          fontSize: '11px',
          margin: '0 0 4px 0',
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: '1.2'
        }}>
          {card.name}
        </h4>
        
        <div style={{
          fontSize: '9px',
          color: '#aaa',
          lineHeight: '1.3',
          marginBottom: '6px'
        }}>
          {card.effectName}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          position: 'absolute',
          bottom: '6px',
          left: '8px',
          right: '8px'
        }}>
          <span style={{ color: '#FF6B6B', fontWeight: 700, fontSize: '12px' }}>
            ⚔️{card.attack}
          </span>
          <span style={{ color: '#4ECDC4', fontWeight: 700, fontSize: '12px' }}>
            ❤️{card.health}
          </span>
        </div>
      </div>
    );
  };

  const renderManaCrystals = (current: number, max: number) => {
    return (
      <div style={{ display: 'flex', gap: '3px' }}>
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: i < current 
                ? 'linear-gradient(135deg, #4FC3F7, #0288D1)' 
                : 'rgba(79, 195, 247, 0.2)',
              border: `1px solid ${i < current ? '#0288D1' : 'rgba(79, 195, 247, 0.3)'}`,
              boxShadow: i < current ? '0 0 8px rgba(79, 195, 247, 0.5)' : 'none',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      gap: '12px',
      background: '#1A1A2E',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {effectFlash && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.3), rgba(255, 69, 0, 0.3))',
          animation: 'flashEffect 0.8s ease-out'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 0 30px #FF6347, 0 0 60px #FFA500',
            animation: 'pulseText 0.8s ease-out'
          }}>
            ⚡ {effectFlash}
          </div>
        </div>
      )}

      {localState.gameOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          background: 'rgba(26, 26, 46, 0.95)'
        }}>
          <div style={{
            fontSize: '72px',
            marginBottom: '24px'
          }}>
            {localState.winner === 'player' ? '🏆' : '💀'}
          </div>
          <h2 style={{
            color: localState.winner === 'player' ? '#98FB98' : '#FFB6C1',
            fontSize: '48px',
            margin: '0 0 24px 0'
          }}>
            {localState.winner === 'player' ? '胜利！' : '失败...'}
          </h2>
          <p style={{ color: '#aaa', fontSize: '18px', marginBottom: '32px' }}>
            共进行 {localState.turn} 回合
          </p>
          <button
            onClick={onBack}
            style={{
              padding: '16px 48px',
              fontSize: '18px',
              fontWeight: 700,
              background: '#E94560',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FF6B8A';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#E94560';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            返回卡组
          </button>
        </div>
      )}

      {message && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#16213E',
          color: '#E94560',
          padding: '10px 24px',
          borderRadius: '8px',
          border: '2px solid #E94560',
          zIndex: 150,
          fontWeight: 600,
          animation: 'slideDown 0.3s ease'
        }}>
          {message}
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: '#16213E',
        borderRadius: '10px',
        border: '2px solid #0F3460'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              background: '#0F3460',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E94560';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0F3460';
            }}
          >
            ← 返回
          </button>
          <span style={{ color: '#E94560', fontSize: '20px', fontWeight: 700 }}>
            回合 {localState.turn}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 16px',
          background: localState.currentPlayer === 'player' ? 'rgba(233, 69, 96, 0.2)' : 'rgba(255, 99, 71, 0.2)',
          borderRadius: '20px',
          border: `2px solid ${localState.currentPlayer === 'player' ? '#E94560' : '#FF6347'}`
        }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>
            {localState.currentPlayer === 'player' ? '🎮 你的回合' : '🤖 AI回合'}
          </span>
        </div>
        
        <button
          onClick={handleEndTurn}
          disabled={localState.currentPlayer !== 'player' || isAITurn || localState.gameOver}
          style={{
            padding: '12px 28px',
            background: localState.currentPlayer === 'player' ? '#32CD32' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: localState.currentPlayer === 'player' ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            opacity: localState.currentPlayer === 'player' ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (localState.currentPlayer === 'player') {
              e.currentTarget.style.background = '#3CB371';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = localState.currentPlayer === 'player' ? '#32CD32' : '#555';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          结束回合 ▶
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: '#16213E',
        borderRadius: '10px',
        border: '2px solid #0F3460'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #C62828, #B71C1C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            cursor: selectedFieldUnit && localState.aiField.length === 0 ? 'pointer' : 'default',
            border: selectedFieldUnit && localState.aiField.length === 0 ? '3px solid #FF0' : '3px solid #8B0000',
            transition: 'all 0.2s ease'
          }}
          onClick={handleAIHeroClick}
          onMouseEnter={(e) => {
            if (selectedFieldUnit && localState.aiField.length === 0) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            🤖
          </div>
          <div>
            <div style={{ color: '#E94560', fontWeight: 700, fontSize: '16px' }}>AI对手</div>
            <div style={{ color: '#aaa', fontSize: '14px' }}>
              ❤️ {localState.aiHealth} | 
              手牌: {localState.aiHand.length} | 
              牌库: {localState.aiDeck.length}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#4FC3F7', fontWeight: 600 }}>法力:</span>
          {renderManaCrystals(localState.aiMana, localState.aiMaxMana)}
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        padding: '0 40px',
        background: 'linear-gradient(180deg, rgba(15, 52, 96, 0.3) 0%, rgba(26, 26, 46, 0.3) 100%)',
        borderRadius: '10px',
        border: '2px solid #0F3460'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '150px',
          alignItems: 'center'
        }}>
          {Array.from({ length: MAX_FIELD_SIZE }, (_, i) => {
            const unit = localState.aiField[i];
            const isTargetable = !!selectedFieldUnit && !!unit;
            return renderFieldSlot(unit, i, 'ai', isTargetable);
          })}
        </div>

        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #0F3460, transparent)'
        }} />

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '150px',
          alignItems: 'center'
        }}>
          {Array.from({ length: MAX_FIELD_SIZE }, (_, i) => {
            const unit = localState.playerField[i];
            return renderFieldSlot(unit, i, 'player', false);
          })}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: '#16213E',
        borderRadius: '10px',
        border: '2px solid #0F3460'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            border: '3px solid #1976D2'
          }}>
            🎮
          </div>
          <div>
            <div style={{ color: '#E94560', fontWeight: 700, fontSize: '16px' }}>你</div>
            <div style={{ color: '#aaa', fontSize: '14px' }}>
              ❤️ {localState.playerHealth} | 
              牌库: {localState.playerDeck.length}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#4FC3F7', fontWeight: 600 }}>法力:</span>
          {renderManaCrystals(localState.playerMana, localState.playerMaxMana)}
          <span style={{ color: '#4FC3F7', fontWeight: 700, fontSize: '18px', marginLeft: '8px' }}>
            {localState.playerMana}/{localState.playerMaxMana}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        minHeight: '140px',
        padding: '8px',
        background: '#16213E',
        borderRadius: '10px',
        border: '2px solid #0F3460'
      }}>
        {localState.playerHand.length === 0 ? (
          <span style={{ color: '#666', fontSize: '16px' }}>手牌为空</span>
        ) : (
          localState.playerHand.map((card, index) => renderHandCard(card, index))
        )}
      </div>

      <style>{`
        @keyframes flashEffect {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes pulseText {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (max-width: 768px) {
          div[style*="padding: 16px; gap: 12px;"] {
            padding: 8px !important;
            gap: 8px !important;
          }
          div[style*="padding: 0 40px"] {
            padding: 0 10px !important;
          }
          div[style*="width: 110px; height: 150px"] {
            width: 65px !important;
            height: 95px !important;
          }
          div[style*="width: 90px; height: 125px"] {
            width: 60px !important;
            height: 85px !important;
          }
          div[style*="gap: 16px"] {
            gap: 6px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BattleArena;
