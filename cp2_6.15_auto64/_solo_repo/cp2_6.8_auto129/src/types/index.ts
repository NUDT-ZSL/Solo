export interface Block {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
}

export type DisplayValue = 'flex' | 'grid' | 'block' | 'inline-block';
export type PositionValue = 'static' | 'relative' | 'absolute' | 'fixed';
export type FlexDirectionValue = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type JustifyContentValue =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';
export type AlignItemsValue =
  | 'stretch'
  | 'center'
  | 'flex-start'
  | 'flex-end'
  | 'baseline';

export interface LayoutConfig {
  display: DisplayValue;
  position: PositionValue;
  flexDirection?: FlexDirectionValue;
  justifyContent?: JustifyContentValue;
  alignItems?: AlignItemsValue;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
}
