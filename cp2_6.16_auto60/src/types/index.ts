export enum WalletStyle {
  SHORT_FOLD = 'short_fold',
  LONG_ZIPPER = 'long_zipper',
  COIN_POUCH = 'coin_pouch',
}

export type StitchType = 'single' | 'double' | 'cross'

export interface IWalletSettings {
  style: WalletStyle
  color: string
  texture: string
  stitchType: StitchType
}

export enum EventType {
  SETTINGS_CHANGE = 'settingsChange',
}

export type EventHandler<T = unknown> = (data: T) => void

export interface IExportParams {
  styleName: string
  colorHex: string
  textureName: string
  stitchType: string
  timestamp: number
}

export const WALLET_STYLE_NAMES: Record<WalletStyle, string> = {
  [WalletStyle.SHORT_FOLD]: '短款两折',
  [WalletStyle.LONG_ZIPPER]: '长款拉链',
  [WalletStyle.COIN_POUCH]: '硬币卡包',
}

export const TEXTURE_NAMES: Record<string, string> = {
  cross: '十字纹',
  litchi: '荔枝纹',
  grain: '粒面纹',
  wax: '油蜡纹',
}

export const STITCH_NAMES: Record<StitchType, string> = {
  single: '单直线',
  double: '双直线',
  cross: 'X形交叉',
}

export const LEATHER_COLORS = [
  '#8B4513',
  '#A0522D',
  '#CD853F',
  '#D2691E',
  '#B8860B',
  '#2F4F4F',
  '#1C1C1C',
  '#4A4A4A',
  '#8B0000',
  '#556B2F',
  '#191970',
  '#4B0082',
]

export const TEXTURE_OPTIONS = [
  { value: 'cross', label: '十字纹' },
  { value: 'litchi', label: '荔枝纹' },
  { value: 'grain', label: '粒面纹' },
  { value: 'wax', label: '油蜡纹' },
]

export const STITCH_OPTIONS = [
  { value: 'single' as StitchType, label: '单直线' },
  { value: 'double' as StitchType, label: '双直线' },
  { value: 'cross' as StitchType, label: 'X形交叉' },
]

export const STYLE_OPTIONS = [
  { value: WalletStyle.SHORT_FOLD, label: '短款两折' },
  { value: WalletStyle.LONG_ZIPPER, label: '长款拉链' },
  { value: WalletStyle.COIN_POUCH, label: '硬币卡包' },
]
