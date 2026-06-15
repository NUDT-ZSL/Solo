import db from '../db';

export type BadgeType = 'bronze' | 'silver' | 'gold';

export interface BadgeConfig {
  type: BadgeType;
  requiredHours: number;
  name: string;
  description: string;
}

export const BADGE_CONFIGS: BadgeConfig[] = [
  {
    type: 'bronze',
    requiredHours: 50,
    name: '青铜徽章',
    description: '累计工时达到50小时'
  },
  {
    type: 'silver',
    requiredHours: 200,
    name: '白银徽章',
    description: '累计工时达到200小时'
  },
  {
    type: 'gold',
    requiredHours: 500,
    name: '黄金徽章',
    description: '累计工时达到500小时'
  }
];

export interface BadgeRecord {
  id: string;
  userId: string;
  badgeType: BadgeType;
  earnedAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function checkAndAwardBadges(userId: string): BadgeRecord[] {
  const userRow = db.prepare('SELECT totalHours FROM users WHERE id = ?').get(userId) as { totalHours: number } | undefined;

  if (!userRow) {
    return [];
  }

  const totalHours = userRow.totalHours || 0;
  const newBadges: BadgeRecord[] = [];

  const existingBadgesStmt = db.prepare('SELECT badgeType FROM badges WHERE userId = ?');
  const existingBadgeTypes = new Set(
    (existingBadgesStmt.all(userId) as { badgeType: BadgeType }[]).map((b) => b.badgeType)
  );

  const insertBadgeStmt = db.prepare(
    'INSERT INTO badges (id, userId, badgeType, earnedAt) VALUES (?, ?, ?, ?)'
  );

  for (const config of BADGE_CONFIGS) {
    if (totalHours >= config.requiredHours && !existingBadgeTypes.has(config.type)) {
      const badge: BadgeRecord = {
        id: generateId(),
        userId,
        badgeType: config.type,
        earnedAt: new Date().toISOString()
      };

      insertBadgeStmt.run(badge.id, badge.userId, badge.badgeType, badge.earnedAt);
      newBadges.push(badge);
    }
  }

  return newBadges;
}

export function getBadgesByUserId(userId: string): BadgeRecord[] {
  const stmt = db.prepare('SELECT * FROM badges WHERE userId = ? ORDER BY earnedAt DESC');
  return stmt.all(userId) as BadgeRecord[];
}
