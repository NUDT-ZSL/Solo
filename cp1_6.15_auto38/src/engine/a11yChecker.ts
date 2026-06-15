import { focusManager } from './focusManager';

export type Severity = 'error' | 'warning' | 'success';

export interface A11yViolation {
  ruleId: string;
  severity: Severity;
  message: string;
  suggestion: string;
}

export interface A11yReport {
  id: string;
  timestamp: number;
  componentName: string;
  violations: A11yViolation[];
  overallStatus: Severity;
  executionTime: number;
}

type RuleChecker = (element: HTMLElement) => A11yViolation | null;

const buttonRules: RuleChecker[] = [
  (el): A11yViolation | null => {
    if (el.getAttribute('role') !== 'button' && el.tagName !== 'BUTTON') {
      return {
        ruleId: 'BUTTON-001',
        severity: 'error',
        message: '缺少 button 角色或语义化标签',
        suggestion: '使用 <button> 标签或添加 role="button" 属性，确保屏幕阅读器能识别为按钮',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const hasLabel = el.hasAttribute('aria-label') || el.textContent?.trim().length! > 0;
    if (!hasLabel) {
      return {
        ruleId: 'BUTTON-002',
        severity: 'error',
        message: '按钮缺少可访问名称',
        suggestion: '添加 aria-label 属性或在按钮内提供文本内容，让屏幕阅读器能朗读按钮用途',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const isDisabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
    if (isDisabled && el.getAttribute('aria-disabled') !== 'true') {
      return {
        ruleId: 'BUTTON-003',
        severity: 'warning',
        message: '禁用状态未通过 ARIA 明确声明',
        suggestion: '添加 aria-disabled="true" 属性，明确告知屏幕阅读器当前按钮处于禁用状态',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const tabIndex = el.getAttribute('tabindex');
    const isNativeButton = el.tagName === 'BUTTON';
    const isDisabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
    
    if (!isNativeButton && tabIndex !== '0' && !isDisabled) {
      return {
        ruleId: 'BUTTON-004',
        severity: 'error',
        message: '自定义按钮不可通过键盘聚焦',
        suggestion: '添加 tabindex="0" 属性，确保按钮可以通过 Tab 键获得焦点',
      };
    }
    return null;
  },
];

const dialogRules: RuleChecker[] = [
  (el): A11yViolation | null => {
    if (el.getAttribute('role') !== 'dialog') {
      return {
        ruleId: 'DIALOG-001',
        severity: 'error',
        message: '弹窗缺少 dialog 角色',
        suggestion: '添加 role="dialog" 属性，让屏幕阅读器识别当前区域为弹窗对话框',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    if (el.getAttribute('aria-modal') !== 'true') {
      return {
        ruleId: 'DIALOG-002',
        severity: 'warning',
        message: '未声明模态状态',
        suggestion: '添加 aria-modal="true" 属性，告知屏幕阅读器这是一个模态弹窗，需先处理才能操作其他内容',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const hasLabel = el.hasAttribute('aria-labelledby') || el.hasAttribute('aria-label');
    if (!hasLabel) {
      return {
        ruleId: 'DIALOG-003',
        severity: 'error',
        message: '弹窗缺少可访问名称',
        suggestion: '添加 aria-labelledby 指向弹窗标题，或直接使用 aria-label 提供弹窗名称',
      };
    }
    return null;
  },
];

const toastRules: RuleChecker[] = [
  (el): A11yViolation | null => {
    const role = el.getAttribute('role');
    if (role !== 'alert' && role !== 'status') {
      return {
        ruleId: 'TOAST-001',
        severity: 'error',
        message: '通知缺少合适的 ARIA 角色',
        suggestion: '添加 role="alert" 用于重要通知，或 role="status" 用于一般状态更新，确保屏幕阅读器能播报',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const live = el.getAttribute('aria-live');
    if (!live) {
      return {
        ruleId: 'TOAST-002',
        severity: 'warning',
        message: '未设置实时区域',
        suggestion: '添加 aria-live="polite" 或 aria-live="assertive"，动态内容变化时屏幕阅读器会自动播报',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const atomic = el.getAttribute('aria-atomic');
    if (atomic !== 'true') {
      return {
        ruleId: 'TOAST-003',
        severity: 'warning',
        message: '未设置原子播报',
        suggestion: '添加 aria-atomic="true"，确保每次更新时播报完整内容而非只播报变化部分',
      };
    }
    return null;
  },
];

function generateId(): string {
  return 'report-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function determineOverallStatus(violations: A11yViolation[]): Severity {
  if (violations.length === 0) return 'success';
  if (violations.some(v => v.severity === 'error')) return 'error';
  return 'warning';
}

class A11yChecker {
  private observers: Map<HTMLElement, MutationObserver> = new Map();
  private listeners: Set<(report: A11yReport) => void> = new Set();

  parse(element: HTMLElement | null, componentName: string): A11yReport {
    const startTime = performance.now();
    const violations: A11yViolation[] = [];

    if (!element) {
      return {
        id: generateId(),
        timestamp: Date.now(),
        componentName,
        violations: [{
          ruleId: 'GENERAL-001',
          severity: 'error',
          message: '无法获取组件 DOM 元素',
          suggestion: '确保组件已正确渲染并挂载到 DOM 中',
        }],
        overallStatus: 'error',
        executionTime: 0,
      };
    }

    let rules: RuleChecker[] = [];
    const role = element.getAttribute('role');

    if (role === 'button' || element.tagName === 'BUTTON') {
      rules = buttonRules;
    } else if (role === 'dialog') {
      rules = dialogRules;
      focusManager.pushFocus(document.activeElement as HTMLElement);
    } else if (role === 'alert' || role === 'status') {
      rules = toastRules;
    }

    for (const rule of rules) {
      const violation = rule(element);
      if (violation) {
        violations.push(violation);
      }
    }

    const executionTime = performance.now() - startTime;
    if (executionTime > 30) {
      console.warn(`A11yChecker.parse took ${executionTime.toFixed(2)}ms, expected < 30ms`);
    }

    const report: A11yReport = {
      id: generateId(),
      timestamp: Date.now(),
      componentName,
      violations,
      overallStatus: determineOverallStatus(violations),
      executionTime,
    };

    this.notifyListeners(report);
    return report;
  }

  observe(element: HTMLElement, componentName: string): void {
    if (this.observers.has(element)) return;

    const observer = new MutationObserver(() => {
      this.parse(element, componentName);
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    this.observers.set(element, observer);
  }

  unobserve(element: HTMLElement): void {
    const observer = this.observers.get(element);
    if (observer) {
      observer.disconnect();
      this.observers.delete(element);
    }
  }

  onReport(callback: (report: A11yReport) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(report: A11yReport): void {
    for (const listener of this.listeners) {
      try {
        listener(report);
      } catch (e) {
        console.error('A11yChecker listener error:', e);
      }
    }
  }

  destroy(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.listeners.clear();
  }
}

export const a11yChecker = new A11yChecker();
