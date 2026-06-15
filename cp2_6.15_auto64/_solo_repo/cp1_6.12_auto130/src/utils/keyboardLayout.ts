export type ScopeType = 'common' | 'edit' | 'nav' | 'window';

export interface KeymapItem {
  id: string;
  defaultKey: string;
  scope: ScopeType;
  description: string;
  boundKey: string;
  order: number;
}

export interface KeyboardKey {
  code: string;
  label: string;
  width: string;
  height?: string;
  row: number;
}

export const SCOPE_LABELS: Record<ScopeType, string> = {
  common: '常用',
  edit: '编辑',
  nav: '导航',
  window: '窗口管理',
};

export const DEFAULT_KEYMAPS: KeymapItem[] = [
  { id: 'c1', defaultKey: 'Ctrl+C', scope: 'common', description: '复制选中内容', boundKey: 'Ctrl+C', order: 0 },
  { id: 'c2', defaultKey: 'Ctrl+V', scope: 'common', description: '粘贴剪贴板内容', boundKey: 'Ctrl+V', order: 1 },
  { id: 'c3', defaultKey: 'Ctrl+Z', scope: 'common', description: '撤销上一步操作', boundKey: 'Ctrl+Z', order: 2 },
  { id: 'c4', defaultKey: 'Ctrl+Y', scope: 'common', description: '重做已撤销操作', boundKey: 'Ctrl+Y', order: 3 },
  { id: 'c5', defaultKey: 'Ctrl+A', scope: 'common', description: '全选当前内容', boundKey: 'Ctrl+A', order: 4 },
  { id: 'c6', defaultKey: 'Ctrl+S', scope: 'common', description: '保存当前文件', boundKey: 'Ctrl+S', order: 5 },
  { id: 'c7', defaultKey: 'Ctrl+F', scope: 'common', description: '打开查找对话框', boundKey: 'Ctrl+F', order: 6 },
  { id: 'c8', defaultKey: 'Ctrl+H', scope: 'common', description: '查找并替换', boundKey: 'Ctrl+H', order: 7 },
  { id: 'c9', defaultKey: 'Ctrl+P', scope: 'common', description: '打印当前文档', boundKey: 'Ctrl+P', order: 8 },
  { id: 'c10', defaultKey: 'Ctrl+N', scope: 'common', description: '新建文件或窗口', boundKey: 'Ctrl+N', order: 9 },
  { id: 'c11', defaultKey: 'Ctrl+O', scope: 'common', description: '打开文件', boundKey: 'Ctrl+O', order: 10 },
  { id: 'c12', defaultKey: 'Ctrl+W', scope: 'common', description: '关闭当前标签页', boundKey: 'Ctrl+W', order: 11 },

  { id: 'e1', defaultKey: 'Ctrl+X', scope: 'edit', description: '剪切选中内容', boundKey: 'Ctrl+X', order: 12 },
  { id: 'e2', defaultKey: 'Ctrl+B', scope: 'edit', description: '切换选中文字粗体', boundKey: 'Ctrl+B', order: 13 },
  { id: 'e3', defaultKey: 'Ctrl+I', scope: 'edit', description: '切换选中文字斜体', boundKey: 'Ctrl+I', order: 14 },
  { id: 'e4', defaultKey: 'Ctrl+U', scope: 'edit', description: '切换选中文字下划线', boundKey: 'Ctrl+U', order: 15 },
  { id: 'e5', defaultKey: 'Ctrl+D', scope: 'edit', description: '删除当前行', boundKey: 'Ctrl+D', order: 16 },
  { id: 'e6', defaultKey: 'Ctrl+Shift+D', scope: 'edit', description: '复制当前行', boundKey: 'Ctrl+Shift+D', order: 17 },
  { id: 'e7', defaultKey: 'Alt+Shift+Down', scope: 'edit', description: '下移当前行', boundKey: 'Alt+Shift+Down', order: 18 },
  { id: 'e8', defaultKey: 'Alt+Shift+Up', scope: 'edit', description: '上移当前行', boundKey: 'Alt+Shift+Up', order: 19 },
  { id: 'e9', defaultKey: 'Ctrl+/', scope: 'edit', description: '切换行注释', boundKey: 'Ctrl+/', order: 20 },
  { id: 'e10', defaultKey: 'Tab', scope: 'edit', description: '缩进或自动补全', boundKey: 'Tab', order: 21 },
  { id: 'e11', defaultKey: 'Shift+Tab', scope: 'edit', description: '取消缩进', boundKey: 'Shift+Tab', order: 22 },
  { id: 'e12', defaultKey: 'Ctrl+Shift+K', scope: 'edit', description: '删除整行', boundKey: 'Ctrl+Shift+K', order: 23 },

  { id: 'n1', defaultKey: 'Ctrl+Home', scope: 'nav', description: '跳转到文档开头', boundKey: 'Ctrl+Home', order: 24 },
  { id: 'n2', defaultKey: 'Ctrl+End', scope: 'nav', description: '跳转到文档末尾', boundKey: 'Ctrl+End', order: 25 },
  { id: 'n3', defaultKey: 'Ctrl+Left', scope: 'nav', description: '光标左移一个单词', boundKey: 'Ctrl+Left', order: 26 },
  { id: 'n4', defaultKey: 'Ctrl+Right', scope: 'nav', description: '光标右移一个单词', boundKey: 'Ctrl+Right', order: 27 },
  { id: 'n5', defaultKey: 'Ctrl+Up', scope: 'nav', description: '向上滚动视图', boundKey: 'Ctrl+Up', order: 28 },
  { id: 'n6', defaultKey: 'Ctrl+Down', scope: 'nav', description: '向下滚动视图', boundKey: 'Ctrl+Down', order: 29 },
  { id: 'n7', defaultKey: 'Home', scope: 'nav', description: '跳转到行首', boundKey: 'Home', order: 30 },
  { id: 'n8', defaultKey: 'End', scope: 'nav', description: '跳转到行尾', boundKey: 'End', order: 31 },
  { id: 'n9', defaultKey: 'PageUp', scope: 'nav', description: '向上翻一页', boundKey: 'PageUp', order: 32 },
  { id: 'n10', defaultKey: 'PageDown', scope: 'nav', description: '向下翻一页', boundKey: 'PageDown', order: 33 },
  { id: 'n11', defaultKey: 'Ctrl+G', scope: 'nav', description: '跳转到指定行号', boundKey: 'Ctrl+G', order: 34 },
  { id: 'n12', defaultKey: 'Ctrl+Shift+O', scope: 'nav', description: '打开符号导航', boundKey: 'Ctrl+Shift+O', order: 35 },

  { id: 'w1', defaultKey: 'Alt+Tab', scope: 'window', description: '切换到下一个窗口', boundKey: 'Alt+Tab', order: 36 },
  { id: 'w2', defaultKey: 'Alt+Shift+Tab', scope: 'window', description: '切换到上一个窗口', boundKey: 'Alt+Shift+Tab', order: 37 },
  { id: 'w3', defaultKey: 'Win+D', scope: 'window', description: '显示/隐藏桌面', boundKey: 'Win+D', order: 38 },
  { id: 'w4', defaultKey: 'Win+E', scope: 'window', description: '打开文件资源管理器', boundKey: 'Win+E', order: 39 },
  { id: 'w5', defaultKey: 'Win+L', scope: 'window', description: '锁定计算机', boundKey: 'Win+L', order: 40 },
  { id: 'w6', defaultKey: 'Alt+F4', scope: 'window', description: '关闭当前窗口', boundKey: 'Alt+F4', order: 41 },
  { id: 'w7', defaultKey: 'Win+Left', scope: 'window', description: '窗口左半屏', boundKey: 'Win+Left', order: 42 },
  { id: 'w8', defaultKey: 'Win+Right', scope: 'window', description: '窗口右半屏', boundKey: 'Win+Right', order: 43 },
  { id: 'w9', defaultKey: 'Win+Up', scope: 'window', description: '最大化当前窗口', boundKey: 'Win+Up', order: 44 },
  { id: 'w10', defaultKey: 'Win+Down', scope: 'window', description: '最小化当前窗口', boundKey: 'Win+Down', order: 45 },
  { id: 'w11', defaultKey: 'Ctrl+Shift+N', scope: 'window', description: '新建窗口实例', boundKey: 'Ctrl+Shift+N', order: 46 },
  { id: 'w12', defaultKey: 'Win+Tab', scope: 'window', description: '打开任务视图', boundKey: 'Win+Tab', order: 47 },
];

