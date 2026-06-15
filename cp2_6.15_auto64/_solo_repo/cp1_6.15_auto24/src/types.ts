export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  border: string;
  background: string;
  accent: string;
}

export interface AvatarConfig {
  hair: string;
  eyes: string;
  accessory: string;
}

export interface ElementOption {
  id: string;
  name: string;
}

export type ElementCategory = 'hair' | 'eyes' | 'accessory';
