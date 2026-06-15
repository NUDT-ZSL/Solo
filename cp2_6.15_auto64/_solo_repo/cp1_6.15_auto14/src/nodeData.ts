import { v4 as uuidv4 } from 'uuid';

export type NodeStatus = 'locked' | 'active' | 'completed' | 'failed';

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  template: string;
  language: 'html' | 'css' | 'javascript';
  validate: (code: string) => boolean;
  children: SkillNode[];
  status: NodeStatus;
  x: number;
  y: number;
  expanded: boolean;
}

const H_GAP = 200;
const V_GAP = 120;

function makeNode(
  title: string,
  description: string,
  language: 'html' | 'css' | 'javascript',
  template: string,
  validate: (code: string) => boolean,
  children: SkillNode[] = []
): SkillNode {
  return {
    id: uuidv4(),
    title,
    description,
    template,
    language,
    validate,
    children,
    status: 'locked',
    x: 0,
    y: 0,
    expanded: true,
  };
}

function parseHtml(html: string): Document | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    if (doc.querySelector('parsererror')) return null;
    return doc;
  } catch {
    return null;
  }
}

function validateHtmlTagExists(html: string, tagName: string, requireClosing = true): boolean {
  const lower = html.toLowerCase();
  const open = `<${tagName.toLowerCase()}`;
  const close = `</${tagName.toLowerCase()}>`;
  if (!lower.includes(open)) return false;
  if (requireClosing && !lower.includes(close)) return false;
  const doc = parseHtml(html);
  if (!doc) return false;
  return doc.querySelectorAll(tagName.toLowerCase()).length > 0;
}

function validateCssProperty(code: string, property: string, valuePattern?: RegExp): boolean {
  if (!code.includes(property)) return false;
  if (valuePattern) {
    const block = code.substring(code.indexOf(property));
    return valuePattern.test(block);
  }
  return true;
}

function validateJsContains(code: string, ...tokens: string[]): boolean {
  return tokens.every((t) => code.includes(t));
}

function layoutTree(node: SkillNode, depth: number, yOffset: { val: number }): void {
  node.x = depth * H_GAP;
  if (node.children.length === 0 || !node.expanded) {
    node.y = yOffset.val;
    yOffset.val += V_GAP;
    return;
  }
  for (const child of node.children) {
    layoutTree(child, depth + 1, yOffset);
  }
  const ys = node.children.map((c) => c.y);
  node.y = (Math.min(...ys) + Math.max(...ys)) / 2;
}

