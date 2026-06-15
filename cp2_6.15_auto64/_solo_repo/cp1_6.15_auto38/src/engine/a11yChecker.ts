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

const VALID_ARIA_ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
  'cell', 'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
  'definition', 'dialog', 'directory', 'document', 'feed', 'figure', 'form',
  'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox',
  'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option',
  'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
  'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton',
  'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox',
  'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
]);

const VALID_ARIA_MODAL_CONTEXTS = new Set(['dialog', 'alertdialog']);
const VALID_ARIA_LIVE_VALUES = new Set(['off', 'polite', 'assertive']);
const VALID_ARIA_ATOMIC_VALUES = new Set(['true', 'false']);
const VALID_ARIA_DISABLED_VALUES = new Set(['true', 'false']);
const VALID_ARIA_HIDDEN_VALUES = new Set(['true', 'false', 'undefined']);
const VALID_ARIA_EXPANDED_VALUES = new Set(['true', 'false', 'undefined']);
const VALID_ARIA_HASPOPUP_VALUES = new Set([
  'true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog',
]);
const VALID_BOOLEAN_TOKEN_VALUES = new Set(['true', 'false', 'mixed']);

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
  const inputEl = el as HTMLInputElement;
  if (inputEl.placeholder && inputEl.placeholder.trim().length > 0) {
    return true;
  }
  return false;
}

function resolveAllAriaRefs(el: HTMLElement, attr: string): HTMLElement[] {
  const ids = el.getAttribute(attr);
  if (!ids) return [];
  return ids
    .split(/\s+/)
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
}

