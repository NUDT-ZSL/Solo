import { useState } from "react";
import type { ICharacter } from "../types";
import { getCharacterPool, CLASS_COLORS, CLASS_ICONS } from "../team-module";

interface TeamBuilderProps {
  slots: (ICharacter | null)[];
  onAddChar: (characterId: string, slotIndex: number) => void;
  onRemoveChar: (slotIndex: number) => void;
  onApplyPreset: (presetIndex: number) => void;
  onStartBattle: () => void;
}

const PRESETS = [
  { name: "双奶双T", desc: "铁壁+石卫+光祈+雾织，极致生存" },
  { name: "三输出一治疗", desc: "影刃+焰矢+雷斧+光祈，暴力输出" },
  { name: "均衡队", desc: "铁壁+光祈+影刃+焰矢，攻守兼备" },
  { name: "菜刀队", desc: "影刃+焰矢+雷斧+霜守，全物理猛攻" },
];

export default function TeamBuilder({ slots, onAddChar, onRemoveChar, onApplyPreset, onStartBattle }: TeamBuilderProps) {
  const pool = getCharacterPool();
  const selectedIds = slots.filter(Boolean).map((c) => c!.id);
  const filledCount = selectedIds.length;
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  return (
    <div className="team-builder">
      <h1 className="team-title">⚔️ 地牢探险组队战斗模拟器</h1>
      <p className="team-subtitle">选择最多4名角色组成冒险小队，挑战暗影领主</p>

      <div className="team-main">
        <div className="slots-section">
          <h2 className="section-label">队伍槽位</h2>
          <div className="slots-row">
            {slots.map((char, idx) => {
              if (char) {
                return (
                  <div
                    key={idx}
                    className="character-card selected"
                    style={{
                      borderColor: CLASS_COLORS[char.class],
                      boxShadow: `0 0 12px ${CLASS_COLORS[char.class]}40`,
                    }}
                  >
                    <div className="card-class-icon">{CLASS_ICONS[char.class]}</div>
                    <div className="card-avatar" style={{ borderColor: CLASS_COLORS[char.class] }}>
                      <span className="avatar-initial">{char.name[0]}</span>
                    </div>
                    <div className="card-name">{char.name}</div>
                    <div className="card-class-label" style={{ color: CLASS_COLORS[char.class] }}>
                      {char.class === "tank" ? "坦克" : char.class === "healer" ? "治疗" : "输出"}
                    </div>
                    <div className="card-stats">
                      <div className="stat-row">
                        <span className="stat-label">❤️ HP</span>
                        <span className="stat-value">{char.maxHp}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">⚔️ ATK</span>
                        <span className="stat-value">{char.atk}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">🛡️ DEF</span>
                        <span className="stat-value">{char.def}</span>
                      </div>
                    </div>
                    <div className="card-skill">
                      <span className="skill-name">{char.skill.name}</span>
                      <span className="skill-desc">{char.skill.description}</span>
                    </div>
                    <button className="remove-btn" onClick={() => onRemoveChar(idx)}>✕</button>
                  </div>
                );
              }

              const available = pool.filter((c) => !selectedIds.includes(c.id));
              const isOpen = activeSlot === idx;

              return (
                <div key={idx} className="character-card empty">
                  {isOpen ? (
                    <div className="char-picker">
                      <div className="picker-title">选择角色</div>
                      {available.length === 0 ? (
                        <div className="picker-empty">无可选角色</div>
                      ) : (
                        available.map((c) => (
                          <button
                            key={c.id}
                            className="picker-item"
                            style={{ borderLeftColor: CLASS_COLORS[c.class] }}
                            onClick={() => {
                              onAddChar(c.id, idx);
                              setActiveSlot(null);
                            }}
                          >
                            <span className="picker-icon">{CLASS_ICONS[c.class]}</span>
                            <span className="picker-name">{c.name}</span>
                            <span className="picker-class" style={{ color: CLASS_COLORS[c.class] }}>
                              {c.class === "tank" ? "坦克" : c.class === "healer" ? "治疗" : "输出"}
                            </span>
                          </button>
                        ))
                      )}
                      <button className="picker-close" onClick={() => setActiveSlot(null)}>取消</button>
                    </div>
                  ) : (
                    <button className="add-btn" onClick={() => setActiveSlot(idx)}>
                      <span className="add-icon">+</span>
                      <span className="add-text">选择角色</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="preset-section">
          <h2 className="section-label">快速预设</h2>
          <div className="preset-list">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                className="preset-btn"
                onClick={() => onApplyPreset(idx)}
                title={preset.desc}
              >
                <span className="preset-name">{preset.name}</span>
                <span className="preset-desc">{preset.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        className="start-battle-btn"
        disabled={filledCount === 0}
        onClick={onStartBattle}
      >
        ⚔️ 开始战斗
      </button>
    </div>
  );
}
