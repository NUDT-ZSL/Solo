export function formatRelativeTime(timestamp: string | number | Date): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  if (diff < 0) {
    return '刚刚';
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) {
    return `${Math.floor(diff / 1000)}秒前`;
  }

  if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  }

  if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  }

  if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  }

  if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  }

  return `${Math.floor(diff / year)}年前`;
}