const ROW0: KeyboardKey[] = [
  { code: 'Escape', label: 'Esc', width: '1', row: 0 },
  { code: 'F1', label: 'F1', width: '1', row: 0 },
  { code: 'F2', label: 'F2', width: '1', row: 0 },
  { code: 'F3', label: 'F3', width: '1', row: 0 },
  { code: 'F4', label: 'F4', width: '1', row: 0 },
  { code: 'F5', label: 'F5', width: '1', row: 0 },
  { code: 'F6', label: 'F6', width: '1', row: 0 },
  { code: 'F7', label: 'F7', width: '1', row: 0 },
  { code: 'F8', label: 'F8', width: '1', row: 0 },
  { code: 'F9', label: 'F9', width: '1', row: 0 },
  { code: 'F10', label: 'F10', width: '1', row: 0 },
  { code: 'F11', label: 'F11', width: '1', row: 0 },
  { code: 'F12', label: 'F12', width: '1', row: 0 },
  { code: 'PrintScreen', label: 'PrtSc', width: '1', row: 0 },
  { code: 'ScrollLock', label: 'ScrLk', width: '1', row: 0 },
  { code: 'Pause', label: 'Pause', width: '1', row: 0 },
];

const ROW1: KeyboardKey[] = [
  { code: 'Backquote', label: '`', width: '1', row: 1 },
  { code: 'Digit1', label: '1', width: '1', row: 1 },
  { code: 'Digit2', label: '2', width: '1', row: 1 },
  { code: 'Digit3', label: '3', width: '1', row: 1 },
  { code: 'Digit4', label: '4', width: '1', row: 1 },
  { code: 'Digit5', label: '5', width: '1', row: 1 },
  { code: 'Digit6', label: '6', width: '1', row: 1 },
  { code: 'Digit7', label: '7', width: '1', row: 1 },
  { code: 'Digit8', label: '8', width: '1', row: 1 },
  { code: 'Digit9', label: '9', width: '1', row: 1 },
  { code: 'Digit0', label: '0', width: '1', row: 1 },
  { code: 'Minus', label: '-', width: '1', row: 1 },
  { code: 'Equal', label: '=', width: '1', row: 1 },
  { code: 'Backspace', label: 'Back', width: '2', row: 1 },
  { code: 'Insert', label: 'Ins', width: '1', row: 1 },
  { code: 'Home', label: 'Home', width: '1', row: 1 },
  { code: 'PageUp', label: 'PgUp', width: '1', row: 1 },
  { code: 'NumLock', label: 'Num', width: '1', row: 1 },
  { code: 'NumpadDivide', label: '/', width: '1', row: 1 },
  { code: 'NumpadMultiply', label: '*', width: '1', row: 1 },
  { code: 'NumpadSubtract', label: '-', width: '1', row: 1 },
];

