const LAYOUT_KEY = 'dashLayout';

export interface DashLayout {
  order: string[];
}

export function saveLayout(layout: DashLayout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch (e) {
    console.error('保存布局失败:', e);
  }
}

export function loadLayout(): DashLayout | null {
  try {
    const data = localStorage.getItem(LAYOUT_KEY);
    if (data) {
      return JSON.parse(data) as DashLayout;
    }
    return null;
  } catch (e) {
    console.error('读取布局失败:', e);
    return null;
  }
}

export function clearLayout(): void {
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch (e) {
    console.error('清除布局失败:', e);
  }
}
