import { ConditionNode, SimpleCondition, CompositeCondition } from '../types';

type Variables = Record<string, number | string | boolean>;

enum TokenType {
  VARIABLE,
  NUMBER,
  STRING,
  BOOLEAN,
  OP_EQ,
  OP_NEQ,
  OP_GTE,
  OP_LTE,
  OP_GT,
  OP_LT,
  OP_AND,
  OP_OR,
  OP_NOT,
  LPAREN,
  RPAREN,
  EOF,
}

interface Token {
  type: TokenType;
  value: string;
}

class Tokenizer {
  private input: string;
  private pos: number = 0;

  constructor(input: string) {
    this.input = input.trim();
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const ch = this.input[this.pos];

      if (ch === '(') { tokens.push({ type: TokenType.LPAREN, value: '(' }); this.pos++; continue; }
      if (ch === ')') { tokens.push({ type: TokenType.RPAREN, value: ')' }); this.pos++; continue; }

      if (ch === '=' && this.peek(1) === '=') { tokens.push({ type: TokenType.OP_EQ, value: '==' }); this.pos += 2; continue; }
      if (ch === '!' && this.peek(1) === '=') { tokens.push({ type: TokenType.OP_NEQ, value: '!=' }); this.pos += 2; continue; }
      if (ch === '>' && this.peek(1) === '=') { tokens.push({ type: TokenType.OP_GTE, value: '>=' }); this.pos += 2; continue; }
      if (ch === '<' && this.peek(1) === '=') { tokens.push({ type: TokenType.OP_LTE, value: '<=' }); this.pos += 2; continue; }
      if (ch === '>' && this.peek(1) !== '=') { tokens.push({ type: TokenType.OP_GT, value: '>' }); this.pos++; continue; }
      if (ch === '<' && this.peek(1) !== '=') { tokens.push({ type: TokenType.OP_LT, value: '<' }); this.pos++; continue; }

      if (ch === '&' && this.peek(1) === '&') { tokens.push({ type: TokenType.OP_AND, value: '&&' }); this.pos += 2; continue; }
      if (ch === '|' && this.peek(1) === '|') { tokens.push({ type: TokenType.OP_OR, value: '||' }); this.pos += 2; continue; }
      if (ch === '!') { tokens.push({ type: TokenType.OP_NOT, value: '!' }); this.pos++; continue; }

      if (ch === '"' || ch === "'") {
        tokens.push(this.readString());
        continue;
      }

      if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peek(1)))) {
        tokens.push(this.readNumber());
        continue;
      }

      if (this.isAlpha(ch) || ch === '_' || ch === '.') {
        tokens.push(this.readIdentifier());
        continue;
      }

      this.pos++;
    }

    tokens.push({ type: TokenType.EOF, value: '' });
    return tokens;
  }

  private peek(offset: number): string {
    const idx = this.pos + offset;
    return idx < this.input.length ? this.input[idx] : '';
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private isDigit(ch: string): boolean { return /[0-9]/.test(ch); }
  private isAlpha(ch: string): boolean { return /[a-zA-Z_\u4e00-\u9fff]/.test(ch); }

  private readString(): Token {
    const quote = this.input[this.pos];
    this.pos++;
    let value = '';
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      value += this.input[this.pos];
      this.pos++;
    }
    if (this.pos < this.input.length) this.pos++;
    return { type: TokenType.STRING, value };
  }

  private readNumber(): Token {
    let value = '';
    if (this.input[this.pos] === '-') { value += '-'; this.pos++; }
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
      value += this.input[this.pos];
      this.pos++;
    }
    if (this.pos < this.input.length && this.input[this.pos] === '.') {
      value += '.';
      this.pos++;
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
        value += this.input[this.pos];
        this.pos++;
      }
    }
    return { type: TokenType.NUMBER, value };
  }

  private readIdentifier(): Token {
    let value = '';
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (this.isAlpha(ch) || this.isDigit(ch) || ch === '_' || ch === '.') {
        value += ch;
        this.pos++;
      } else {
        break;
      }
    }

    const lower = value.toLowerCase();
    if (lower === 'and') return { type: TokenType.OP_AND, value: '&&' };
    if (lower === 'or') return { type: TokenType.OP_OR, value: '||' };
    if (lower === 'not') return { type: TokenType.OP_NOT, value: '!' };
    if (lower === 'true') return { type: TokenType.BOOLEAN, value: 'true' };
    if (lower === 'false') return { type: TokenType.BOOLEAN, value: 'false' };

    return { type: TokenType.VARIABLE, value };
  }
}

class ExprParser {
  private tokens: Token[];
  private pos: number = 0;
  private variables: Variables;

  constructor(tokens: Token[], variables: Variables) {
    this.tokens = tokens;
    this.variables = variables;
  }

