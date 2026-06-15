import { saveAs } from 'file-saver';
import * as clipboard from 'clipboard-polyfill';
import type { NormalizedTokens, TokenSelection, CSSLine } from './types';
import { getAllTokens } from './parser';

function toCSSVariableName(name: string): string {
  let normalized = name
    .replace(/\./g, '-')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  normalized = `--${normalized}`;
  return normalized;
}

export function generateCSSVariables(
  tokens: NormalizedTokens,
  selection: TokenSelection
): string {
  const allTokens = getAllTokens(tokens);
  const selectedTokens = allTokens.filter((token) => selection[token.name] !== false);

  if (selectedTokens.length === 0) {
    return ':root {\n}';
  }

  const variableDeclarations = selectedTokens
    .map((token) => {
      const varName = toCSSVariableName(token.name);
      return `  ${varName}: ${token.value};`;
    })
    .join('\n');

  return `:root {\n${variableDeclarations}\n}`;
}

export function generateCSSLines(
  tokens: NormalizedTokens,
  selection: TokenSelection
): CSSLine[] {
  const allTokens = getAllTokens(tokens);
  const selectedTokens = allTokens.filter((token) => selection[token.name] !== false);

  const lines: CSSLine[] = [];

  lines.push({ token: null, content: ':root {', isVariable: false });

  for (const token of selectedTokens) {
    const varName = toCSSVariableName(token.name);
    lines.push({
      token,
      content: `  ${varName}: ${token.value};`,
      isVariable: true,
    });
  }

  lines.push({ token: null, content: '}', isVariable: false });

  return lines;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

export function downloadCSS(css: string, filename: string = 'tokens.css'): void {
  const blob = new Blob([css], { type: 'text/css;charset=utf-8' });
  saveAs(blob, filename);
}

export function highlightCSS(line: string): string {
  let result = line;

  result = result.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  result = result
    .replace(/(:root)/g, '<span style="color:#c586c0">$1</span>')
    .replace(/(--[\w-]+)/g, '<span style="color:#9cdcfe">$1</span>')
    .replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span style="color:#ce9178">$1</span>')
    .replace(/(\d+\.?\d*)(px|rem|em|vh|vw|%|ch|ms|s|deg)\b/g, '<span style="color:#b5cea8">$1$2</span>')
    .replace(/(rgba?\([^)]+\))/gi, '<span style="color:#ce9178">$1</span>')
    .replace(/(hsla?\([^)]+\))/gi, '<span style="color:#ce9178">$1</span>')
    .replace(/([{}])/g, '<span style="color:#ffd700">$1</span>');

  return result;
}
