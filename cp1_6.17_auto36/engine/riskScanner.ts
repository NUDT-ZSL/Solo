import { Card, RiskAlert } from './types';

export interface ScanOptions {
  thresholdHours?: number;
  now?: Date;
}

export function scanDependencies(
  cards: Card[],
  options: ScanOptions = {}
): RiskAlert[] {
  const { thresholdHours = 48, now = new Date() } = options;
  const thresholdMs = thresholdHours * 60 * 60 * 1000;

  const cardMap = new Map<string, Card>(cards.map(c => [c.id, c]));
  const alerts: RiskAlert[] = [];
  const alertedCards = new Set<string>();

  const confirmedCards = cards.filter(c => c.status === 'confirmed' || c.status === 'in_progress');

  confirmedCards.forEach(card => {
    if (!card.dependencyId) return;

    const dependency = cardMap.get(card.dependencyId);
    if (!dependency) return;

    const dependencyStatus = dependency.status;
    const lastChange = new Date(dependency.lastStatusChange).getTime();
    const nowTime = now.getTime();
    const hoursSinceChange = (nowTime - lastChange) / (60 * 60 * 1000);

    if (dependencyStatus !== 'completed') {
      const noProgress = (nowTime - lastChange) >= thresholdMs;

      if (noProgress) {
        if (alertedCards.has(card.id)) return;

        let level: 'high' | 'medium' | 'low' = 'medium';
        let reason = '';

        if (dependencyStatus === 'in_progress') {
          if (hoursSinceChange >= 72) {
            level = 'high';
            reason = `前置依赖「${dependency.title}」进行中已超过${Math.floor(hoursSinceChange)}小时无进展`;
          } else {
            level = 'medium';
            reason = `前置依赖「${dependency.title}」进行中${Math.floor(hoursSinceChange)}小时未更新状态`;
          }
        } else if (dependencyStatus === 'confirmed' || dependencyStatus === 'scheduling') {
          level = 'high';
          reason = `前置依赖「${dependency.title}」尚未开始，已确认超过${Math.floor(hoursSinceChange)}小时`;
        } else {
          level = 'high';
          reason = `前置依赖「${dependency.title}」仍在${translateStatus(dependencyStatus)}阶段`;
        }

        alerts.push({
          cardId: card.id,
          cardTitle: card.title,
          dependencyId: dependency.id,
          dependencyTitle: dependency.title,
          reason,
          level,
          assignee: card.assignee,
          projectId: card.projectId
        });

        alertedCards.add(card.id);
      }
    }
  });

  return alerts.sort((a, b) => {
    const levelOrder = { high: 0, medium: 1, low: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  });
}

export function hasHighRisk(alerts: RiskAlert[], cardId: string): boolean {
  return alerts.some(a => a.cardId === cardId && a.level === 'high');
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    'discussion': '待讨论',
    'scheduling': '排期中',
    'confirmed': '已确认',
    'in_progress': '进行中',
    'completed': '已完成'
  };
  return map[status] || status;
}

export function getDependencyChain(cardId: string, cards: Card[]): Card[] {
  const chain: Card[] = [];
  const cardMap = new Map<string, Card>(cards.map(c => [c.id, c]));
  const visited = new Set<string>();

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const card = cardMap.get(id);
    if (!card) return;

    if (card.dependencyId) {
      traverse(card.dependencyId);
    }
    chain.push(card);
  }

  traverse(cardId);
  return chain;
}