const ROW2: KeyboardKey[] = [
  { code: 'Tab', label: 'Tab', width: '1-5', row: 2 },
  { code: 'KeyQ', label: 'Q', width: '1', row: 2 },
  { code: 'KeyW', label: 'W', width: '1', row: 2 },
  { code: 'KeyE', label: 'E', width: '1', row: 2 },
  { code: 'KeyR', label: 'R', width: '1', row: 2 },
  { code: 'KeyT', label: 'T', width: '1', row: 2 },
  { code: 'KeyY', label: 'Y', width: '1', row: 2 },
  { code: 'KeyU', label: 'U', width: '1', row: 2 },
  { code: 'KeyI', label: 'I', width: '1', row: 2 },
  { code: 'KeyO', label: 'O', width: '1', row: 2 },
  { code: 'KeyP', label: 'P', width: '1', row: 2 },
  { code: 'BracketLeft', label: '[', width: '1', row: 2 },
  { code: 'BracketRight', label: ']', width: '1', row: 2 },
  { code: 'Backslash', label: '\\', width: '1-5', row: 2 },
  { code: 'Delete', label: 'Del', width: '1', row: 2 },
  { code: 'End', label: 'End', width: '1', row: 2 },
  { code: 'PageDown', label: 'PgDn', width: '1', row: 2 },
  { code: 'Numpad7', label: '7', width: '1', row: 2 },
  { code: 'Numpad8', label: '8', width: '1', row: 2 },
  { code: 'Numpad9', label: '9', width: '1', row: 2 },
  { code: 'NumpadAdd', label: '+', width: '1', row: 2, height: '2' },
];

