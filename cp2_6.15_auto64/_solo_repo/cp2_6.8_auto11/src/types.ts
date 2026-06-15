export interface TimelineEvent {
  id: string;
  name: string;
  date: string;
  description: string;
  color: string;
}

export const COLOR_PALETTE: { color: string; label: string }[] = [
  { color: '#e57373', label: '红色' },
  { color: '#ffb74d', label: '橙色' },
  { color: '#fff176', label: '黄色' },
  { color: '#81c784', label: '绿色' },
  { color: '#4dd0e1', label: '青色' },
  { color: '#64b5f6', label: '蓝色' },
  { color: '#ba68c8', label: '紫色' },
  { color: '#f06292', label: '粉色' },
];
