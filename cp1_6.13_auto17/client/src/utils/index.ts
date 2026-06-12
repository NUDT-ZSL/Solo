export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;

  const date = new Date(timestamp);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#f59e0b';
    case 'confirmed':
      return '#3b82f6';
    case 'completed':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return '待确认';
    case 'confirmed':
      return '已确认';
    case 'completed':
      return '已完成';
    default:
      return status;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getAvatarColor(nickname: string): string {
  const colors = [
    '#6366f1',
    '#8b5cf6',
    '#f472b6',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#ef4444',
    '#8b5cf6',
  ];
  const index = nickname.charCodeAt(0) % colors.length;
  return colors[index];
}
