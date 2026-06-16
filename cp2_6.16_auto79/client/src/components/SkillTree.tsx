import React, { useState, useRef } from 'react';
import { SKILL_CATEGORIES, type SkillCategory } from '../types';

interface SkillTreeProps {
  skills: Record<string, { level: number; exp: number }>;
}

const HEX_SIZE = 36;
const HEX_WIDTH = HEX_SIZE * 2;
const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3);
const HEX_GAP = 1;
const ROW_OFFSET = HEX_WIDTH / 2 + HEX_GAP;

export default function SkillTree({ skills }: SkillTreeProps) {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    skill: { key: SkillCategory; name: string; icon: string } | null;
    x: number;
    y: number;
  }>({ visible: false, skill: null, x: 0, y: 0 });

  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculateExpToNextLevel = (level: number) => {
    return level * 100;
  };

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    skill: { key: SkillCategory; name: string; icon: string }
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      skill,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tooltip.visible && tooltip.skill) {
      setTooltip(prev => ({
        ...prev,
        x: e.clientX,
        y: e.clientY,
      }));
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, skill: null, x: 0, y: 0 });
  };

  const getTooltipPosition = () => {
    if (!tooltipRef.current) {
      return { left: 0, top: 0 };
    }

    const tooltipWidth = tooltipRef.current.offsetWidth;
    const tooltipHeight = tooltipRef.current.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = tooltip.x + 12;
    let top = tooltip.y - tooltipHeight / 2;

    if (left + tooltipWidth > viewportWidth) {
      left = tooltip.x - tooltipWidth - 12;
    }

    if (top < 0) {
      top = 8;
    }

    if (top + tooltipHeight > viewportHeight) {
      top = viewportHeight - tooltipHeight - 8;
    }

    if (left < 0) {
      left = 8;
    }

    return { left, top };
  };

  const rows: { key: SkillCategory; name: string; icon: string }[][] = [];
  for (let i = 0; i < SKILL_CATEGORIES.length; i += 3) {
    rows.push(SKILL_CATEGORIES.slice(i, i + 3));
  }

  const position = getTooltipPosition();

  return (
    <div className="relative inline-block">
      <div className="relative">
        {rows.map((row, rowIndex) => (
          <div
          key={rowIndex}
          className="flex"
          style={{
            marginTop: rowIndex > 0 ? `${-(HEX_HEIGHT / 2 + HEX_GAP)}px` : '0px',
            marginLeft: rowIndex % 2 === 1 ? `${ROW_OFFSET}px` : '0px',
          }}
        >
          {row.map((skill, colIndex) => {
            const userSkill = skills[skill.key];
            const isLearned = userSkill && userSkill.level >= 1;
            const bgColor = isLearned ? '#3b82f6' : '#d1d5db';
            const expToNext = userSkill ? calculateExpToNextLevel(userSkill.level + 1) : 100;

            return (
              <div
                key={skill.key}
                className="relative cursor-pointer transition-transform hover:scale-105"
                style={{
                  width: `${HEX_WIDTH}px`,
                  height: `${HEX_HEIGHT}px`,
                  marginRight: colIndex < row.length - 1 ? `${HEX_GAP}px` : '0px',
                }}
                onMouseEnter={(e) => handleMouseEnter(e, skill)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    backgroundColor: bgColor,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <span className="text-2xl">{skill.icon}</span>
                </div>
                {isLearned && userSkill && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-black bg-opacity-60 px-1.5 py-0.5 rounded">
                    Lv.{userSkill.level}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        ))}
      </div>

      {tooltip.visible && tooltip.skill && (
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${position.left}px`,
            top: `${position.top}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '4px',
            color: 'white',
            padding: '8px 12px',
            fontSize: '14px',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-semibold">
            {tooltip.skill.icon} {tooltip.skill.name}
          </div>
          {skills[tooltip.skill.key] ? (
            <>
              <div>Lv.{skills[tooltip.skill.key].level}</div>
              <div>
                EXP: {skills[tooltip.skill.key].exp}/
                {calculateExpToNextLevel(skills[tooltip.skill.key].level + 1)}
              </div>
            </>
          ) : (
            <div>未学习</div>
          )}
        </div>
      )}
    </div>
  );
}
