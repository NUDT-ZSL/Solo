export function formatTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

export const CATEGORY_ICON: Record<string, string> = {
  吉他: '🎸',
  烘焙: '🥐',
  编程: '💻',
  React: '⚛️',
  绘画: '🎨',
  英语: '📖',
  瑜伽: '🧘',
  烹饪: '👨‍🍳',
  Python: '🐍',
  乐理: '🎵',
  弹唱: '🎤',
  西餐: '🍝',
  水彩: '🖼️',
  素描: '✏️',
  雅思: '🎯',
  商务英语: '💼',
  冥想: '🧠',
  普拉提: '🤸',
  书法: '🖌️',
  摄影: '📷',
  游泳: '🏊',
};

export function categoryIcon(cat: string) {
  return CATEGORY_ICON[cat] || '✨';
}

export const SKILL_TAGS = [
  '吉他', '钢琴', '小提琴', '乐理', '弹唱',
  '编程', 'React', 'Python', 'Java', '数据分析',
  '烹饪', '烘焙', '西餐', '中餐', '日料',
  '绘画', '水彩', '素描', '油画', '书法',
  '英语', '雅思', '商务英语', '日语', '韩语',
  '瑜伽', '冥想', '普拉提', '游泳', '健身',
  '摄影', '剪辑', '设计', '写作', '演讲',
];

export function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    let color = i < full ? '#fbbf24' : (i === full && half ? '#fbbf24' : '#e5e7eb');
    stars.push(
      <span key={i} style={{ fontSize: size, color, lineHeight: 1 }}>
        {i < full || (i === full && half) ? '★' : '☆'}
      </span>
    );
  }
  return <span className="stars">{stars}</span>;
}