  parse(): boolean {
    const result = this.parseOr();
    return result;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: TokenType.EOF, value: '' };
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private parseOr(): boolean {
    let left = this.parseAnd();
    while (this.current().type === TokenType.OP_OR) {
      this.advance();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  private parseAnd(): boolean {
    let left = this.parseNot();
    while (this.current().type === TokenType.OP_AND) {
      this.advance();
      const right = this.parseNot();
      left = left && right;
    }
    return left;
  }

  private parseNot(): boolean {
    if (this.current().type === TokenType.OP_NOT) {
      this.advance();
      return !this.parseNot();
    }
    return this.parseComparison();
  }

  private parseComparison(): boolean {
    if (this.current().type === TokenType.LPAREN) {
      this.advance();
      const result = this.parseOr();
      if (this.current().type === TokenType.RPAREN) {
        this.advance();
      }
      return result;
    }

    const left = this.parseValue();

    const op = this.current();
    if (
      op.type === TokenType.OP_EQ ||
      op.type === TokenType.OP_NEQ ||
      op.type === TokenType.OP_GTE ||
      op.type === TokenType.OP_LTE ||
      op.type === TokenType.OP_GT ||
      op.type === TokenType.OP_LT
    ) {
      this.advance();
      const right = this.parseValue();
      return this.compare(left, right, op.type);
    }

    return this.toBoolean(left);
  }

  private parseValue(): any {
    const token = this.current();

    switch (token.type) {
      case TokenType.NUMBER:
        this.advance();
        return Number(token.value);
      case TokenType.STRING:
        this.advance();
        return token.value;
      case TokenType.BOOLEAN:
        this.advance();
        return token.value === 'true';
      case TokenType.VARIABLE:
        this.advance();
        return this.resolveVariable(token.value);
      case TokenType.LPAREN: {
        this.advance();
        const result = this.parseOr();
        if (this.current().type === TokenType.RPAREN) {
          this.advance();
        }
        return result;
      }
      case TokenType.OP_NOT:
        return this.parseNot();
      default:
        this.advance();
        return undefined;
    }
  }

  private resolveVariable(path: string): any {
    const parts = path.split('.');
    let current: any = this.variables;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private compare(left: any, right: any, opType: TokenType): boolean {
    const leftNum = this.toNumber(left);
    const rightNum = this.toNumber(right);

    switch (opType) {
      case TokenType.OP_EQ: return left == right;
      case TokenType.OP_NEQ: return left != right;
      case TokenType.OP_GTE: return leftNum >= rightNum;
      case TokenType.OP_LTE: return leftNum <= rightNum;
      case TokenType.OP_GT: return leftNum > rightNum;
      case TokenType.OP_LT: return leftNum < rightNum;
      default: return true;
    }
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      const n = Number(value);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }

  private toBoolean(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0 && value !== '0' && value !== 'false';
    return Boolean(value);
  }
}

export class ConditionParser {
  private variables: Variables;

  constructor(variables: Variables) {
    this.variables = variables;
  }

  setVariables(variables: Variables): void {
    this.variables = variables;
  }

  evaluate(condition?: ConditionNode | string): boolean {
    if (!condition) return true;

    if (typeof condition === 'string') {
      return this.evaluateExpression(condition);
    }

    if ('logical' in condition) {
      return this.evaluateComposite(condition);
    }

    return this.evaluateSimple(condition);
  }

  private evaluateSimple(condition: SimpleCondition): boolean {
    const actual = this.resolveVariable(condition.variable);
    const expected = condition.value;

    switch (condition.operator) {
      case '==': return actual == expected;
      case '!=': return actual != expected;
      case '>=': return this.toNumber(actual) >= this.toNumber(expected);
      case '<=': return this.toNumber(actual) <= this.toNumber(expected);
      case '>': return this.toNumber(actual) > this.toNumber(expected);
      case '<': return this.toNumber(actual) < this.toNumber(expected);
      default: return true;
    }
  }

  private evaluateComposite(condition: CompositeCondition): boolean {
    const results = condition.conditions.map((c) => this.evaluate(c));
    if (condition.logical === 'and') {
      return results.every(Boolean);
    } else {
      return results.some(Boolean);
    }
  }

  private evaluateExpression(expr: string): boolean {
    try {
      const trimmed = expr.trim();
      if (!trimmed) return true;

      const tokenizer = new Tokenizer(trimmed);
      const tokens = tokenizer.tokenize();
      const parser = new ExprParser(tokens, this.variables);
      return parser.parse();
    } catch (e) {
      console.error(`[ConditionParser] Failed to parse expression "${expr}":`, e);
      return false;
    }
  }

  private resolveVariable(path: string): any {
    const parts = path.split('.');
    let current: any = this.variables;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      const n = Number(value);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }
}

export default ConditionParser;
