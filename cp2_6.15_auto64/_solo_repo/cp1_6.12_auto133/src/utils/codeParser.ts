import { GraphNode, GraphEdge, GraphData, Language } from '../types';

const JS_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof',
  'instanceof', 'void', 'this', 'super', 'class', 'extends', 'import', 'export',
  'default', 'from', 'as', 'const', 'let', 'var', 'function', 'async', 'await',
  'yield', 'of', 'in', 'true', 'false', 'null', 'undefined', 'console', 'Math',
  'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise', 'Map',
  'Set', 'Date', 'RegExp', 'Error', 'parseInt', 'parseFloat', 'isNaN',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'require',
  'module', 'exports', 'document', 'window', 'process',
]);

const PY_KEYWORDS = new Set([
  'if', 'else', 'elif', 'for', 'while', 'do', 'switch', 'case', 'break',
  'continue', 'return', 'try', 'except', 'finally', 'raise', 'new', 'del',
  'class', 'def', 'import', 'from', 'as', 'with', 'and', 'or', 'not', 'is',
  'in', 'True', 'False', 'None', 'lambda', 'yield', 'pass', 'assert',
  'global', 'nonlocal', 'async', 'await', 'print', 'len', 'range', 'str',
  'int', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance',
  'self', 'super', 'open', 'input', 'abs', 'max', 'min', 'sum', 'round',
  'sorted', 'enumerate', 'zip', 'map', 'filter', 'hasattr', 'getattr',
  'setattr', 'property', 'staticmethod', 'classmethod',
]);