function checkGenericAriaAttributes(el: HTMLElement): A11yViolation[] {
  const violations: A11yViolation[] = [];
  const role = el.getAttribute('role');

  if (role && !VALID_ARIA_ROLES.has(role)) {
    violations.push({
      ruleId: 'GENERIC-001',
      severity: 'error',
      message: `非法 ARIA role 值 "${role}"，该值不在 WAI-ARIA 1.2 标准角色列表中`,
      suggestion: '使用 WAI-ARIA 规范中的合法 role 值，如 button、dialog、alert、status 等',
    });
  }

  const ariaModal = el.getAttribute('aria-modal');
  if (ariaModal === 'true' && role && !VALID_ARIA_MODAL_CONTEXTS.has(role)) {
    violations.push({
      ruleId: 'GENERIC-002',
      severity: 'error',
      message: `aria-modal="true" 与 role="${role}" 不匹配，仅 dialog/alertdialog 角色可使用 aria-modal`,
      suggestion: '移除 aria-modal 属性，或将 role 改为 dialog/alertdialog',
    });
  }
  if (role && VALID_ARIA_MODAL_CONTEXTS.has(role) && ariaModal !== 'true') {
    violations.push({
      ruleId: 'GENERIC-003',
      severity: 'warning',
      message: `role="${role}" 应配合 aria-modal="true" 使用以声明模态状态`,
      suggestion: '模态对话框应添加 aria-modal="true" 告知屏幕阅读器背景不可交互',
    });
  }

  if (el.hasAttribute('aria-live')) {
    const v = el.getAttribute('aria-live');
    if (v && !VALID_ARIA_LIVE_VALUES.has(v)) {
      violations.push({
        ruleId: 'GENERIC-004',
        severity: 'error',
        message: `非法 aria-live 值 "${v}"，合法值为 off/polite/assertive`,
        suggestion: '使用合法的 aria-live 值：polite（等待用户空闲）或 assertive（立即打断）',
      });
    }
  }

  if (el.hasAttribute('aria-atomic')) {
    const v = el.getAttribute('aria-atomic');
    if (v && !VALID_ARIA_ATOMIC_VALUES.has(v)) {
      violations.push({
        ruleId: 'GENERIC-005',
        severity: 'warning',
        message: `非法 aria-atomic 值 "${v}"，合法值为 true/false`,
        suggestion: '将 aria-atomic 设为 "true" 或 "false"',
      });
    }
  }

  if (el.hasAttribute('aria-disabled')) {
    const v = el.getAttribute('aria-disabled');
    if (v && !VALID_ARIA_DISABLED_VALUES.has(v)) {
      violations.push({
        ruleId: 'GENERIC-006',
        severity: 'warning',
        message: `非法 aria-disabled 值 "${v}"，合法值为 true/false`,
        suggestion: '将 aria-disabled 设为 "true" 或 "false"',
      });
    }
  }

  if (el.hasAttribute('aria-hidden')) {
    const v = el.getAttribute('aria-hidden');
    if (v && !VALID_ARIA_HIDDEN_VALUES.has(v)) {
      violations.push({
        ruleId: 'GENERIC-007',
        severity: 'warning',
        message: `非法 aria-hidden 值 "${v}"，合法值为 true/false/undefined`,
        suggestion: '使用合法的 aria-hidden 值',
      });
    }
    if (v === 'true') {
      const focusable = el.querySelector(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        violations.push({
          ruleId: 'GENERIC-008',
          severity: 'error',
          message: 'aria-hidden="true" 的元素内包含可聚焦子元素，会导致焦点指向隐藏元素',
          suggestion: '给所有子可聚焦元素加 tabindex="-1" disabled 或移除 aria-hidden="true"',
        });
      }
    }
  }

  if (el.hasAttribute('aria-expanded')) {
    const v = el.getAttribute('aria-expanded');
    if (v && !VALID_ARIA_EXPANDED_VALUES.has(v)) {
      violations.push({
        ruleId: 'GENERIC-009',
        severity: 'warning',
        message: `非法 aria-expanded 值 "${v}"，合法值为 true/false/undefined`,
        suggestion: '使用合法的 aria-expanded 值',
      });
    }
  }

  if (el.hasAttribute('aria-haspopup')) {
    const v = el.getAttribute('aria-haspopup');
    if (v && !VALID_ARIA_HASPOPUP_VALUES.has(v)) {
      violations.push({
        ruleId: 'GENERIC-010',
        severity: 'warning',
        message: `非法 aria-haspopup 值 "${v}"`,
        suggestion: 'aria-haspopup 合法值为：true/false/menu/listbox/tree/grid/dialog',
      });
    }
  }

  ['aria-checked', 'aria-pressed', 'aria-selected'].forEach((attr) => {
    if (el.hasAttribute(attr)) {
      const v = el.getAttribute(attr);
      if (v && !VALID_BOOLEAN_TOKEN_VALUES.has(v)) {
        violations.push({
          ruleId: 'GENERIC-011',
          severity: 'warning',
          message: `非法 ${attr} 值 "${v}"，合法值为 true/false/mixed`,
          suggestion: `将 ${attr} 设为合法的三态值（true/false/mixed）`,
        });
      }
    }
  });

  const refAttrs = [
    'aria-labelledby',
    'aria-describedby',
    'aria-owns',
    'aria-controls',
    'aria-activedescendant',
    'aria-details',
    'aria-errormessage',
  ];
  refAttrs.forEach((attr) => {
    if (el.hasAttribute(attr)) {
      const ids = el.getAttribute(attr)!.split(/\s+/);
      const missing: string[] = [];
      ids.forEach((id) => {
        if (id.length > 0 && !document.getElementById(id)) {
          missing.push(id);
        }
      });
      if (missing.length > 0) {
        violations.push({
          ruleId: 'GENERIC-012',
          severity: 'error',
          message: `${attr} 引用的元素不存在，缺失 ID: "${missing.join('", "')}"`,
          suggestion: `确保 ${attr} 中列出的每个 ID 都对应页面中真实存在的元素`,
        });
      } else {
        const resolved = resolveAllAriaRefs(el, attr);
        const empty = resolved.filter((r) => (r.textContent || '').trim().length === 0);
        if (empty.length > 0 && (attr === 'aria-labelledby' || attr === 'aria-describedby')) {
          violations.push({
            ruleId: 'GENERIC-013',
            severity: 'warning',
            message: `${attr} 引用的部分元素为空文本，屏幕阅读器可能无法提供有效标签`,
            suggestion: `被 ${attr} 引用的元素应包含有意义的文本内容`,
          });
        }
      }
    }
  });

  const ariaRequired = el.getAttribute('aria-required');
  if (ariaRequired && ariaRequired !== 'true' && ariaRequired !== 'false') {
    violations.push({
      ruleId: 'GENERIC-014',
      severity: 'warning',
      message: `非法 aria-required 值 "${ariaRequired}"，合法值为 true/false`,
      suggestion: '将 aria-required 设为 "true" 或 "false"',
    });
  }

  const ariaInvalid = el.getAttribute('aria-invalid');
  if (ariaInvalid && !['true', 'false', 'grammar', 'spelling'].includes(ariaInvalid)) {
    violations.push({
      ruleId: 'GENERIC-015',
      severity: 'warning',
      message: `非法 aria-invalid 值 "${ariaInvalid}"`,
      suggestion: 'aria-invalid 合法值为 true/false/grammar/spelling',
    });
  }

  const tag = el.tagName.toLowerCase();
  if (role === 'none' || role === 'presentation') {
    const interactive = el.querySelector(
      'button, a[href], input, select, textarea, [tabindex], audio[controls], video[controls], iframe, area[href]'
    );
    if (interactive) {
      violations.push({
        ruleId: 'GENERIC-016',
        severity: 'error',
        message: `role="${role}" 的 <${tag}> 内包含可聚焦/交互后代，会覆盖 presentation 语义`,
        suggestion: 'role="presentation" 的元素不应包含可交互子元素',
      });
    }
  }

  return violations;
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
      const isNative = el.tagName === 'BUTTON';
      if (!isNative && tabIndex !== '-1') {
        return {
          ruleId: 'BUTTON-005',
          severity: 'warning',
          message: `自定义禁用按钮的 tabindex 为 "${tabIndex || '无'}"，可能导致键盘仍可聚焦`,
          suggestion: '自定义禁用按钮应设置 tabindex="-1"，从 Tab 序列中移除',
        };
      }
    }
    return null;
  },
];

