import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Rune, DamageResult, CombinationRule, SavedConfig } from '../shared/RuneTypes';
import RuneSelector from '../components/RuneSelector';
import DamageChart from '../components/DamageChart';
import ComparisonTable from '../components/ComparisonTable';
import ConfigManager from '../components/ConfigManager';
import { PRESET_RUNES, PRESET_RULES } from '../backend/DataManager';

const MAX_SELECTION = 4;

export const FrontendEngine: React.FC = () => {
  const [allRunes, setAllRunes] = useState<Rune[]>([]);
  const [selectedRuneIds, setSelectedRuneIds] = useState<string[]>([]);
  const [damageResult, setDamageResult] = useState<DamageResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [allRules, setAllRules] = useState<CombinationRule[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<
    { name: string; result: DamageResult; runes: Rune[] }[]
  >([]);

  useEffect(() => {
    const initData = async () => {
      try {
        const runesRes = await fetch('/api/runes');
        if (runesRes.ok) {
          const data = await runesRes.json();
          setAllRunes(data);
        } else {
          setAllRunes(PRESET_RUNES as Rune[]);
        }
      } catch {
        setAllRunes(PRESET_RUNES as Rune[]);
      }

      try {
        const rulesRes = await fetch('/api/rules');
        if (rulesRes.ok) {
          const data = await rulesRes.json();
          setAllRules(data);
        } else {
          setAllRules(PRESET_RULES as CombinationRule[]);
        }
      } catch {
        setAllRules(PRESET_RULES as CombinationRule[]);
      }
    };

    initData();
  }, []);

  const calculateDamage = useCallback(async (runeIds: string[]) => {
    if (runeIds.length === 0) {
      setDamageResult(null);
      return;
    }
    setIsCalculating(true);
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runeIds }),
      });
      if (!res.ok) throw new Error('Calculate failed');
      const data = await res.json();
      setDamageResult(data);
    } catch (err) {
      console.error('Calculate error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateDamage(selectedRuneIds);
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedRuneIds, calculateDamage]);

  const handleRuneToggle = useCallback((runeId: string) => {
    setSelectedRuneIds((prev) => {
      const idx = prev.indexOf(runeId);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      if (prev.length >= MAX_SELECTION) {
        return prev;
      }
      return [...prev, runeId];
    });
  }, []);

  const handleRuneRemove = useCallback((runeId: string) => {
    setSelectedRuneIds((prev) => prev.filter((id) => id !== runeId));
  }, []);

  const handleLoadConfig = useCallback((runeIds: string[]) => {
    const validIds = runeIds.slice(0, MAX_SELECTION);
    setSelectedRuneIds(validIds);
    setSidebarOpen(false);
  }, []);

  const handleAddToCompare = useCallback(() => {
    if (!damageResult) return;
    const runes = allRunes.filter((r) => selectedRuneIds.includes(r.id));
    const name = `对比${comparisonResults.length + 1}`;
    setComparisonResults((prev) => [...prev, { name, result: damageResult, runes }]);
  }, [damageResult, allRunes, selectedRuneIds, comparisonResults.length]);

  const handleClearCompare = useCallback(() => {
    setComparisonResults([]);
  }, []);

  const selectedRunes = useMemo(
    () => allRunes.filter((r) => selectedRuneIds.includes(r.id)),
    [allRunes, selectedRuneIds]
  );

  const chartComparisons = useMemo(
    () =>
      comparisonResults.map((c) => ({
        name: c.name,
        result: c.result,
      })),
    [comparisonResults]
  );

  return (
    <>
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕ 关闭' : '☰ 配置'}
      </button>

      <div className="app-container">
        <header className="app-header">
          <h1>⚔ RUNEFORGE ⚔</h1>
          <p>符文技能组合与伤害计算沙盒 · 自由组合 · 实时演算 · 可视化对比</p>
        </header>

        <main className="main-content">
          <RuneSelector
            runes={allRunes}
            selectedRuneIds={selectedRuneIds}
            onRuneToggle={handleRuneToggle}
            onRuneRemove={handleRuneRemove}
            maxSelection={MAX_SELECTION}
          />

          {isCalculating && (
            <div
              style={{
                textAlign: 'center',
                padding: '8px',
                color: 'var(--accent)',
                fontSize: 12,
              }}
            >
              ⏳ 正在计算伤害数据...
            </div>
          )}

          <DamageChart damageResult={damageResult} comparisonResults={chartComparisons} />

          {damageResult && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={handleAddToCompare}>+ 添加到对比</button>
              {comparisonResults.length > 0 && (
                <button onClick={handleClearCompare}>清除对比 ({comparisonResults.length})</button>
              )}
            </div>
          )}

          <ComparisonTable
            currentResult={damageResult}
            currentRunes={selectedRunes}
            comparisonItems={comparisonResults}
          />
        </main>

        <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
          <ConfigManager
            currentRuneIds={selectedRuneIds}
            onLoadConfig={handleLoadConfig}
          />

          <div className="panel">
            <h2 className="panel-title">组合规则速查</h2>
            <div className="rules-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {allRules.map((rule) => (
                <div key={rule.id} className="rule-item">
                  <div className="rule-item-name">{rule.name}</div>
                  <div className="rule-item-desc">{rule.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    伤害 ×{rule.damageMultiplier.toFixed(2)} · 冷却 -{Math.round(rule.cooldownReduction * 100)}%
                    {rule.statusEffect && ` · ${rule.statusEffect.name}${rule.statusEffect.duration}s`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <footer className="app-footer">
          RuneForge © 2026 · 符文沙盒开发工具 · 数据仅供平衡测试参考
        </footer>
      </div>
    </>
  );
};

export default FrontendEngine;
