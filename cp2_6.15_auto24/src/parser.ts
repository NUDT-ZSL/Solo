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
  /^rgb/i,
  /^rgba/i,
  /^hsl/i,
  /^hsla/i,
];

const FONT_KEYWORDS = ['font', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'typography'];
const SPACING_KEYWORDS = ['spacing', 'space', 'gap', 'padding', 'margin', 'p-', 'm-'];
const SHADOW_KEYWORDS = ['shadow', 'boxShadow'];

function inferTokenType(name: string, value: string): TokenType {
  const lowerName = name.toLowerCase();

  if (COLOR_PATTERNS.some((p) => p.test(value.trim()))) {
    return 'color';
  }

  if (FONT_KEYWORDS.some((k) => lowerName.includes(k.toLowerCase()))) {
    return 'font';
  }

  if (SPACING_KEYWORDS.some((k) => lowerName.includes(k.toLowerCase()))) {
    return 'spacing';
  }

  if (SHADOW_KEYWORDS.some((k) => lowerName.includes(k.toLowerCase()))) {
    return 'shadow';
  }

  if (/^-?\d+(\.\d+)?(px|rem|em|vh|vw|%)?$/.test(value.trim())) {
    return 'spacing';
  }

  if (/^['"]?[\w\s,-]+['"]?$/.test(value.trim()) && lowerName.includes('font')) {
    return 'font';
  }

  return 'other';
}

function isValidColor(value: string): boolean {
  return COLOR_PATTERNS.some((p) => p.test(value.trim()));
}

function parsePixelValue(value: string): number | undefined {
  const match = value.match(/^-?(\d+\.?\d*)px$/);
  if (match) {
    return parseFloat(match[1]);
  }
  const remMatch = value.match(/^-?(\d+\.?\d*)rem$/);
  if (remMatch) {
    return parseFloat(remMatch[1]) * 16;
  }
  return undefined;
}

function createToken(name: string, value: string, type?: TokenType): DesignToken {
  const tokenType = type || inferTokenType(name, value);

  switch (tokenType) {
    case 'color':
      return {
        name,
        type: 'color',
        value: isValidColor(value) ? value : value,
      } as ColorToken;

    case 'font':
      return {
        name,
        type: 'font',
        value,
        fontFamily: value,
        fontSize: value,
      } as FontToken;

    case 'spacing':
      return {
        name,
        type: 'spacing',
        value,
        pixelValue: parsePixelValue(value),
      } as SpacingToken;

    case 'shadow':
      return {
        name,
        type: 'shadow',
        value,
      } as ShadowToken;

    default:
      return {
        name,
        type: 'other',
        value,
      } as OtherToken;
  }
}

function traverseObject(
  obj: unknown,
  path: string,
  tokens: DesignToken[],
  typeHint?: TokenType
): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    const value = String(obj);
    const type = typeHint || inferTokenType(path, value);
    tokens.push(createToken(path, value, type));
    return;
  }

  if (Array.isArray(obj)) {
    if (path && typeof obj[0] === 'object' && obj[0] !== null) {
      obj.forEach((item, index) => {
        traverseObject(item, `${path}-${index}`, tokens);
      });
    }
    return;
  }

  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;

    if ('name' in record && 'value' in record) {
      const type = ('type' in record ? (record.type as TokenType) : undefined) ||
        inferTokenType(String(record.name), String(record.value));
      tokens.push(createToken(String(record.name), String(record.value), type));
      return;
    }

    if ('tokens' in record && Array.isArray(record.tokens)) {
      record.tokens.forEach((token) => {
        if (token && typeof token === 'object') {
          const t = token as Record<string, unknown>;
          if ('name' in t && 'value' in t) {
            const type = ('type' in t ? (t.type as TokenType) : undefined) ||
              inferTokenType(String(t.name), String(t.value));
            tokens.push(createToken(String(t.name), String(t.value), type));
          }
        }
      });
      return;
    }

    for (const key of Object.keys(record)) {
      const newPath = path ? `${path}-${key}` : key;
      const value = record[key];
      const keyType = inferTokenType(key, '');
      const childType = keyType !== 'other' ? keyType : typeHint;
      traverseObject(value, newPath, tokens, childType);
    }
  }
}

export function parseDesignTokens(rawData: unknown): NormalizedTokens {
  const tokens: DesignToken[] = [];
  traverseObject(rawData, '', tokens);

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
