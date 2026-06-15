import type {
  DesignToken,
  NormalizedTokens,
  ColorToken,
  FontToken,
  SpacingToken,
  ShadowToken,
  OtherToken,
  TokenType,
} from './types';

const COLOR_PATTERNS = [
  /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
  /^rgb\(/i,
  /^rgba\(/i,
  /^hsl\(/i,
  /^hsla\(/i,
];

const FONT_KEYWORDS = ['font', 'fontfamily', 'fontsize', 'fontweight', 'lineheight', 'typography', 'letter-spacing'];
const SPACING_KEYWORDS = ['spacing', 'space', 'gap', 'padding', 'margin', 'radius', 'width', 'height', 'size'];
const SHADOW_KEYWORDS = ['shadow', 'boxshadow'];

function inferTokenTypeFromName(name: string): TokenType | null {
  const lower = name.toLowerCase();
  const segments = lower.split(/[.\-_/]/);

  for (const seg of segments) {
    if (FONT_KEYWORDS.includes(seg)) return 'font';
    if (SPACING_KEYWORDS.includes(seg)) return 'spacing';
    if (SHADOW_KEYWORDS.includes(seg)) return 'shadow';
  }

  return null;
}

function inferTokenType(name: string, value: string): TokenType {
  const nameHint = inferTokenTypeFromName(name);
  if (nameHint) return nameHint;

  const trimmed = value.trim();

  if (COLOR_PATTERNS.some((p) => p.test(trimmed))) {
    return 'color';
  }

  if (/^\d+(\.\d+)?(px|rem|em|vh|vw|%|ch)$/.test(trimmed)) {
    return 'spacing';
  }

  if (/^0$/.test(trimmed)) {
    return 'spacing';
  }

  return 'other';
}

function parsePixelValue(value: string): number | undefined {
  const pxMatch = value.match(/^(\d+\.?\d*)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);
  const remMatch = value.match(/^(\d+\.?\d*)rem$/);
  if (remMatch) return parseFloat(remMatch[1]) * 16;
  const emMatch = value.match(/^(\d+\.?\d*)em$/);
  if (emMatch) return parseFloat(emMatch[1]) * 16;
  const numMatch = value.match(/^(\d+\.?\d*)$/);
  if (numMatch) return parseFloat(numMatch[1]);
  return undefined;
}

function createToken(path: string, value: string, type?: TokenType): DesignToken {
  const tokenType = type || inferTokenType(path, value);
  const name = path;

  switch (tokenType) {
    case 'color':
      return { name, path, type: 'color', value } as ColorToken;
    case 'font':
      return {
        name,
        path,
        type: 'font',
        value,
        fontFamily: value,
        fontSize: value,
      } as FontToken;
    case 'spacing':
      return {
        name,
        path,
        type: 'spacing',
        value,
        pixelValue: parsePixelValue(value),
      } as SpacingToken;
    case 'shadow':
      return { name, path, type: 'shadow', value } as ShadowToken;
    default:
      return { name, path, type: 'other', value } as OtherToken;
  }
}

function isLeafValue(val: unknown): val is string | number | boolean {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}

function traverseDeep(
  obj: unknown,
  parentPath: string[],
  tokens: DesignToken[],
  parentTypeHint?: TokenType
): void {
  if (obj === null || obj === undefined) return;

  if (isLeafValue(obj)) {
    const fullPath = parentPath.join('.');
    const value = String(obj);
    const type = parentTypeHint || inferTokenType(fullPath, value);
    tokens.push(createToken(fullPath, value, type));
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (item !== null && item !== undefined) {
        const segKey = String(index);
        if (isLeafValue(item)) {
          const fullPath = [...parentPath, segKey].join('.');
          const value = String(item);
          const type = parentTypeHint || inferTokenType(fullPath, value);
          tokens.push(createToken(fullPath, value, type));
        } else {
          traverseDeep(item, [...parentPath, segKey], tokens, parentTypeHint);
        }
      }
    });
    return;
  }

  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;

    if ('name' in record && 'value' in record && typeof record.value !== 'object') {
      const tokenName = String(record.name);
      const tokenValue = String(record.value);
      const type = ('type' in record && typeof record.type === 'string')
        ? (record.type as TokenType)
        : inferTokenType(tokenName, tokenValue);
      const fullPath = parentPath.length > 0
        ? [...parentPath, tokenName].join('.')
        : tokenName;
      tokens.push(createToken(fullPath, tokenValue, type));
      return;
    }

    if ('tokens' in record && Array.isArray(record.tokens)) {
      for (const token of record.tokens) {
        if (token && typeof token === 'object') {
          const t = token as Record<string, unknown>;
          if ('name' in t && 'value' in t && typeof t.value !== 'object') {
            const tokenName = String(t.name);
            const tokenValue = String(t.value);
            const type = ('type' in t && typeof t.type === 'string')
              ? (t.type as TokenType)
              : inferTokenType(tokenName, tokenValue);
            const fullPath = [...parentPath, tokenName].join('.');
            tokens.push(createToken(fullPath, tokenValue, type));
          } else {
            traverseDeep(token, parentPath, tokens, parentTypeHint);
          }
        }
      }
      return;
    }

    if ('value' in record && typeof record.value !== 'object') {
      const key = parentPath[parentPath.length - 1] || '';
      const tokenValue = String(record.value);
      const type = ('type' in record && typeof record.type === 'string')
        ? (record.type as TokenType)
        : inferTokenType(key, tokenValue);
      const fullPath = parentPath.join('.');
      tokens.push(createToken(fullPath, tokenValue, type));
      return;
    }

    for (const key of Object.keys(record)) {
      const val = record[key];
      const childPath = [...parentPath, key];
      const keyTypeHint = inferTokenTypeFromName(key);
      const childTypeHint = keyTypeHint || parentTypeHint;

      traverseDeep(val, childPath, tokens, childTypeHint || undefined);
    }
  }
}

export function parseDesignTokens(rawData: unknown): NormalizedTokens {
  const tokens: DesignToken[] = [];
  traverseDeep(rawData, [], tokens);

  const normalized: NormalizedTokens = {
    color: [],
    font: [],
    spacing: [],
    shadow: [],
    other: [],
  };

  for (const token of tokens) {
    switch (token.type) {
      case 'color':
        normalized.color.push(token);
        break;
      case 'font':
        normalized.font.push(token);
        break;
      case 'spacing':
        normalized.spacing.push(token);
        break;
      case 'shadow':
        normalized.shadow.push(token);
        break;
      default:
        normalized.other.push(token);
        break;
    }
  }

  return normalized;
}

export function updateTokenValue(
  tokens: NormalizedTokens,
  tokenName: string,
  newValue: string
): NormalizedTokens {
  const result: NormalizedTokens = {
    color: [],
    font: [],
    spacing: [],
    shadow: [],
    other: [],
  };

  for (const category of Object.keys(result) as TokenType[]) {
    result[category] = tokens[category].map((token) => {
      if (token.name === tokenName) {
        const updated = { ...token, value: newValue };
        if (token.type === 'spacing') {
          (updated as SpacingToken).pixelValue = parsePixelValue(newValue);
        }
        return updated;
      }
      return token;
    }) as never[];
  }

  return result;
}

export function getAllTokens(tokens: NormalizedTokens): DesignToken[] {
  return [
    ...tokens.color,
    ...tokens.font,
    ...tokens.spacing,
    ...tokens.shadow,
    ...tokens.other,
  ];
}
