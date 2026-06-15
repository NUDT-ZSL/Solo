export const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < week) return `${Math.floor(diff / day)}天前`;
  if (diff < month) return `${Math.floor(diff / week)}周前`;
  if (diff < year) return `${Math.floor(diff / month)}个月前`;
  return `${Math.floor(diff / year)}年前`;
};

export const getSummary = (content: string, maxLen: number = 20): string => {
  const plainText = content
    .replace(/[#*`_\-]/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plainText.length <= maxLen) return plainText || '暂无内容';
  return plainText.slice(0, maxLen) + '...';
};

export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  '工作': { bg: '#e3f2fd', text: '#1565c0' },
  '学习': { bg: '#f3e5f5', text: '#6a1b9a' },
  '生活': { bg: '#e8f5e9', text: '#2e7d32' },
  '灵感': { bg: '#fff3e0', text: '#e65100' },
  '待办': { bg: '#ffebee', text: '#c62828' }
};

export const getTagColor = (tag: string) => {
  return TAG_COLORS[tag] || { bg: '#eceff1', text: '#455a64' };
};

export const saveDraft = (noteId: string, data: { title: string; content: string; cursorPosition: number }) => {
  try {
    localStorage.setItem(`draft_${noteId}`, JSON.stringify({
      ...data,
      savedAt: Date.now()
    }));
  } catch (e) {
    console.error('保存草稿失败:', e);
  }
};

export const loadDraft = (noteId: string): { title: string; content: string; cursorPosition: number; savedAt: number } | null => {
  try {
    const draft = localStorage.getItem(`draft_${noteId}`);
    return draft ? JSON.parse(draft) : null;
  } catch (e) {
    return null;
  }
};

export const clearDraft = (noteId: string) => {
  localStorage.removeItem(`draft_${noteId}`);
};