export function buildSkillTree(): SkillNode {
  const root = makeNode(
    'HTML 入门',
    '编写一个包含 h1 标题的 HTML 页面',
    'html',
    '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  \n</body>\n</html>',
    (code) => {
      if (!validateHtmlTagExists(code, 'h1')) return false;
      const doc = parseHtml(code);
      if (!doc) return false;
      const h1 = doc.querySelector('h1');
      return !!h1 && h1.textContent!.trim().length > 0;
    },
    [
      makeNode(
        'CSS 基础',
        '为 h1 添加红色文字样式',
        'css',
        'h1 {\n  \n}',
        (code) => {
          if (!validateCssProperty(code, 'color')) return false;
          const propMatch = code.match(/color\s*:\s*([^;]+)/i);
          if (!propMatch) return false;
          const val = propMatch[1].toLowerCase();
          return val.includes('red') || val.includes('#f00') || val.includes('ff0000') || val.includes('rgb(255') || val.includes('hsl(0');
        },
        [
          makeNode(
            'Flexbox 布局',
            '使用 display:flex 将子元素水平居中',
            'css',
            '.container {\n  display: flex;\n  \n}',
            (code) => {
              if (!code.includes('display') || !code.includes('flex')) return false;
              return validateCssProperty(code, 'justify-content') && code.toLowerCase().includes('center');
            },
          ),
          makeNode(
            'CSS Grid',
            '创建一个 3 列等宽网格布局',
            'css',
            '.grid {\n  display: grid;\n  \n}',
            (code) => {
              if (!code.includes('display') || !code.includes('grid')) return false;
              return validateCssProperty(code, 'grid-template-columns') && code.includes('1fr');
            },
          ),
        ]
      ),
      makeNode(
        '表格与列表',
        '创建一个包含两行数据的 HTML 表格',
        'html',
        '<table>\n  \n</table>',
        (code) => {
          if (!validateHtmlTagExists(code, 'table')) return false;
          const doc = parseHtml(code);
          if (!doc) return false;
          const trs = doc.querySelectorAll('tr');
          const tds = doc.querySelectorAll('td');
          return trs.length >= 2 && tds.length >= 2;
        },
        [
          makeNode(
            '表单元素',
            '创建一个包含输入框和提交按钮的表单',
            'html',
            '<form>\n  \n</form>',
            (code) => {
              if (!validateHtmlTagExists(code, 'form')) return false;
              const doc = parseHtml(code);
              if (!doc) return false;
              const input = doc.querySelector('input');
              const submitBtn = doc.querySelector('input[type="submit"], button[type="submit"]');
              return !!input && !!submitBtn;
            },
          ),
        ]
      ),
      makeNode(
        'JavaScript 入门',
        '使用 console.log 输出 Hello World',
        'javascript',
        '// 在下方输出 Hello World\n',
        (code) => {
          if (!validateJsContains(code, 'console', '.log(')) return false;
          const logMatch = code.match(/console\.log\s*\(\s*["'`]([^"'`]*)/);
          if (!logMatch) return false;
          return logMatch[1].includes('Hello') || logMatch[1].includes('hello');
        },
        [
          makeNode(
            '变量与类型',
            '声明一个 const 变量并赋值为数字 42',
            'javascript',
            '// 声明一个 const 变量\n',
            (code) => {
              if (!code.includes('const')) return false;
              const constMatch = code.match(/const\s+[A-Za-z_$][\w$]*\s*=\s*(\d+)/);
              return !!constMatch && constMatch[1].trim() === '42';
            },
            [
              makeNode(
                '函数基础',
                '编写一个返回两数之和的 add 函数',
                'javascript',
                'function add(a, b) {\n  \n}\n',
                (code) => {
                  if (!validateJsContains(code, 'function', 'add', 'return')) return false;
                  const fnMatch = code.match(/function\s+add\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
                  if (!fnMatch) return false;
                  const [, p1, p2] = fnMatch;
                  const returnMatch = code.match(/return\s+([^;]+)/);
                  if (!returnMatch) return false;
                  const retExpr = returnMatch[1];
                  return retExpr.includes(p1) && retExpr.includes(p2) && retExpr.includes('+');
                },
              ),
            ]
          ),
          makeNode(
            'DOM 操作',
            '使用 querySelector 选中一个元素',
            'javascript',
            '// 使用 querySelector 选中 .box 元素\n',
            (code) => validateJsContains(code, 'document', 'querySelector'),
            [
              makeNode(
                '事件监听',
                '为按钮添加 click 事件监听器',
                'javascript',
                'const btn = document.querySelector("button");\n// 为 btn 添加 click 事件\n',
                (code) => validateJsContains(code, 'addEventListener', 'click') && validateJsContains(code, 'btn'),
              ),
              makeNode(
                '异步编程',
                '使用 async/await 获取数据',
                'javascript',
                'async function fetchData() {\n  // 使用 fetch 获取数据\n}\n',
                (code) => validateJsContains(code, 'async') && validateJsContains(code, 'await') && validateJsContains(code, 'fetch'),
              ),
            ]
          ),
        ]
      ),
    ]
  );

  root.status = 'active';
  const offset = { val: 0 };
  layoutTree(root, 0, offset);
  return root;
}

export function recalcLayout(root: SkillNode): void {
  const offset = { val: 0 };
  layoutTree(root, 0, offset);
}

export function countNodes(node: SkillNode): number {
  let c = 1;
  for (const child of node.children) {
    c += countNodes(child);
  }
  return c;
}

export function countByStatus(node: SkillNode, status: NodeStatus): number {
  let c = node.status === status ? 1 : 0;
  for (const child of node.children) {
    c += countByStatus(child, status);
  }
  return c;
}

export function unlockChildren(node: SkillNode): void {
  for (const child of node.children) {
    if (child.status === 'locked') {
      child.status = 'active';
    }
  }
}

export function findNodeById(node: SkillNode, id: string): SkillNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function flattenTree(node: SkillNode): SkillNode[] {
  const result: SkillNode[] = [node];
  if (node.expanded) {
    for (const child of node.children) {
      result.push(...flattenTree(child));
    }
  }
  return result;
}

export function collectEdges(node: SkillNode): [SkillNode, SkillNode][] {
  const edges: [SkillNode, SkillNode][] = [];
  if (node.expanded) {
    for (const child of node.children) {
      edges.push([node, child]);
      edges.push(...collectEdges(child));
    }
  }
  return edges;
}

export function deepCloneTree(node: SkillNode): SkillNode {
  return {
    ...node,
    children: node.children.map(deepCloneTree),
  };
}
