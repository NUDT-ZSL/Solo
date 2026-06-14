export type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'function'
  | 'operator'
  | 'punctuation'
  | 'tag'
  | 'attribute'
  | 'selector'
  | 'property'
  | 'value'
  | 'plain'
  | 'type'
  | 'decorator';

export interface Token {
  type: TokenType;
  value: string;
}

export type Language = 'javascript' | 'typescript' | 'python' | 'html' | 'css';

interface TokenRule {
  type: TokenType;
  pattern: RegExp;
}

const JS_KEYWORDS = [
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'null', 'of', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while',
  'with', 'yield',
];

const TS_EXTRA_KEYWORDS = [
  'abstract', 'as', 'declare', 'enum', 'implements', 'interface', 'keyof',
  'namespace', 'never', 'readonly', 'require', 'type', 'unique', 'unknown',
];

const PY_KEYWORDS = [
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from',
  'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
  'self', 'print',
];

function buildKeywordPattern(keywords: string[]): RegExp {
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  return new RegExp(`\\b(${sorted.join('|')})\\b`);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const jsRules: TokenRule[] = [
  { type: 'comment', pattern: /\/\/.*$/ },
  { type: 'comment', pattern: /\/\*[\s\S]*?\*\// },
  { type: 'string', pattern: /`(?:[^`\\]|\\.)*`/ },
  { type: 'string', pattern: /'(?:[^'\\]|\\.)*'/ },
  { type: 'string', pattern: /"(?:[^"\\]|\\.)*"/ },
  { type: 'number', pattern: /\b(?:0x[\da-fA-F]+|0o[0-7]+|0b[01]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/ },
  { type: 'keyword', pattern: buildKeywordPattern(JS_KEYWORDS) },
  { type: 'function', pattern: /\b[a-zA-Z_$][\w$]*(?=\s*\()/ },
  { type: 'operator', pattern: /[+\-*/%=<>!&|^~?:]+/ },
  { type: 'punctuation', pattern: /[{}[\]();,.]/ },
  { type: 'plain', pattern: /\b[a-zA-Z_$][\w$]*\b/ },
  { type: 'plain', pattern: /\s+/ },
  { type: 'plain', pattern: /./ },
];

const tsRules: TokenRule[] = [
  { type: 'comment', pattern: /\/\/.*$/ },
  { type: 'comment', pattern: /\/\*[\s\S]*?\*\// },
  { type: 'string', pattern: /`(?:[^`\\]|\\.)*`/ },
  { type: 'string', pattern: /'(?:[^'\\]|\\.)*'/ },
  { type: 'string', pattern: /"(?:[^"\\]|\\.)*"/ },
  { type: 'number', pattern: /\b(?:0x[\da-fA-F]+|0o[0-7]+|0b[01]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/ },
  { type: 'keyword', pattern: buildKeywordPattern([...JS_KEYWORDS, ...TS_EXTRA_KEYWORDS]) },
  { type: 'type', pattern: /\b[A-Z][a-zA-Z0-9]*\b/ },
  { type: 'decorator', pattern: /@\w+/ },
  { type: 'function', pattern: /\b[a-zA-Z_$][\w$]*(?=\s*[<(])/ },
  { type: 'operator', pattern: /[+\-*/%=<>!&|^~?:]+/ },
  { type: 'punctuation', pattern: /[{}[\]();,.]/ },
  { type: 'plain', pattern: /\b[a-zA-Z_$][\w$]*\b/ },
  { type: 'plain', pattern: /\s+/ },
  { type: 'plain', pattern: /./ },
];

const pyRules: TokenRule[] = [
  { type: 'comment', pattern: /#.*$/ },
  { type: 'comment', pattern: /'''[\s\S]*?'''/ },
  { type: 'comment', pattern: /"""[\s\S]*?"""/ },
  { type: 'string', pattern: /f"(?:[^"\\]|\\.)*"/ },
  { type: 'string', pattern: /f'(?:[^'\\]|\\.)*'/ },
  { type: 'string', pattern: /'(?:[^'\\]|\\.)*'/ },
  { type: 'string', pattern: /"(?:[^"\\]|\\.)*"/ },
  { type: 'decorator', pattern: /@\w+/ },
  { type: 'number', pattern: /\b(?:0x[\da-fA-F]+|0o[0-7]+|0b[01]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/ },
  { type: 'keyword', pattern: buildKeywordPattern(PY_KEYWORDS) },
  { type: 'function', pattern: /\b[a-zA-Z_]\w*(?=\s*\()/ },
  { type: 'operator', pattern: /[+\-*/%=<>!&|^~:]+/ },
  { type: 'punctuation', pattern: /[{}[\]();,.]/ },
  { type: 'plain', pattern: /\b[a-zA-Z_]\w*\b/ },
  { type: 'plain', pattern: /\s+/ },
  { type: 'plain', pattern: /./ },
];

const htmlRules: TokenRule[] = [
  { type: 'comment', pattern: /<!--[\s\S]*?-->/ },
  { type: 'string', pattern: /"[^"]*"/ },
  { type: 'string', pattern: /'[^']*'/ },
  { type: 'tag', pattern: /<\/?[a-zA-Z][\w-]*/ },
  { type: 'attribute', pattern: /\b[a-zA-Z-]+(?=\s*=)/ },
  { type: 'punctuation', pattern: /[/<>=]/ },
  { type: 'plain', pattern: /\s+/ },
  { type: 'plain', pattern: /[^<>"'=/\s]+/ },
  { type: 'plain', pattern: /./ },
];

const cssRules: TokenRule[] = [
  { type: 'comment', pattern: /\/\*[\s\S]*?\*\// },
  { type: 'string', pattern: /"(?:[^"\\]|\\.)*"/ },
  { type: 'string', pattern: /'(?:[^'\\]|\\.)*'/ },
  { type: 'number', pattern: /#[\da-fA-F]{3,8}\b/ },
  { type: 'number', pattern: /\b\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\b/ },
  { type: 'selector', pattern: /[.#:@][\w-]+/ },
  { type: 'property', pattern: /[\w-]+(?=\s*:)/ },
  { type: 'keyword', pattern: /@(?:media|keyframes|import|font-face|supports|layer|container)/ },
  { type: 'value', pattern: /\b(?:none|auto|inherit|initial|unset|normal|bold|italic|solid|dashed|dotted|block|inline|flex|grid|absolute|relative|fixed|sticky|center|left|right|top|bottom|hidden|visible|scroll|transparent|currentColor)\b/ },
  { type: 'punctuation', pattern: /[{}();:,]/ },
  { type: 'operator', pattern: /[>~+*]/ },
  { type: 'plain', pattern: /\s+/ },
  { type: 'plain', pattern: /./ },
];

const ruleMap: Record<Language, TokenRule[]> = {
  javascript: jsRules,
  typescript: tsRules,
  python: pyRules,
  html: htmlRules,
  css: cssRules,
};

function tokenizeLine(text: string, rules: TokenRule[]): Token[] {
  const tokens: Token[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let matched = false;
    for (const rule of rules) {
      const match = remaining.match(new RegExp(`^(?:${rule.pattern.source})`, rule.pattern.flags));
      if (match && match[0].length > 0) {
        tokens.push({ type: rule.type, value: match[0] });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: 'plain', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export class CodeTokenizer {
  static tokenize(code: string, language: Language): Token[][] {
    const rules = ruleMap[language] || jsRules;
    const lines = code.split('\n');
    return lines.map((line) => tokenizeLine(line, rules));
  }

  static tokenizeChunk(lines: string[], language: Language, startLine: number): { tokens: Token[][]; startLine: number } {
    const rules = ruleMap[language] || jsRules;
    return {
      tokens: lines.map((line) => tokenizeLine(line, rules)),
      startLine,
    };
  }

  static tokenizeAsync(code: string, language: Language, chunkSize: number = 100): Promise<Token[][]> {
    const lines = code.split('\n');
    const totalLines = lines.length;

    if (totalLines <= chunkSize) {
      return Promise.resolve(CodeTokenizer.tokenize(code, language));
    }

    return new Promise((resolve) => {
      const result: Token[][] = new Array(totalLines);
      let processed = 0;

      const processChunk = () => {
        const start = processed;
        const end = Math.min(start + chunkSize, totalLines);
        const chunk = lines.slice(start, end);

        const { tokens } = CodeTokenizer.tokenizeChunk(chunk, language, start);
        for (let i = 0; i < tokens.length; i++) {
          result[start + i] = tokens[i];
        }

        processed = end;

        if (processed < totalLines) {
          setTimeout(processChunk, 0);
        } else {
          resolve(result);
        }
      };

      processChunk();
    });
  }
}
