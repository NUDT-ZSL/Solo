import React from 'react';
import { DamageResult, Rune } from '../shared/RuneTypes';

interface ComparisonTableProps {
  currentResult: DamageResult | null;
  currentRunes: Rune[];
  comparisonItems?: { name: string; result: DamageResult; runes: Rune[] }[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  currentResult,
  currentRunes,
  comparisonItems = [],
}) => {
  const allItems: { name: string; result: DamageResult | null; runes: Rune[] }[] = [];

  if (currentResult) {
    allItems.push({ name: '当前组合', result: currentResult, runes: currentRunes });
  }
  comparisonItems.forEach((item) => {
    allItems.push({ name: item.name, result: item.result, runes: item.runes });
  });

  if (allItems.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">属性对比</h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>
          选择符文后将显示技能属性
        </div>
      </div>
    );
  }

  const rows = [
    {
      label: '总伤害',
      key: 'totalDamage',
      suffix: '',
      format: (v: number) => v.toFixed(2),
      highlight: true,
    },
    {
      label: '基础伤害',
      key: 'baseDamage',
      suffix: '',
      format: (v: number) => v.toFixed(2),
      highlight: false,
    },
    {
      label: '实际伤害',
      key: 'effectiveDamage',
      suffix: '',
      format: (v: number) => v.toFixed(2),
      highlight: false,
    },
    {
      label: '冷却时间',
      key: 'cooldown',
      suffix: 's',
      format: (v: number) => v.toFixed(2),
      highlight: false,
    },
    {
      label: '技能范围',
      key: 'range',
      suffix: 'm',
      format: (v: number) => v.toString(),
      highlight: false,
    },
  ];

  return (
    <div className="panel">
      <h2 className="panel-title">属性对比</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th style={{ minWidth: 100 }}>属性</th>
              {allItems.map((item, idx) => (
                <th key={idx} style={idx === 0 ? { color: 'var(--accent)' } : undefined}>
                  {item.name}
                  {item.runes.length > 0 && (
                    <div style={{ marginTop: 4, fontSize: 10, fontWeight: 400, opacity: 0.8 }}>
                      {item.runes.map((r) => r.name).join(' + ')}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                {allItems.map((item, idx) => {
                  const value = item.result ? (item.result as any)[row.key] : 0;
                  const isMax =
                    idx === 0 &&
                    allItems.length > 1 &&
                    item.result &&
                    comparisonItems.every(
                      (c) => (c.result as any)[row.key] <= (item.result as any)[row.key]
                    );
                  return (
                    <td key={idx}>
                      <span className={row.highlight || isMax ? 'highlight' : ''}>
                        {row.format(value)}
                        {row.suffix}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td>附加状态</td>
              {allItems.map((item, idx) => (
                <td key={idx}>
                  {item.result && item.result.statusEffects.length > 0 ? (
                    item.result.statusEffects.map((effect) => (
                      <span key={effect.name} className="status-badge" title={effect.description}>
                        {effect.name} {effect.duration}s
                        {effect.damagePerSecond ? ` (${effect.damagePerSecond}/s)` : ''}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td>触发规则</td>
              {allItems.map((item, idx) => (
                <td key={idx}>
                  {item.result && item.result.triggeredRules.length > 0 ? (
                    item.result.triggeredRules.map((rule) => (
                      <span key={rule.id} className="status-badge">
                        {rule.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>无</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonTable;