const ROW3: KeyboardKey[] = [
  { code: 'CapsLock', label: 'Caps', width: '1-75', row: 3 },
  { code: 'KeyA', label: 'A', width: '1', row: 3 },
  { code: 'KeyS', label: 'S', width: '1', row: 3 },
  { code: 'KeyD', label: 'D', width: '1', row: 3 },
  { code: 'KeyF', label: 'F', width: '1', row: 3 },
  { code: 'KeyG', label: 'G', width: '1', row: 3 },
  { code: 'KeyH', label: 'H', width: '1', row: 3 },
  { code: 'KeyJ', label: 'J', width: '1', row: 3 },
  { code: 'KeyK', label: 'K', width: '1', row: 3 },
  { code: 'KeyL', label: 'L', width: '1', row: 3 },
  { code: 'Semicolon', label: ';', width: '1', row: 3 },
  { code: 'Quote', label: "'", width: '1', row: 3 },
  { code: 'Enter', label: 'Enter', width: '2-25', row: 3 },
  { code: 'Numpad4', label: '4', width: '1', row: 3 },
  { code: 'Numpad5', label: '5', width: '1', row: 3 },
  { code: 'Numpad6', label: '6', width: '1', row: 3 },
];

const ROW4: KeyboardKey[] = [
  { code: 'ShiftLeft', label: 'Shift', width: '2-25', row: 4 },
  { code: 'KeyZ', label: 'Z', width: '1', row: 4 },
  { code: 'KeyX', label: 'X', width: '1', row: 4 },
  { code: 'KeyC', label: 'C', width: '1', row: 4 },
  { code: 'KeyV', label: 'V', width: '1', row: 4 },
  { code: 'KeyB', label: 'B', width: '1', row: 4 },
  { code: 'KeyN', label: 'N', width: '1', row: 4 },
  { code: 'KeyM', label: 'M', width: '1', row: 4 },
  { code: 'Comma', label: ',', width: '1', row: 4 },
  { code: 'Period', label: '.', width: '1', row: 4 },
  { code: 'Slash', label: '/', width: '1', row: 4 },
  { code: 'ShiftRight', label: 'Shift', width: '2-75', row: 4 },
  { code: 'ArrowUp', label: '↑', width: '1', row: 4 },
  { code: 'Numpad1', label: '1', width: '1', row: 4 },
  { code: 'Numpad2', label: '2', width: '1', row: 4 },
  { code: 'Numpad3', label: '3', width: '1', row: 4 },
  { code: 'NumpadEnter', label: 'Enter', width: '1', row: 4, height: '2' },
];

