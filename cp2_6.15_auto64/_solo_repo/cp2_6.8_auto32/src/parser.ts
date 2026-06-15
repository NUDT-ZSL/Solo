import { parse, ParserOptions } from 'acorn';
import * as walk from 'acorn-walk';
import type { GraphNode, GraphLink, RefactorSuggestion, ParseResult, NodeType } from './types';

interface Node extends Record<string, unknown> {
  type: string;
  start: number;
  end: number;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

const MAX_NEST_DEPTH = 3;
const MAX_FUNC_LINES = 20;

function genId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function getLoc(node: unknown, source: string): { startLine: number; endLine: number; snippet: string } {
  const n = node as Node;
  const startLine = n.loc?.start.line ?? 1;
  const endLine = n.loc?.end.line ?? startLine;
  const lines = source.split('\n');
  const snippet = lines
    .slice(startLine - 1, endLine)
    .join('\n')
    .trim();
  return { startLine, endLine, snippet };
}

function extractFunctionName(node: unknown): string {
  const n = node as Record<string, unknown>;
  if (n.id && typeof n.id === 'object' && n.id !== null && 'name' in n.id) {
    return (n.id as { name: string }).name || '(anonymous)';
  }
  return '(anonymous)';
}

function extractVarName(node: unknown): string {
  const n = node as Record<string, unknown>;
  if (n.id && typeof n.id === 'object' && n.id !== null && 'name' in n.id) {
    return (n.id as { name: string }).name;
  }
  if (n.declarations && Array.isArray(n.declarations) && n.declarations.length > 0) {
    const decl = n.declarations[0] as Record<string, unknown>;
    if (decl.id && typeof decl.id === 'object' && decl.id !== null && 'name' in decl.id) {
      return (decl.id as { name: string }).name;
    }
  }
  return 'var';
}

interface WalkState {
  nodes: GraphNode[];
  links: GraphLink[];
  suggestions: RefactorSuggestion[];
  parentStack: string[];
  callStack: GraphNode[];
  funcStack: GraphNode[];
  source: string;
  nodeIdMap: Map<unknown, string>;
  functionBodyLines: Map<string, number>;
  duplicateCalls: Map<string, { count: number; node: GraphNode }[]>;
}

export function parseCode(source: string): ParseResult {
  const result: ParseResult = {
    nodes: [],
    links: [],
    suggestions: []
  };

  try {
    const options: ParserOptions = {
      ecmaVersion: 2020,
      sourceType: 'module',
      locations: true
    };

    const ast = parse(source, options) as unknown as Node;

    const state: WalkState = {
      nodes: [],
      links: [],
      suggestions: [],
      parentStack: [],
      funcStack: [],
      source,
      nodeIdMap: new Map(),
      functionBodyLines: new Map(),
      duplicateCalls: new Map()
    };

    const simpleWalk(ast, state);

    result.nodes = state.nodes;
    result.links = state.links;
    result.suggestions = state.suggestions;

    detectDuplicateCalls(state, result);

    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }
}

function simpleWalk(node: unknown, state: WalkState): void {
  const visitors: Record<string, (n: unknown, state: WalkState) => void> = {
    FunctionDeclaration: visitFunction,
    FunctionExpression: visitFunction,
    ArrowFunctionExpression: visitFunction,
    VariableDeclaration: visitVariable,
    IfStatement: visitBranch,
    SwitchStatement: visitBranch,
    ForStatement: visitLoop,
    ForInStatement: visitLoop,
    ForOfStatement: visitLoop,
    WhileStatement: visitLoop,
    DoWhileStatement: visitLoop,
    CallExpression: visitCall
  };

  const walkNode = (n: unknown, st: WalkState) => {
    const nObj = n as Record<string, unknown>;
    const type = nObj.type as string;
    if (visitors[type]) {
      visitors[type](n, st);
    }

    const keys = ['body', 'consequent', 'alternate', 'init', 'test', 'update', 'left', 'right', 'expression', 'arguments', 'declarations', 'cases'];
    for (const key of keys) {
      const child = nObj[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          walkNode(c, st);
        }
      } else if (child && typeof child === 'object') {
        walkNode(child, st);
      }
    }
  };

  walkNode(node, state);
}

function visitFunction(node: unknown, state: WalkState): void {
  const n = node as Record<string, unknown>;
  const { startLine, endLine, snippet } = getLoc(node, state.source);
  const nodeId = genId();
  const name = extractFunctionName(node);
  const funcNode: GraphNode = {
    id: nodeId,
    type: 'function',
    name,
    startLine,
    endLine,
    snippet
  };

  state.nodes.push(funcNode);
  state.nodeIdMap.set(node, nodeId);

  if (state.funcStack.length > 0) {
    const parent = state.funcStack[state.funcStack.length - 1];
    state.links.push({
      source: parent.id,
      target: nodeId,
      type: 'control'
    });
  }

  state.funcStack.push(funcNode);

  const bodyLines = endLine - startLine + 1;
  if (bodyLines > MAX_FUNC_LINES) {
    state.suggestions.push({
      id: genId(),
      type: 'long-function',
      severity: 'warning',
      message: `函数 "${name}" 超过${bodyLines}行，建议抽取子函数`,
      startLine,
      endLine,
      snippet
    });
  }

  state.functionBodyLines.set(nodeId, bodyLines);

  const body = n.body;
  if (body) {
    checkNestingDepth(body, state, 0, funcNode);
  }

  state.funcStack.pop();
}