const dialogRules: RuleChecker[] = [
  (el): A11yViolation | null => {
    if (el.getAttribute('role') !== 'dialog' && el.getAttribute('role') !== 'alertdialog') {
      return {
        ruleId: 'DIALOG-001',
        severity: 'error',
        message: `弹窗容器缺少 dialog/alertdialog 角色（当前 role="${el.getAttribute('role') || '无'}"）`,
        suggestion: '添加 role="dialog"（普通弹窗）或 role="alertdialog"（警告型弹窗）属性',
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
        suggestion: '模态弹窗添加 aria-modal="true"，告知屏幕阅读器背景页不可交互',
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
        suggestion: '添加 aria-labelledby 指向弹窗标题 ID，或使用 aria-label 提供弹窗名称',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    if (el.hasAttribute('aria-labelledby') && !isValidAriaRef(el, 'aria-labelledby')) {
      const ids = el.getAttribute('aria-labelledby')!;
      return {
        ruleId: 'DIALOG-004',
        severity: 'error',
        message: `aria-labelledby 引用了不存在的元素（引用 ID: "${ids}"）`,
        suggestion: '确保 aria-labelledby 列出的每个 ID 都对应页面中真实存在的标题元素',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const focusableSelectors =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = el.querySelectorAll(focusableSelectors);
    const hasIntrinsicTabIndex = el.getAttribute('tabindex') === '-1';
    if (focusable.length === 0 && !hasIntrinsicTabIndex) {
      return {
        ruleId: 'DIALOG-005',
        severity: 'warning',
        message: '弹窗内没有可聚焦元素且容器本身不可程序化聚焦',
        suggestion: '在弹窗内添加可聚焦元素（如按钮），或给弹窗容器设置 tabindex="-1" 以便程序化聚焦',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const interactiveChildren = el.querySelectorAll('button, a[href], input, select, textarea, [tabindex]');
    let hasCloseMechanism = false;
    interactiveChildren.forEach((child) => {
      const childEl = child as HTMLElement;
      const label = (childEl.getAttribute('aria-label') || childEl.textContent || '').toLowerCase();
      if (
        label.includes('关闭') ||
        label.includes('close') ||
        label.includes('cancel') ||
        label.includes('取消') ||
        label.includes('确定') ||
        label.includes('ok')
      ) {
        hasCloseMechanism = true;
      }
    });
    if (!hasCloseMechanism) {
      return {
        ruleId: 'DIALOG-006',
        severity: 'warning',
        message: '弹窗内未找到明确的关闭或确认机制',
        suggestion: '添加带 aria-label="关闭弹窗" 的按钮，或至少一个确认/取消操作按钮',
      };
    }
    return null;
  },
];

function isValidAriaRef(el: HTMLElement, attr: string): boolean {
  const ids = el.getAttribute(attr);
  if (!ids) return true;
  for (const id of ids.split(/\s+/)) {
    if (!document.getElementById(id)) return false;
  }
  return true;
}

const toastRules: RuleChecker[] = [
  (el): A11yViolation | null => {
    const role = el.getAttribute('role');
    if (role !== 'alert' && role !== 'status' && role !== 'log') {
      return {
        ruleId: 'TOAST-001',
        severity: 'error',
        message: `通知容器缺少合适的 ARIA 角色（当前 role="${role || '无'}"）`,
        suggestion: '添加 role="alert"（打断）或 role="status"（礼貌播报）用于实时通知',
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
        suggestion: '添加 aria-live="polite" 或 aria-live="assertive"，动态内容变化时屏幕阅读器自动播报',
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
        suggestion: '添加 aria-atomic="true"，确保每次更新时播报完整内容而非变化增量',
      };
    }
    return null;
  },
  (el): A11yViolation | null => {
    const toastItems = el.querySelectorAll('[role="status"], [role="alert"]');
    for (const item of Array.from(toastItems)) {
      if (!hasAccessibleName(item as HTMLElement)) {
        return {
          ruleId: 'TOAST-004',
          severity: 'warning',
          message: '存在通知条目缺少可访问名称，屏幕阅读器无法正确播报',
          suggestion: '为每条通知条目添加 aria-label 或 role="status" 配合文本内容',
        };
      }
    }
    return null;
  },
  (el): A11yViolation | null => {
    const childText = el.textContent?.trim() || '';
    if (childText.length === 0 && el.childElementCount === 0) {
      return {
        ruleId: 'TOAST-005',
        severity: 'warning',
        message: '通知容器当前无文本内容，屏幕阅读器不会播报任何信息',
        suggestion: '确保通知消息在容器内有文本内容，或动态添加后再触发检查',
      };
    }
    return null;
  },
];

function checkChildAccessibility(el: HTMLElement): A11yViolation[] {
  const violations: A11yViolation[] = [];

  const allDescendants = el.querySelectorAll('*');
  for (const desc of Array.from(allDescendants)) {
    const descEl = desc as HTMLElement;
    const tag = descEl.tagName.toLowerCase();

    if (tag === 'img') {
      if (!descEl.hasAttribute('alt')) {
        violations.push({
          ruleId: 'CHILD-001',
          severity: 'error',
          message: `子元素 <img> 缺少 alt 属性（src="${(descEl as HTMLImageElement).src?.substring(0, 30) || ''}"）`,
          suggestion: '为所有 <img> 添加 alt 属性，装饰性图片使用 alt=""',
        });
      }
    }

    if (tag === 'a') {
      const anchorEl = descEl as HTMLAnchorElement;
      const hasHref = anchorEl.hasAttribute('href');
      if (hasHref && !hasAccessibleName(anchorEl)) {
        violations.push({
          ruleId: 'CHILD-002',
          severity: 'error',
          message: '子元素 <a> 缺少可访问名称（空链接）',
          suggestion: '为 <a> 添加文本内容、aria-label 或 title 属性',
        });
      }
    }

    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      const inputEl = descEl as HTMLElement & { type?: string; id?: string };
      const inputType = (inputEl.type || '').toLowerCase();
      if (inputType === 'hidden' || inputType === 'submit' || inputType === 'button') {
        // 这些类型不需要 label
      } else {
        const hasLabel =
          inputEl.hasAttribute('aria-label') ||
          inputEl.hasAttribute('aria-labelledby') ||
          inputEl.hasAttribute('title') ||
          (inputEl.id && document.querySelector(`label[for="${inputEl.id}"]`));
        if (!hasLabel) {
          violations.push({
            ruleId: 'CHILD-003',
            severity: 'error',
            message: `子元素 <${tag}> 缺少关联标签（未绑定 label 或 aria-label）`,
            suggestion: '为表单元素添加 aria-label、aria-labelledby 或关联 <label for="...">',
          });
        }
      }
    }

    if (tag === 'button') {
      if (!hasAccessibleName(descEl)) {
        violations.push({
          ruleId: 'CHILD-004',
          severity: 'error',
          message: '子元素 <button> 缺少可访问名称（空按钮）',
          suggestion: '为按钮添加文本内容或 aria-label 属性',
        });
      }
    }

    if (tag === 'iframe') {
      if (!descEl.hasAttribute('title') || descEl.getAttribute('title')!.trim().length === 0) {
        violations.push({
          ruleId: 'CHILD-005',
          severity: 'error',
          message: '子元素 <iframe> 缺少 title 属性，屏幕阅读器无法告知 iframe 内容',
          suggestion: '为 <iframe> 添加描述其内容的 title 属性',
        });
      }
    }

    if (descEl.hasAttribute('role')) {
      const childRoleViolations = checkGenericAriaAttributes(descEl);
      violations.push(...childRoleViolations);
    }
  }

  return violations;
}

function generateId(): string {
  return 'report-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function determineOverallStatus(violations: A11yViolation[]): Severity {
  if (violations.length === 0) return 'success';
  if (violations.some((v) => v.severity === 'error')) return 'error';
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
        violations: [
          {
            ruleId: 'GENERAL-001',
            severity: 'error',
            message: '无法获取组件 DOM 元素（element 为 null）',
            suggestion: '确保组件已正确渲染并挂载到 DOM，然后再触发检查',
          },
        ],
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
    } else if (role === 'dialog' || role === 'alertdialog') {
      rules = dialogRules;
      focusManager.pushFocus(document.activeElement as HTMLElement);
    } else if (role === 'alert' || role === 'status' || role === 'log') {
      rules = toastRules;
    }

    const genericViolations = checkGenericAriaAttributes(element);
    violations.push(...genericViolations);

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
      console.warn(
        `A11yChecker.parse took ${executionTime.toFixed(2)}ms, expected < 30ms`
      );
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
