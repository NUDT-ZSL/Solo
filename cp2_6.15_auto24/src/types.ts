export type TokenType = 'color' | 'font' | 'spacing' | 'shadow' | 'other';

export interface BaseToken {
  name: string;
  type: TokenType;
  value: string;
  description?: string;
}

export interface ColorToken extends BaseToken {
  type: 'color';
  value: string;
}

export interface FontToken extends BaseToken {
  type: 'font';
  value: string;
  fontFamily: string;
  fontSize: string;
  fontWeight?: number;
  lineHeight?: number;
}

export interface SpacingToken extends BaseToken {
  type: 'spacing';
  value: string;
  pixelValue?: number;
}

export interface ShadowToken extends BaseToken {
  type: 'shadow';
  value: string;
}

export interface OtherToken extends BaseToken {
  type: 'other';
}

export type DesignToken = ColorToken | FontToken | SpacingToken | ShadowToken | OtherToken;

export interface NormalizedTokens {
  color: ColorToken[];
  font: FontToken[];
  spacing: SpacingToken[];
  shadow: ShadowToken[];
  other: OtherToken[];
}

export interface TokenSelection {
  [tokenName: string]: boolean;
}

export interface CategoryState {
  [category: string]: boolean;
}
