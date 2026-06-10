/** 相对时间格式化：如 "3分钟前" */
export function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return date.toLocaleDateString('zh-CN');
}

/** Date → YYYY-MM-DD */
export function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** 取得过去N周的日期矩阵，每周从周一开始 */
export function getWeekDates(weeks: number = 4): Date[][] {
  const result: Date[][] = [];
  const now = new Date();
  const weekday = now.getDay(); // 0=周日,1=周一...
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

  for (let w = weeks - 1; w >= 0; w--) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(thisMonday.getTime() - w * 7 * 86400000 + d * 86400000);
      week.push(date);
    }
    result.push(week);
  }
  return result;
}

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
