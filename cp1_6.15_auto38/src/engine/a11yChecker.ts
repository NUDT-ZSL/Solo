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

function hasAccessibleName(el: HTMLElement): boolean {
  if (el.hasAttribute('aria-label') && el.getAttribute('aria-label')!.trim().length > 0) {
    return true;
  }
  if (el.hasAttribute('aria-labelledby')) {
    const ids = el.getAttribute('aria-labelledby')!.split(/\s+/);
    for (const id of ids) {
      const labelEl = document.getElementById(id);
      if (labelEl && labelEl.textContent!.trim().length > 0) return true;
    }
  }
  if (el.hasAttribute('title') && el.getAttribute('title')!.trim().length > 0) {
    return true;
  }
  if (el.textContent && el.textContent.trim().length > 0) {
    return true;
  }
  const imgEl = el as HTMLImageElement;
  if (imgEl.alt && imgEl.alt.trim().length > 0) {
    return true;
  }
  return false;
}

function isValidAriaReference(el: HTMLElement, attr: string): boolean {
  const ids = el.getAttribute(attr);
  if (!ids) return true;
  for (const id of ids.split(/\s+/)) {
    if (!document.getElementById(id)) return false;
  }
  return true;
}

const buttonRules: RuleChecker[] = [
  (el): A11yViolation | null => {
    const role = el.getAttribute('role');
    if (role !== 'button' && el.tagName !== 'BUTTON') {
      return {
        ruleId: 'BUTTON-001',
        severity: 'error',
        message: `元素缺少 button 角色或语义化标签（当前 role="${role || '无'}", tag=<${el.tagName.toLowerCase()}>）`,
        suggestion: '使用 <button> 标签或添加 role="button" 属性，确保屏幕阅读器能识别为按钮',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    if (!hasAccessibleName(el)) {
      return {
        ruleId: 'BUTTON-002',
        severity: 'error',
        message: '按钮缺少可访问名称（无 aria-label、文本内容或 title）',
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
        message: '禁用状态仅通过 HTML disabled 属性声明，未通过 ARIA 明确声明',
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
        message: `自定义按钮不可通过键盘聚焦（当前 tabindex="${tabIndex || '无'}"）`,
        suggestion: '添加 tabindex="0" 属性，确保按钮可以通过 Tab 键获得焦点',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const isDisabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
    if (isDisabled) {
      const tabIndex = el.getAttribute('tabindex');
      if (tabIndex !== '-1' && tabIndex !== null) {
        return {
          ruleId: 'BUTTON-005',
          severity: 'warning',
          message: `禁用按钮的 tabindex 为 "${tabIndex}"，可能导致键盘仍可聚焦`,
          suggestion: '禁用按钮应设置 tabindex="-1" 或从 Tab 序列中移除，防止键盘用户聚焦到不可操作元素',
        };
      }
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
        message: `弹窗容器缺少 dialog 角色（当前 role="${el.getAttribute('role') || '无'}"）`,
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
        message: `未声明模态状态（当前 aria-modal="${el.getAttribute('aria-modal') || '无'}"）`,
        suggestion: '添加 aria-modal="true" 属性，告知屏幕阅读器这是一个模态弹窗，需先处理才能操作其他内容',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    if (!hasAccessibleName(el)) {
      return {
        ruleId: 'DIALOG-003',
        severity: 'error',
        message: '弹窗缺少可访问名称（无 aria-labelledby、aria-label 或 title）',
        suggestion: '添加 aria-labelledby 指向弹窗标题，或直接使用 aria-label 提供弹窗名称',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    if (el.hasAttribute('aria-labelledby') && !isValidAriaReference(el, 'aria-labelledby')) {
      const ids = el.getAttribute('aria-labelledby')!;
      return {
        ruleId: 'DIALOG-004',
        severity: 'error',
        message: `aria-labelledby 引用了不存在的元素（引用 ID: "${ids}"）`,
        suggestion: '确保 aria-labelledby 引用的 ID 对应页面中实际存在的元素',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const focusableSelectors = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = el.querySelectorAll(focusableSelectors);
    if (focusable.length === 0) {
      return {
        ruleId: 'DIALOG-005',
        severity: 'warning',
        message: '弹窗内没有可聚焦元素，键盘用户可能无法交互',
        suggestion: '在弹窗内添加至少一个可聚焦元素（如按钮或链接），或给弹窗容器设置 tabindex="-1" 以便程序化聚焦',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const interactiveChildren = el.querySelectorAll('button, a[href], input, select, textarea, [tabindex]');
    let hasCloseMechanism = false;
    interactiveChildren.forEach((child) => {
      const childEl = child as HTMLElement;
      const label = childEl.getAttribute('aria-label') || childEl.textContent || '';
      if (label.includes('关闭') || label.includes('close') || label.includes('Cancel') || label.includes('取消')) {
        hasCloseMechanism = true;
      }
    });
    if (!hasCloseMechanism) {
      return {
        ruleId: 'DIALOG-006',
        severity: 'warning',
        message: '弹窗内未找到明显的关闭机制',
        suggestion: '添加一个带 aria-label="关闭弹窗" 的关闭按钮，确保用户可以主动关闭弹窗',
      };
    }
    return null;
  },
];

const toastRules: RuleChecker[] = [
  (el): A11yViolation | null => {
    const role = el.getAttribute('role');
    if (role !== 'alert' && role !== 'status' && role !== 'log') {
      return {
        ruleId: 'TOAST-001',
        severity: 'error',
        message: `通知容器缺少合适的 ARIA 角色（当前 role="${role || '无'}"）`,
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
        message: '通知容器未设置 aria-live 实时区域属性',
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
        message: `未设置原子播报（当前 aria-atomic="${atomic || '无'}"）`,
        suggestion: '添加 aria-atomic="true"，确保每次更新时播报完整内容而非只播报变化部分',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const toastItems = el.querySelectorAll('[role="status"], [role="alert"]');
    toastItems.forEach((item) => {
      if (!hasAccessibleName(item as HTMLElement)) {
        return {
          ruleId: 'TOAST-004',
          severity: 'warning',
          message: '通知条目缺少可访问名称，屏幕阅读器可能无法正确播报内容',
          suggestion: '为每条通知添加 aria-label 属性，包含通知的完整文本内容',
        };
      }
    });
    return null;
  },
  (el): A11yViolation | null => {
    const childText = el.textContent?.trim() || '';
    if (childText.length === 0) {
      return {
        ruleId: 'TOAST-005',
        severity: 'warning',
        message: '通知容器当前无文本内容，屏幕阅读器可能不会播报',
        suggestion: '确保通知消息在容器内有文本内容，或等待内容动态填充后再检查',
      };
    }
    return null;
  },
];

function checkChildAccessibility(el: HTMLElement): A11yViolation[] {
  const violations: A11yViolation[] = [];

  const images = el.querySelectorAll('img');
  images.forEach((img) => {
    if (!img.hasAttribute('alt')) {
      violations.push({
        ruleId: 'CHILD-001',
        severity: 'error',
        message: `子元素 <img> 缺少 alt 属性（src="${img.getAttribute('src')?.substring(0, 30) || ''}"）`,
        suggestion: '为所有 <img> 元素添加 alt 属性，装饰性图片使用 alt=""',
      });
    }
  });

  const links = el.querySelectorAll('a');
  links.forEach((link) => {
    if (!hasAccessibleName(link as HTMLElement)) {
      violations.push({
        ruleId: 'CHILD-002',
        severity: 'error',
        message: '子元素 <a> 缺少可访问名称',
        suggestion: '为链接添加文本内容、aria-label 或 title 属性',
      });
    }
  });

  const inputs = el.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const inputEl = input as HTMLElement;
    const hasLabel =
      inputEl.hasAttribute('aria-label') ||
      inputEl.hasAttribute('aria-labelledby') ||
      inputEl.hasAttribute('title') ||
      document.querySelector(`label[for="${inputEl.getAttribute('id')}"]`);
    if (!hasLabel) {
      violations.push({
        ruleId: 'CHILD-003',
        severity: 'error',
        message: `子元素 <${inputEl.tagName.toLowerCase()}> 缺少关联标签`,
        suggestion: '为表单元素添加 aria-label、aria-labelledby 或关联 <label> 元素',
      });
    }
  });

  return violations;
}

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
      const report: A11yReport = {
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
        executionTime: performance.now() - startTime,
      };
      this.notifyListeners(report);
      return report;
    }

    let rules: RuleChecker[] = [];
    const role = element.getAttribute('role');
    const tagName = element.tagName;

    if (role === 'button' || tagName === 'BUTTON') {
      rules = buttonRules;
    } else if (role === 'dialog') {
      rules = dialogRules;
      focusManager.pushFocus(document.activeElement as HTMLElement);
    } else if (role === 'alert' || role === 'status' || role === 'log') {
      rules = toastRules;
    }

    for (const rule of rules) {
      const violation = rule(element);
      if (violation) {
        violations.push(violation);
      }
    }

    const childViolations = checkChildAccessibility(element);
    violations.push(...childViolations);

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
