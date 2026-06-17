import { useState, useEffect, useRef } from 'react';
import './BattleScene.css';

interface DamageNumber {
  id: number;
  value: number;
  x: number;
  y: number;
}

interface BattleSceneProps {
  targetHp: number;
  maxHp: number;
  isHit: boolean;
  isDead: boolean;
  onCrystalShatterComplete?: () => void;
}

export function BattleScene({ targetHp, maxHp, isHit, isDead, onCrystalShatterComplete }: BattleSceneProps) {
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [isShattered, setIsShattered] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const damageIdRef = useRef(0);
  const prevHpRef = useRef(targetHp);

  useEffect(() => {
    if (targetHp < prevHpRef.current) {
      const damage = prevHpRef.current - targetHp;
      if (damage > 0) {
        const id = damageIdRef.current++;
        const x = 45 + Math.random() * 10;
        const y = 30 + Math.random() * 10;
        
        setDamageNumbers(prev => [...prev, { id, value: damage, x, y }]);
        
        setTimeout(() => {
          setDamageNumbers(prev => prev.filter(d => d.id !== id));
        }, 1500);

        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      }
    }
    prevHpRef.current = targetHp;
  }, [targetHp]);

  useEffect(() => {
    if (isDead && !isShattered) {
      setIsShattered(true);
      
      setTimeout(() => {
        setIsShattered(false);
        if (onCrystalShatterComplete) {
          onCrystalShatterComplete();
        }
      }, 1000);
    }
  }, [isDead, isShattered, onCrystalShatterComplete]);

  const hpPercent = (targetHp / maxHp) * 100;

  return (
    <div className="battle-scene">
      <div className="scene-background">
        <div className="bg-gradient"></div>
        <div className="bg-particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="bg-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="battle-content">
        <div className="target-container">
          {!isShattered ? (
            <div className={`crystal-target ${isShaking ? 'shake' : ''} ${isHit ? 'hit' : ''}`}>
              <div className="crystal-glow"></div>
              <div className="crystal-body">
                <div className="crystal-face crystal-front"></div>
                <div className="crystal-face crystal-back"></div>
                <div className="crystal-face crystal-left"></div>
                <div className="crystal-face crystal-right"></div>
                <div className="crystal-face crystal-top"></div>
              </div>
              <div className="crystal-reflection"></div>
            </div>
          ) : (
            <div className="crystal-shattered">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="crystal-shard"
                  style={{
                    left: '50%',
                    top: '50%',
                    animationDelay: `${i * 0.05}s`,
                    transform: `rotate(${i * 30}deg)`,
                  }}
                >
                  <div className="shard-piece"></div>
                </div>
              ))}
              <div className="shatter-glow"></div>
            </div>
          )}

          {damageNumbers.map(dn => (
            <div
              key={dn.id}
              className="damage-number"
              style={{
                left: `${dn.x}%`,
                top: `${dn.y}%`,
              }}
            >
              -{dn.value}
            </div>
          ))}
        </div>

        <div className="hp-bar-container">
          <div className="hp-bar-label">
            <span>目标生命值</span>
            <span>{Math.round(targetHp)} / {maxHp}</span>
          </div>
          <div className="hp-bar-background">
            <div
              className="hp-bar-fill"
              style={{ width: `${hpPercent}%` }}
            />
            <div className="hp-bar-glow" style={{ width: `${hpPercent}%` }} />
          </div>
        </div>

        <div className="target-label">
          <span className="label-icon">💎</span>
          <span>元素水晶</span>
        </div>
      </div>
    </div>
  );
}