function checkNestingDepth(node: unknown, state: WalkState, depth: number, parentFunc: GraphNode): void {
  if (depth > MAX_NEST_DEPTH) {
    const { startLine, endLine, snippet } = getLoc(node, state.source);
    const alreadySuggested = state.suggestions.some(
      s => s.type === 'deep-nesting' && s.startLine === startLine
    );
    if (!alreadySuggested) {
      state.suggestions.push({
        id: genId(),
        type: 'deep-nesting',
        severity: 'warning',
        message: `嵌套深度达 ${depth} 层，建议拆分逻辑`,
        startLine,
        endLine,
        snippet
      });
    }
  }

  const n = node as Record<string, unknown>;
  const type = n.type as string;
  const nestedTypes = ['IfStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement', 'SwitchStatement', 'TryStatement'];

  if (nestedTypes.includes(type)) {
    depth++;
  }

  const keys = ['body', 'consequent', 'alternate', 'block', 'handler', 'finalizer', 'cases'];
  for (const key of keys) {
    const child = n[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c && typeof c === 'object') {
          checkNestingDepth(c, state, depth, parentFunc);
        }
      }
    } else if (child && typeof child === 'object') {
      checkNestingDepth(child, state, depth, parentFunc);
    }
  }
}

function visitVariable(node: unknown, state: WalkState): void {
  const { startLine, endLine, snippet } = getLoc(node, state.source);
  const nodeId = genId();
  const name = extractVarName(node);
  const varNode: GraphNode = {
    id: nodeId,
    type: 'variable',
    name,
    startLine,
    endLine,
    snippet
  };
  state.nodes.push(varNode);
  state.nodeIdMap.set(node, nodeId);

  if (state.funcStack.length > 0) {
    const parent = state.funcStack[state.funcStack.length - 1];
    state.links.push({
      source: parent.id,
      target: nodeId,
      type: 'data'
    });
    varNode.parentId = parent.id;
  }
}

function visitBranch(node: unknown, state: WalkState): void {
  const { startLine, endLine, snippet } = getLoc(node, state.source);
  const nodeId = genId();
  const n = node as Record<string, unknown>;
  const type = (n.type as string) === 'SwitchStatement' ? 'switch' : 'if';
  const branchNode: GraphNode = {
    id: nodeId,
    type: 'branch',
    name: type,
    startLine,
    endLine,
    snippet
  };
  state.nodes.push(branchNode);
  state.nodeIdMap.set(node, nodeId);

  if (state.funcStack.length > 0) {
    const parent = state.funcStack[state.funcStack.length - 1];
    state.links.push({
      source: parent.id,
      target: nodeId,
      type: 'control'
    });
  }
}

function visitLoop(node: unknown, state: WalkState): void {
  const { startLine, endLine, snippet } = getLoc(node, state.source);
  const nodeId = genId();
  const n = node as Record<string, unknown>;
  const type = n.type as string;
  let name = 'loop';
  if (type === 'ForStatement') name = 'for';
  else if (type === 'ForInStatement') name = 'for-in';
  else if (type === 'ForOfStatement') name = 'for-of';
  else if (type === 'WhileStatement') name = 'while';
  else if (type === 'DoWhileStatement') name = 'do-while';

  const loopNode: GraphNode = {
    id: nodeId,
    type: 'loop',
    name,
    startLine,
    endLine,
    snippet
  };
  state.nodes.push(loopNode);
  state.nodeIdMap.set(node, nodeId);

  if (state.funcStack.length > 0) {
    const parent = state.funcStack[state.funcStack.length - 1];
    state.links.push({
      source: parent.id,
      target: nodeId,
      type: 'control'
    });
  }
}

function visitCall(node: unknown, state: WalkState): void {
  const n = node as Record<string, unknown>;
  const callee = n.callee as Record<string, unknown>;
  if (!callee) return;

  let calleeName = '()';
  if ('name' in callee && typeof callee.name === 'string') {
    calleeName = callee.name;
  } else if ('property' in callee && callee.property && typeof callee.property === 'object') {
    const prop = callee.property as { name?: string };
    if (prop.name) {
      calleeName = prop.name;
    }
  }

  const { startLine, endLine, snippet } = getLoc(node, state.source);
  const callId = genId();
  const callNode: GraphNode = {
    id: callId,
    type: 'call',
    name: calleeName + '()',
    startLine,
    endLine,
    snippet
  };
  state.nodes.push(callNode);
  state.nodeIdMap.set(node, callId);

  if (state.funcStack.length > 0) {
    const parent = state.funcStack[state.funcStack.length - 1];
    state.links.push({
      source: parent.id,
      target: callId,
      type: 'call'
    });

    if (!state.duplicateCalls.has(calleeName)) {
      state.duplicateCalls.set(calleeName, []);
    }
    state.duplicateCalls.get(calleeName)!.push({ count: 0, node: callNode });
  }
}

function detectDuplicateCalls(state: WalkState, result: ParseResult): void {
  const seen = new Map<string, GraphNode[]>();
  for (const node of state.nodes) {
    if (node.type === 'call') {
      const name = node.name;
      if (!seen.has(name)) {
        seen.set(name, []);
      }
      seen.get(name)!.push(node);
    }
  }

  for (const [name, nodes] of seen.entries()) {
    if (nodes.length >= 2 && name !== '()') {
      for (const node of nodes) {
        result.suggestions.push({
          id: genId(),
          type: 'duplicate-call',
          severity: 'info',
          message: `存在多个 "${name}" 被调用 ${nodes.length} 次，建议合并公共逻辑`,
          startLine: node.startLine,
          endLine: node.endLine,
          snippet: node.snippet
        });
      }
    }
  }
}
