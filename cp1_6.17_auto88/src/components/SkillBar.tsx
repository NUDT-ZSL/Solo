import React, { useEffect, useState } from 'react';
import { SKILLS, SkillType } from '../game/skills';
import { CooldownState } from '../game/gameEngine';

interface SkillBarProps {
  cooldowns: CooldownState;
}

interface SkillIconProps {
  skillType: SkillType;
  cooldown: number;
}

const SkillIcon: React.FC<SkillIconProps> = ({ skillType, cooldown }) => {
  const skill = SKILLS.find((s) => s.type === skillType);
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevReady, setPrevReady] = useState(true);

  if (!skill) return null;

  const isReady = cooldown <= 0;
  const cooldownSeconds = Math.ceil(cooldown / 1000);

  useEffect(() => {
    if (prevReady === false && isReady === true) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 300);
      return () => clearTimeout(timer);
    }
    setPrevReady(isReady);
  }, [isReady, prevReady]);

  return (
    <div
      style={{
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: skill.color,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        transform: isPulsing ? 'scale(1.2)' : 'scale(1.0)',
        transition: 'transform 0.3s ease-out',
        boxShadow: isReady ? `0 0 10px ${skill.color}80` : 'none',
      }}
    >
      <span style={{ zIndex: 2, pointerEvents: 'none' }}>
        {skill.key.toUpperCase()}
      </span>
      {!isReady && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 1,
            }}
          />
          <span
            style={{
              position: 'absolute',
              zIndex: 3,
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
              pointerEvents: 'none',
            }}
          >
            {cooldownSeconds}
          </span>
        </>
      )}
    </div>
  );
};

const SkillBar: React.FC<SkillBarProps> = ({ cooldowns }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: '12px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 12,
        backdropFilter: 'blur(5px)',
      }}
    >
      {SKILLS.map((skill) => (
        <div key={skill.type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <SkillIcon skillType={skill.type} cooldown={cooldowns[skill.type]} />
          <span style={{ color: '#AAAAAA', fontSize: 11 }}>{skill.name}</span>
        </div>
      ))}
    </div>
  );
};

export default SkillBar;
