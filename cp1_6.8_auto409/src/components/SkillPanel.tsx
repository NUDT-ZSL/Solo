import React from 'react'

interface SkillInfo {
  name: string
  key: string
  ready: boolean
  cooldown: number
  maxCooldown: number
}

interface SkillPanelProps {
  skills: SkillInfo[]
  onActivateSkill: (index: number) => void
}

const SkillPanel: React.FC<SkillPanelProps> = ({ skills, onActivateSkill }) => {
  return (
    <div className="skill-panel">
      {skills.map((skill, i) => {
        const isCooling = skill.cooldown > 0
        const cooldownPercent = isCooling ? (skill.cooldown / 3) * 100 : 0
        return (
          <button
            key={i}
            className={`skill-btn ${skill.ready ? 'skill-btn-ready' : ''} ${isCooling ? 'skill-btn-cooldown' : ''}`}
            onClick={() => onActivateSkill(i)}
            disabled={isCooling || !skill.ready}
          >
            <div className={`skill-icon ${i === 0 ? 'skill-icon-shield' : 'skill-icon-pulse'}`} />
            <div className="skill-key">{skill.key}</div>
            <div className="skill-name">{skill.name}</div>
            {isCooling && (
              <>
                <svg className="skill-cooldown-svg" viewBox="0 0 60 60">
                  <circle
                    className="skill-cooldown-ring"
                    cx="30" cy="30" r="27"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 27}`,
                      strokeDashoffset: `${2 * Math.PI * 27 * (1 - cooldownPercent / 100)}`,
                    }}
                  />
                </svg>
                <div className="skill-cooldown-text">{Math.ceil(skill.cooldown)}</div>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default SkillPanel