const ROW5: KeyboardKey[] = [
  { code: 'ControlLeft', label: 'Ctrl', width: '1-25', row: 5 },
  { code: 'MetaLeft', label: 'Win', width: '1-25', row: 5 },
  { code: 'AltLeft', label: 'Alt', width: '1-25', row: 5 },
  { code: 'Space', label: 'Space', width: '6-25', row: 5 },
  { code: 'AltRight', label: 'Alt', width: '1-25', row: 5 },
  { code: 'MetaRight', label: 'Win', width: '1-25', row: 5 },
  { code: 'ContextMenu', label: 'Menu', width: '1-25', row: 5 },
  { code: 'ControlRight', label: 'Ctrl', width: '1-25', row: 5 },
  { code: 'ArrowLeft', label: '←', width: '1', row: 5 },
  { code: 'ArrowDown', label: '↓', width: '1', row: 5 },
  { code: 'ArrowRight', label: '→', width: '1', row: 5 },
  { code: 'Numpad0', label: '0', width: '2', row: 5 },
  { code: 'NumpadDecimal', label: '.', width: '1', row: 5 },
];

export const KEYBOARD_LAYOUT: KeyboardKey[][] = [ROW0, ROW1, ROW2, ROW3, ROW4, ROW5];

export const parseKeyCombo = (combo: string): string[] => {
  return combo.split('+').map(k => k.trim());
};

export const getBaseKeyFromCombo = (combo: string): string => {
  const parts = parseKeyCombo(combo);
  const basePart = parts[parts.length - 1] || '';
  return basePart;
};

const CODE_TO_LABEL_MAP: Record<string, string> = {
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F',
  KeyG: 'G', KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L',
  KeyM: 'M', KeyN: 'N', KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R',
  KeyS: 'S', KeyT: 'T', KeyU: 'U', KeyV: 'V', KeyW: 'W', KeyX: 'X',
  KeyY: 'Y', KeyZ: 'Z',
  Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
  Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
  Numpad0: '0', Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4',
  Numpad5: '5', Numpad6: '6', Numpad7: '7', Numpad8: '8', Numpad9: '9',
  NumpadAdd: '+', NumpadSubtract: '-', NumpadMultiply: '*', NumpadDivide: '/',
  NumpadDecimal: '.', NumpadEnter: 'Enter',
  Slash: '/', Backslash: '\\', Comma: ',', Period: '.',
  Semicolon: ';', Quote: "'", Minus: '-', Equal: '=',
  BracketLeft: '[', BracketRight: ']', Backquote: '`',
};

const LABEL_TO_CODE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CODE_TO_LABEL_MAP).map(([k, v]) => [v.toUpperCase(), k])
);

