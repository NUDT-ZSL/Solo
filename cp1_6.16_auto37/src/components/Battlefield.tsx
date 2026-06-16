import React from 'react';
import { Character } from '@/gameLogic';

interface BattlefieldProps {
  playerTeam: Character[];
  enemyTeam: Character[];
  selectedTargetId: string | null;
  onSelectTarget: (targetId: string) => void;
  currentTurn: 'player' | 'enemy';
  currentAttackerIndex: number;
  lastDamage: { targetId: string; damage: number } | null;
}

const CharacterCard: React.FC<{
  character: Character;
  isSelected: boolean;
  isEnemy: boolean;
  isCurrentAttacker: boolean;
  onClick: () => void;
  showDamage: number | null;
}> = ({ character, isSelected, isEnemy, isCurrentAttacker, onClick, showDamage }) => {
  const [isClicked, setIsClicked] = React.useState(false);
  const hpPercent = (character.currentHp / character.maxHp) * 100;
  const isDefeated = character.isDefeated;

  const handleClick = () => {
    if (isDefeated) return;
    setIsClicked(true);
    onClick();
    setTimeout(() => setIsClicked(false), 400);
  };

  return (
    <div
      className={`
        relative character-card-wrapper
        ${isDefeated ? 'defeated' : ''}
      `}
    >
      <div
        onClick={handleClick}
        className={`
          relative p-4 rounded-lg cursor-pointer
          transition-all duration-200 ease-out
          ${isDefeated ? 'opacity-50 grayscale' : ''}
          ${isCurrentAttacker ? 'attacker-highlight' : ''}
          ${isClicked ? 'card-clicked' : ''}
          ${isSelected ? 'card-selected' : ''}
        `}
        style={{
          backgroundColor: '#2C3E50',
          color: '#ECF0F1',
          minWidth: '180px',
          border: isSelected ? '3px solid #F1C40F' : '2px solid transparent',
          boxShadow: isSelected ? '0 0 20px rgba(241, 196, 15, 0.6)' : '0 4px 6px rgba(0, 0, 0, 0.3)',
          willChange: 'transform, box-shadow',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {isSelected && (
          <div className="selected-glow" />
        )}

        {isCurrentAttacker && !isDefeated && (
          <div
            className="absolute -top-2 -right-2 px-2 py-1 rounded text-xs font-bold"
            style={{ backgroundColor: '#F1C40F', color: '#2C3E50' }}
          >
            行动中
          </div>
        )}

        <div className="text-center mb-2">
          <div className="text-lg font-bold mb-1">{character.name}</div>
          <div
            className="text-xs px-2 py-1 rounded inline-block"
            style={{ backgroundColor: '#34495E', color: '#BDC3C7' }}
          >
            {character.skillName} · {character.skillPower}x
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: '#BDC3C7' }}>生命值</span>
            <span style={{ color: '#ECF0F1' }}>{character.currentHp}/{character.maxHp}</span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: '#1A252F' }}
          >
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${hpPercent}%`,
                background: 'linear-gradient(90deg, #E74C3C 0%, #2ECC71 100%)',
              }}
            />
          </div>
        </div>

        <div className="flex justify-between text-xs">
          <div>
            <span style={{ color: '#BDC3C7' }}>攻击: </span>
            <span style={{ color: '#ECF0F1' }}>{character.attack}</span>
          </div>
        </div>

        {isSelected && !isDefeated && (
          <div className="target-aura" />
        )}

        {showDamage !== null && showDamage > 0 && (
          <div key={`damage-${Date.now()}`} className="damage-number">
            -{showDamage}
          </div>
        )}
      </div>
    </div>
  );
};

const Battlefield: React.FC<BattlefieldProps> = ({
  playerTeam,
  enemyTeam,
  selectedTargetId,
  onSelectTarget,
  currentTurn,
  currentAttackerIndex,
  lastDamage,
}) => {
  return (
    <div className="battlefield-container w-full">
      <div className="battlefield-layout">
        <div className="team-section">
          <div
            className="text-center font-bold text-lg mb-4"
            style={{ color: '#3498DB' }}
          >
            我方阵营
          </div>
          <div className="team-cards">
            {playerTeam.map((character, index) => (
              <CharacterCard
                key={character.id}
                character={character}
                isSelected={selectedTargetId === character.id && currentTurn === 'enemy'}
                isEnemy={false}
                isCurrentAttacker={currentTurn === 'player' && currentAttackerIndex === index}
                onClick={() => {
                  if (currentTurn === 'enemy' && !character.isDefeated) {
                    onSelectTarget(character.id);
                  }
                }}
                showDamage={
                  lastDamage?.targetId === character.id && currentTurn === 'enemy'
                    ? lastDamage.damage
                    : null
                }
              />
            ))}
          </div>
        </div>

        <div className="vs-divider flex items-center justify-center">
          <div
            className="text-3xl font-bold"
            style={{ color: '#F1C40F', textShadow: '0 0 10px rgba(241, 196, 15, 0.5)' }}
          >
            VS
          </div>
        </div>

        <div className="team-section">
          <div
            className="text-center font-bold text-lg mb-4"
            style={{ color: '#E74C3C' }}
          >
            敌方阵营
          </div>
          <div className="team-cards">
            {enemyTeam.map((character, index) => (
              <CharacterCard
                key={character.id}
                character={character}
                isSelected={selectedTargetId === character.id && currentTurn === 'player'}
                isEnemy={true}
                isCurrentAttacker={currentTurn === 'enemy' && currentAttackerIndex === index}
                onClick={() => {
                  if (currentTurn === 'player' && !character.isDefeated) {
                    onSelectTarget(character.id);
                  }
                }}
                showDamage={
                  lastDamage?.targetId === character.id && currentTurn === 'player'
                    ? lastDamage.damage
                    : null
                }
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .battlefield-container {
          width: 100%;
        }

        .battlefield-layout {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 24px;
          width: 100%;
        }

        .team-section {
          flex: 1;
          min-width: 0;
        }

        .team-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .vs-divider {
          padding: 0 16px;
        }

        .character-card-wrapper {
          position: relative;
          will-change: transform, opacity;
        }

        .character-card-wrapper.defeated {
          animation: fadeOutExit 0.5s ease-out forwards;
        }

        .character-card-wrapper .selected-glow {
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border-radius: 8px;
          animation: borderFlash 0.2s ease-in-out 3;
          pointer-events: none;
          z-index: -1;
        }

        .card-clicked {
          transform: scale(1.05) !important;
          animation: clickPulse 0.2s ease-out;
        }

        .card-selected {
          animation: selectedBorderFlash 0.2s ease-in-out 3;
        }

        .cursor-pointer:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4) !important;
        }

        .cursor-pointer:active {
          transform: scale(1.05);
        }

        .attacker-highlight {
          animation: pulseAttacker 1.5s ease-in-out infinite;
        }

        .target-aura {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(243, 156, 18, 0.6) 0%, transparent 70%);
          animation: auraPulse 1.5s ease-in-out infinite;
          pointer-events: none;
        }

        .damage-number {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 24px;
          font-weight: bold;
          color: #E74C3C;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(231, 76, 60, 0.5), 0 0 20px rgba(231, 76, 60, 0.3);
          animation: damageFloatUp 0.6s ease-out forwards;
          pointer-events: none;
          z-index: 10;
          will-change: transform, opacity;
          transform: translateZ(0);
          white-space: nowrap;
        }

        @keyframes clickPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1.05);
          }
        }

        @keyframes selectedBorderFlash {
          0%, 100% {
            box-shadow: 0 0 0 3px #F1C40F, 0 0 20px rgba(241, 196, 15, 0.6);
          }
          50% {
            box-shadow: 0 0 0 6px #F1C40F, 0 0 35px rgba(241, 196, 15, 0.9), 0 0 50px rgba(241, 196, 15, 0.5);
          }
        }

        @keyframes borderFlash {
          0%, 100% {
            box-shadow: 0 0 0 3px #F1C40F, 0 0 20px rgba(241, 196, 15, 0.6);
          }
          50% {
            box-shadow: 0 0 0 5px #F1C40F, 0 0 30px rgba(241, 196, 15, 0.8);
          }
        }

        @keyframes auraPulse {
          0%, 100% {
            opacity: 0.6;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) scale(1.1);
          }
        }

        @keyframes pulseAttacker {
          0%, 100% {
            box-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
          }
          50% {
            box-shadow: 0 0 25px rgba(52, 152, 219, 0.8);
          }
        }

        @keyframes damageFloatUp {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px) scale(0.3) translateZ(0);
          }
          15% {
            opacity: 1;
            transform: translateX(-50%) translateY(10px) scale(1.3) translateZ(0);
          }
          40% {
            opacity: 1;
            transform: translateX(-50%) translateY(-15px) scale(1.1) translateZ(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-60px) scale(0.9) translateZ(0);
          }
        }

        @keyframes fadeOutExit {
          0% {
            opacity: 1;
            filter: grayscale(0%);
          }
          100% {
            opacity: 0.4;
            filter: grayscale(100%);
          }
        }

        @media (max-width: 768px) {
          .battlefield-layout {
            flex-direction: column;
            gap: 16px;
          }

          .team-cards {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 8px;
          }

          .vs-divider {
            padding: 8px 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Battlefield;
