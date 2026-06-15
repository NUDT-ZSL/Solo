import { useEffect, useState, useRef } from 'react';
import type { Bridge } from '../Bridge';
import type { UIState, ResourceType } from '../types';

interface ResourcePanelProps {
  bridge: Bridge;
}

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 300;
    const startTime = performance.now();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  return (
    <span style={{ color }}>{displayValue.toFixed(1)}</span>
  );
}

export function ResourcePanel({ bridge }: ResourcePanelProps) {
  const [state, setState] = useState<UIState | null>(null);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((s) => setState(s));
    return unsubscribe;
  }, [bridge]);

  if (!state) return null;

  const resourceTypes: ResourceType[] = ['energy', 'ore', 'food'];

  return (
    <div className="resource-panel">
      <div className="panel-title">资源面板</div>
      <div className="resource-grid">
        {resourceTypes.map((type) => {
          const resource = state.resources[type];
          const netRate = resource.production - resource.consumption;
          const rateClass = netRate > 0 ? 'positive' : netRate < 0 ? 'negative' : '';
          const rateText = netRate >= 0 ? `+${netRate.toFixed(1)}/s` : `${netRate.toFixed(1)}/s`;

          return (
            <div key={type} className="resource-card">
              <div className="resource-icon">{resource.icon}</div>
              <div className="resource-label">{resource.label}</div>
              <div className="resource-value">
                <AnimatedNumber value={resource.amount} color={resource.color} />
              </div>
              <div className={`resource-rate ${rateClass}`}>
                {rateText}
              </div>
            </div>
          );
        })}
        <div className="resource-card">
          <div className="resource-icon">🏗️</div>
          <div className="resource-label">建筑</div>
          <div className="resource-value" style={{ color: '#8a8fa8' }}>
            <AnimatedNumber value={state.buildings.length} color="#8a8fa8" />
          </div>
          <div className="resource-rate">总计</div>
        </div>
      </div>
    </div>
  );
}
