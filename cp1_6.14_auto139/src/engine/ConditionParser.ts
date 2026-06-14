import { SimpleCondition, CompositeCondition, ConditionNode } from '../types';

type Variables = Record<string, number | string | boolean>;

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
    const { variable, operator, value } = condition;
    const actual = this.getVariableValue(variable);

    switch (operator) {
      case '==':
        return actual == value;
      case '!=':
        return actual != value;
      case '>=':
        return this.toNumber(actual) >= this.toNumber(value);
      case '<=':
        return this.toNumber(actual) <= this.toNumber(value);
      case '>':
        return this.toNumber(actual) > this.toNumber(value);
      case '<':
        return this.toNumber(actual) < this.toNumber(value);
      default:
        return true;
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
    expr = expr.trim();
    if (!expr) return true;

    const orParts = this.splitTopLevel(expr, /\s*\|\|\s*|\s+or\s+/i);
    if (orParts.length > 1) {
      return orParts.some((part) => this.evaluateExpression(part));
    }

    const andParts = this.splitTopLevel(expr, /\s*&&\s*|\s+and\s+/i);
    if (andParts.length > 1) {
      return andParts.every((part) => this.evaluateExpression(part));
    }

    if (expr.startsWith('!') || expr.toLowerCase().startsWith('not ')) {
      const inner = expr.startsWith('!') ? expr.slice(1) : expr.slice(4);
      return !this.evaluateExpression(inner);
    }

    if (expr.startsWith('(') && expr.endsWith(')')) {
      return this.evaluateExpression(expr.slice(1, -1));
    }

    return this.evaluateAtomic(expr);
  }

  private evaluateAtomic(expr: string): boolean {
    expr = expr.trim();

    const comparison = this.parseComparison(expr);
    if (comparison) {
      return this.evaluateSimple(comparison);
    }

    const value = this.getVariableValue(expr);
    return this.toBoolean(value);
  }

  private parseComparison(expr: string): SimpleCondition | null {
    const operators = [
      { regex: /^(.+?)\s*>=\s*(.+)$/, op: '>=' as const },
      { regex: /^(.+?)\s*<=\s*(.+)$/, op: '<=' as const },
      { regex: /^(.+?)\s*==\s*(.+)$/, op: '==' as const },
      { regex: /^(.+?)\s*!=\s*(.+)$/, op: '!=' as const },
      { regex: /^(.+?)\s*>\s*(.+)$/, op: '>' as const },
      { regex: /^(.+?)\s*<\s*(.+)$/, op: '<' as const },
    ];

    for (const { regex, op } of operators) {
      const match = expr.match(regex);
      if (match) {
        const variable = match[1].trim();
        const valueStr = match[2].trim();
        const value = this.parseLiteral(valueStr);
        return { variable, operator: op, value };
      }
    }

    return null;
  }

  private parseLiteral(str: string): number | string | boolean {
    if (str === 'true') return true;
    if (str === 'false') return false;
    if (str === 'null' || str === 'undefined') return 0;

    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1);
    }
    if (str.startsWith("'") && str.endsWith("'")) {
      return str.slice(1, -1);
    }

    const num = Number(str);
    if (!isNaN(num)) {
      return num;
    }

    const varValue = this.getVariableValue(str);
    if (varValue !== undefined) {
      return varValue as any;
    }

    return str;
  }

  private getVariableValue(varPath: string): number | string | boolean | undefined {
    const parts = varPath.trim().split('.');
    let current: any = this.variables;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  private splitTopLevel(expr: string, delimiter: RegExp): string[] {
    const result: string[] = [];
    let depth = 0;
    let current = '';
    let i = 0;

    while (i < expr.length) {
      const char = expr[i];

      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (depth === 0) {
        const rest = expr.slice(i);
        const match = rest.match(new RegExp('^' + delimiter.source));
        if (match) {
          if (current.trim()) {
            result.push(current.trim());
          }
          current = '';
          i += match[0].length;
          continue;
        } else {
          current += char;
        }
      } else {
        current += char;
      }
      i++;
    }

    if (current.trim()) {
      result.push(current.trim());
    }

    return result;
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

export default ConditionParser;
