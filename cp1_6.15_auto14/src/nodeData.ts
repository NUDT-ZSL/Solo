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
    (code) => code.includes('<h1>') && code.includes('</h1>'),
    [
      makeNode(
        'CSS 基础',
        '为 h1 添加红色文字样式',
        'css',
        'h1 {\n  \n}',
        (code) => code.includes('color') && (code.includes('red') || code.includes('#ff0000') || code.includes('#f00')),
        [
          makeNode(
            'Flexbox 布局',
            '使用 display:flex 将子元素水平居中',
            'css',
            '.container {\n  display: flex;\n  \n}',
            (code) => code.includes('justify-content') && code.includes('center'),
          ),
          makeNode(
            'CSS Grid',
            '创建一个 3 列等宽网格布局',
            'css',
            '.grid {\n  display: grid;\n  \n}',
            (code) => code.includes('grid-template-columns') && code.includes('1fr'),
          ),
        ]
      ),
      makeNode(
        '表格与列表',
        '创建一个包含两行数据的 HTML 表格',
        'html',
        '<table>\n  \n</table>',
        (code) => code.includes('<tr>') && code.includes('<td>'),
        [
          makeNode(
            '表单元素',
            '创建一个包含输入框和提交按钮的表单',
            'html',
            '<form>\n  \n</form>',
            (code) => code.includes('<input') && code.includes('type="submit"'),
          ),
        ]
      ),
      makeNode(
        'JavaScript 入门',
        '使用 console.log 输出 Hello World',
        'javascript',
        '// 在下方输出 Hello World\n',
        (code) => code.includes('console.log') && code.includes('Hello'),
        [
          makeNode(
            '变量与类型',
            '声明一个 const 变量并赋值为数字 42',
            'javascript',
            '// 声明一个 const 变量\n',
            (code) => code.includes('const') && code.includes('42'),
            [
              makeNode(
                '函数基础',
                '编写一个返回两数之和的 add 函数',
                'javascript',
                'function add(a, b) {\n  \n}\n',
                (code) => code.includes('return') && code.includes('a') && code.includes('b'),
              ),
            ]
          ),
          makeNode(
            'DOM 操作',
            '使用 querySelector 选中一个元素',
            'javascript',
            '// 使用 querySelector 选中 .box 元素\n',
            (code) => code.includes('querySelector'),
            [
              makeNode(
                '事件监听',
                '为按钮添加 click 事件监听器',
                'javascript',
                'const btn = document.querySelector("button");\n// 为 btn 添加 click 事件\n',
                (code) => code.includes('addEventListener') && code.includes('click'),
              ),
              makeNode(
                '异步编程',
                '使用 async/await 获取数据',
                'javascript',
                'async function fetchData() {\n  // 使用 fetch 获取数据\n}\n',
                (code) => code.includes('await') && code.includes('fetch'),
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