function parseJavaScript(code: string): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const lines = code.split('\n');
  const functionDefs = new Map<string, { line: number; endLine: number; id: string }>();
  const variableDefs = new Map<string, { line: number; id: string }>();
  const moduleDefs = new Map<string, { line: number; id: string }>();
  const allNames = new Map<string, string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const funcDeclMatch = line.match(/\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
    if (funcDeclMatch) {
      const name = funcDeclMatch[1];
      const id = `fn_${name}_${lineNum}`;
      if (!allNames.has(name)) {
        functionDefs.set(name, { line: lineNum, endLine: -1, id });
        allNames.set(name, id);
        nodes.push({ id, label: name, type: 'function', line: lineNum, inDegree: 0 });
      }
    }

    const arrowMatch = line.match(/\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/);
    if (arrowMatch) {
      const name = arrowMatch[1];
      const id = `fn_${name}_${lineNum}`;
      if (!allNames.has(name)) {
        functionDefs.set(name, { line: lineNum, endLine: -1, id });
        allNames.set(name, id);
        nodes.push({ id, label: name, type: 'function', line: lineNum, inDegree: 0 });
      }
    }

    const funcExprMatch = line.match(/\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function/);
    if (funcExprMatch) {
      const name = funcExprMatch[1];
      const id = `fn_${name}_${lineNum}`;
      if (!allNames.has(name)) {
        functionDefs.set(name, { line: lineNum, endLine: -1, id });
        allNames.set(name, id);
        nodes.push({ id, label: name, type: 'function', line: lineNum, inDegree: 0 });
      }
    }

    const methodMatch = line.match(/^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[{=]/);
    if (methodMatch && !line.match(/\b(?:if|else|for|while|switch|catch|return|const|let|var|function)\b/)) {
      const name = methodMatch[1];
      const id = `fn_${name}_${lineNum}`;
      if (!allNames.has(name) && !JS_KEYWORDS.has(name)) {
        functionDefs.set(name, { line: lineNum, endLine: -1, id });
        allNames.set(name, id);
        nodes.push({ id, label: name, type: 'function', line: lineNum, inDegree: 0 });
      }
    }

    const varMatch = line.match(/\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
    if (varMatch) {
      const name = varMatch[1];
      if (!allNames.has(name) && !functionDefs.has(name)) {
        const id = `var_${name}_${lineNum}`;
        variableDefs.set(name, { line: lineNum, id });
        allNames.set(name, id);
        nodes.push({ id, label: name, type: 'variable', line: lineNum, inDegree: 0 });
      }
    }

    const importFromMatch = line.match(/import\s+.*?from\s+['"]([^'"]+)['"]/);
    if (importFromMatch) {
      const modName = importFromMatch[1];
      const id = `mod_${modName.replace(/[/.@-]/g, '_')}_${lineNum}`;
      if (!moduleDefs.has(modName)) {
        moduleDefs.set(modName, { line: lineNum, id });
        nodes.push({ id, label: modName, type: 'module', line: lineNum, inDegree: 0 });
      }
    }

    const importDirectMatch = line.match(/import\s+['"]([^'"]+)['"]/);
    if (importDirectMatch && !importFromMatch) {
      const modName = importDirectMatch[1];
      const id = `mod_${modName.replace(/[/.@-]/g, '_')}_${lineNum}`;
      if (!moduleDefs.has(modName)) {
        moduleDefs.set(modName, { line: lineNum, id });
        nodes.push({ id, label: modName, type: 'module', line: lineNum, inDegree: 0 });
      }
    }

    const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      const modName = requireMatch[1];
      const id = `mod_${modName.replace(/[/.@-]/g, '_')}_${lineNum}`;
      if (!moduleDefs.has(modName)) {
        moduleDefs.set(modName, { line: lineNum, id });
        nodes.push({ id, label: modName, type: 'module', line: lineNum, inDegree: 0 });
      }
    }
  }

  const funcScopes: Array<{ name: string; startLine: number; endLine: number; id: string }> = [];
  for (const [name, def] of functionDefs) {
    let braceCount = 0;
    let started = false;
    let endLine = lines.length;
    for (let i = def.line - 1; i < lines.length; i++) {
      const line = lines[i];
      const stripped = line.replace(/\/\/.*$|\/\*[\s\S]*?\*\//g, '');
      const opens = (stripped.match(/{/g) || []).length;
      const closes = (stripped.match(/}/g) || []).length;
      if (opens > 0) started = true;
      braceCount += opens - closes;
      if (started && braceCount <= 0) {
        endLine = i + 1;
        break;
      }
    }
    funcScopes.push({ name, startLine: def.line, endLine, id: def.id });
  }

  for (const scope of funcScopes) {
    for (let i = scope.startLine - 1; i < scope.endLine && i < lines.length; i++) {
      const line = lines[i];
      const callMatches = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g);
      for (const match of callMatches) {
        const callee = match[1];
        if (JS_KEYWORDS.has(callee) || callee === scope.name) continue;
        const calleeId = allNames.get(callee);
        if (calleeId && (functionDefs.has(callee) || variableDefs.has(callee))) {
          const edgeKey = `${scope.id}->${calleeId}`;
          if (!edges.some(e => `${e.source}->${e.target}` === edgeKey)) {
            edges.push({
              source: scope.id,
              target: calleeId,
              type: functionDefs.has(callee) ? 'call' : 'dependency',
            });
          }
        }
      }

      const moduleRefs = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g);
      for (const match of moduleRefs) {
        const ref = match[1];
        if (JS_KEYWORDS.has(ref) || ref === scope.name) continue;
      }
    }

    for (const [modName, modDef] of moduleDefs) {
      const importLine = lines[modDef.line - 1] || '';
      const aliasMatch = importLine.match(/import\s+(?:{[^}]*}|\*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|([a-zA-Z_$][a-zA-Z0-9_$]*))\s+from/);
      const requireAliasMatch = importLine.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*require/);
      const alias = aliasMatch?.[1] || aliasMatch?.[2] || requireAliasMatch?.[1];
      if (alias) {
        const sourceId = allNames.get(alias) || (functionDefs.has(scope.name) ? scope.id : null);
        if (sourceId) {
          const edgeKey = `${sourceId}->${modDef.id}`;
          if (!edges.some(e => `${e.source}->${e.target}` === edgeKey)) {
            edges.push({ source: sourceId, target: modDef.id, type: 'import' });
          }
        }
      }
    }
  }

  for (const [modName, modDef] of moduleDefs) {
    const importLine = lines[modDef.line - 1] || '';
    const importItems = importLine.match(/import\s+{([^}]+)}/);
    if (importItems) {
      const items = importItems[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
      for (const item of items) {
        const itemId = allNames.get(item);
        if (itemId) {
          edges.push({ source: modDef.id, target: itemId, type: 'import' });
        }
      }
    }
  }

  for (const edge of edges) {
    const targetNode = nodes.find(n => n.id === edge.target);
    if (targetNode) targetNode.inDegree++;
  }

  return { nodes, edges };
}