export const findKeyCodesForCombo = (combo: string): string[] => {
  const parts = parseKeyCombo(combo);
  const codes: string[] = [];
  
  parts.forEach(part => {
    const upperPart = part.toUpperCase();
    if (upperPart === 'CTRL' || upperPart === 'CONTROL') {
      codes.push('ControlLeft');
    } else if (upperPart === 'ALT') {
      codes.push('AltLeft');
    } else if (upperPart === 'SHIFT') {
      codes.push('ShiftLeft');
    } else if (upperPart === 'WIN' || upperPart === 'META' || upperPart === 'OS') {
      codes.push('MetaLeft');
    } else if (upperPart === 'ENTER') {
      codes.push('Enter');
    } else if (upperPart === 'TAB') {
      codes.push('Tab');
    } else if (upperPart === 'SPACE') {
      codes.push('Space');
    } else if (upperPart === 'BACK' || upperPart === 'BACKSPACE') {
      codes.push('Backspace');
    } else if (upperPart === 'ESC' || upperPart === 'ESCAPE') {
      codes.push('Escape');
    } else if (upperPart === 'HOME') {
      codes.push('Home');
    } else if (upperPart === 'END') {
      codes.push('End');
    } else if (upperPart === 'PAGEUP' || upperPart === 'PGUP') {
      codes.push('PageUp');
    } else if (upperPart === 'PAGEDOWN' || upperPart === 'PGDN') {
      codes.push('PageDown');
    } else if (upperPart === 'UP' || upperPart === 'ARROWUP') {
      codes.push('ArrowUp');
    } else if (upperPart === 'DOWN' || upperPart === 'ARROWDOWN') {
      codes.push('ArrowDown');
    } else if (upperPart === 'LEFT' || upperPart === 'ARROWLEFT') {
      codes.push('ArrowLeft');
    } else if (upperPart === 'RIGHT' || upperPart === 'ARROWRIGHT') {
      codes.push('ArrowRight');
    } else if (upperPart === 'INSERT' || upperPart === 'INS') {
      codes.push('Insert');
    } else if (upperPart === 'DELETE' || upperPart === 'DEL') {
      codes.push('Delete');
    } else if (upperPart === 'CAPS' || upperPart === 'CAPSLOCK') {
      codes.push('CapsLock');
    } else if (upperPart === 'F1') codes.push('F1');
    else if (upperPart === 'F2') codes.push('F2');
    else if (upperPart === 'F3') codes.push('F3');
    else if (upperPart === 'F4') codes.push('F4');
    else if (upperPart === 'F5') codes.push('F5');
    else if (upperPart === 'F6') codes.push('F6');
    else if (upperPart === 'F7') codes.push('F7');
    else if (upperPart === 'F8') codes.push('F8');
    else if (upperPart === 'F9') codes.push('F9');
    else if (upperPart === 'F10') codes.push('F10');
    else if (upperPart === 'F11') codes.push('F11');
    else if (upperPart === 'F12') codes.push('F12');
    else {
      const foundCode = LABEL_TO_CODE_MAP[upperPart];
      if (foundCode) codes.push(foundCode);
    }
  });
  
  return codes;
};

export const detectConflicts = (keymaps: KeymapItem[]): Map<string, string[]> => {
  const keyMap = new Map<string, string[]>();
  
  keymaps.forEach(item => {
    const normalized = item.boundKey.toLowerCase();
    if (!keyMap.has(normalized)) {
      keyMap.set(normalized, []);
    }
    keyMap.get(normalized)!.push(item.id);
  });
  
  const conflicts = new Map<string, string[]>();
  keyMap.forEach((ids, key) => {
    if (ids.length > 1) {
      ids.forEach(id => conflicts.set(id, ids));
    }
  });
  
  return conflicts;
};

export const STORAGE_KEY = 'shapesync_keymaps_v1';

export const loadFromStorage = (): KeymapItem[] | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load keymaps from storage:', e);
  }
  return null;
};

export const saveToStorage = (keymaps: KeymapItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keymaps));
  } catch (e) {
    console.error('Failed to save keymaps to storage:', e);
  }
};

export const exportToJSON = (keymaps: KeymapItem[]): void => {
  const dataStr = JSON.stringify(keymaps, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'keymap.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const validateImportedJSON = (data: unknown): KeymapItem[] | null => {
  if (!Array.isArray(data)) return null;
  
  const validKeys: ScopeType[] = ['common', 'edit', 'nav', 'window'];
  
  for (const item of data) {
    if (typeof item !== 'object' || item === null) return null;
    if (typeof item.id !== 'string') return null;
    if (typeof item.defaultKey !== 'string') return null;
    if (!validKeys.includes((item as KeymapItem).scope)) return null;
    if (typeof item.description !== 'string') return null;
    if (typeof item.boundKey !== 'string') return null;
    if (typeof item.order !== 'number') return null;
  }
  
  return data as KeymapItem[];
};