function parsePython(code: string): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const lines = code.split('\n');
  const functionDefs = new Map<string, { line: number; endLine: number; indent: number; id: string }>();
  const variableDefs = new Map<string, { line: number; id: string }>();
  const moduleDefs = new Map<string, { line: number; id: string }>();
  const allNames = new Map<string, string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const indent = line.search(/\S/);

    const funcMatch = line.match(/^(\s*)def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (funcMatch) {
      const name = funcMatch[2];
      const id = `fn_${name}_${lineNum}`;
      if (!allNames.has(name)) {
        functionDefs.set(name, { line: lineNum, endLine: -1, indent, id });
        allNames.set(name, id);
        nodes.push({ id, label: name, type: 'function', line: lineNum, inDegree: 0 });
      }
    }

    const classMatch = line.match(/^(\s*)class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (classMatch) {
      const name = classMatch[2];
      const id = `fn_${name}_${lineNum}`;
      if (!allNames.has(name)) {
        functionDefs.set(name, { line: lineNum, endLine: -1, indent, id });
        allNames.set(name, id);
        nodes.push({ id, label: name, type: 'function', line: lineNum, inDegree: 0 });
      }
    }

    const varMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=[^=]/);
    if (varMatch && indent === 0) {
      const name = varMatch[1];
      if (!allNames.has(name) && !PY_KEYWORDS.has(name)) {
        const id = `var_${name}_${lineNum}`;
        variableDefs.set(name, { line: lineNum, id });
        allNames.set(name, id);
        nodes.push({ id, label: name, type: 'variable', line: lineNum, inDegree: 0 });
      }
    }

    const importMatch = line.match(/^import\s+([a-zA-Z_][a-zA-Z0-9_.]*)/);
    if (importMatch) {
      const modName = importMatch[1];
      const id = `mod_${modName.replace(/[/.@-]/g, '_')}_${lineNum}`;
      if (!moduleDefs.has(modName)) {
        moduleDefs.set(modName, { line: lineNum, id });
        nodes.push({ id, label: modName, type: 'module', line: lineNum, inDegree: 0 });
      }
    }

    const fromImportMatch = line.match(/^from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import/);
    if (fromImportMatch) {
      const modName = fromImportMatch[1];
      const id = `mod_${modName.replace(/[/.@-]/g, '_')}_${lineNum}`;
      if (!moduleDefs.has(modName)) {
        moduleDefs.set(modName, { line: lineNum, id });
        nodes.push({ id, label: modName, type: 'module', line: lineNum, inDegree: 0 });
      }
    }
  }

  for (const [name, def] of functionDefs) {
    let endLine = lines.length;
    for (let i = def.line; i < lines.length; i++) {
      const nextIndent = lines[i].search(/\S/);
      if (nextIndent >= 0 && nextIndent <= def.indent && lines[i].trim().length > 0) {
        endLine = i;
        break;
      }
    }
    def.endLine = endLine;

    for (let i = def.line - 1; i < endLine && i < lines.length; i++) {
      const line = lines[i];
      const callMatches = line.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g);
      for (const match of callMatches) {
        const callee = match[1];
        if (PY_KEYWORDS.has(callee) || callee === name) continue;
        const calleeId = allNames.get(callee);
        if (calleeId && (functionDefs.has(callee) || variableDefs.has(callee))) {
          const edgeKey = `${def.id}->${calleeId}`;
          if (!edges.some(e => `${e.source}->${e.target}` === edgeKey)) {
            edges.push({
              source: def.id,
              target: calleeId,
              type: functionDefs.has(callee) ? 'call' : 'dependency',
            });
          }
        }
      }
    }
  }

  for (const [modName, modDef] of moduleDefs) {
    const importLine = lines[modDef.line - 1] || '';
    const fromImportItems = importLine.match(/from\s+[a-zA-Z_][a-zA-Z0-9_.]*\s+import\s+(.+)/);
    if (fromImportItems) {
      const items = fromImportItems[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
      for (const item of items) {
        const itemId = allNames.get(item);
        if (itemId) {
          edges.push({ source: modDef.id, target: itemId, type: 'import' });
        }
      }
    }
  }

  for (const edge of edges) {
    const targetNode = nodes.find(n => n.id === edge.target);
    if (targetNode) targetNode.inDegree++;
  }

  return { nodes, edges };
}

function parseHTML(code: string): GraphData {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  const allNodes: GraphNode[] = [];
  const allEdges: GraphEdge[] = [];

  let match;
  while ((match = scriptRegex.exec(code)) !== null) {
    const jsCode = match[1];
    const result = parseJavaScript(jsCode);
    allNodes.push(...result.nodes);
    allEdges.push(...result.edges);
  }

  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const linkMatch = line.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (linkMatch) {
      const src = linkMatch[1];
      const id = `mod_${src.replace(/[/.@-]/g, '_')}_${lineNum}`;
      allNodes.push({ id, label: src, type: 'module', line: lineNum, inDegree: 0 });
    }
    const scriptSrcMatch = line.match(/<script[^>]+src=["']([^"']+)["']/i);
    if (scriptSrcMatch) {
      const src = scriptSrcMatch[1];
      const id = `mod_${src.replace(/[/.@-]/g, '_')}_${lineNum}`;
      allNodes.push({ id, label: src, type: 'module', line: lineNum, inDegree: 0 });
    }
  }

  return { nodes: allNodes, edges: allEdges };
}

export function parseCode(code: string, language: Language): GraphData {
  if (!code.trim()) return { nodes: [], edges: [] };
  switch (language) {
    case 'javascript':
      return parseJavaScript(code);
    case 'python':
      return parsePython(code);
    case 'html':
      return parseHTML(code);
    default:
      return { nodes: [], edges: [] };
  }
}
