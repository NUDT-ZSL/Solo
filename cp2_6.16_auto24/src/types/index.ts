export interface CardElement {
  id: string;
  type: 'photo' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  content: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  borderRadius?: number;
  rotation?: number;
  opacity?: number;
}

export interface EffectsConfig {
  isSparkleEnabled: boolean;
  isPetalEnabled: boolean;
  isGlowEnabled: boolean;
  isRotateEnabled: boolean;
  isTextBlinkEnabled: boolean;
}

export interface Card {
  id: number;
  user_id: number;
  template_id: number;
  elements: CardElement[];
  effects: EffectsConfig;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  user_id: number;
  name: string;
  email: string;
  avatar: string;
}

export interface User {
  id: number;
  email: string;
  nickname: string;
}

export interface Template {
  id: number;
  name: string;
  category: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  decorations: string[];
}

export interface SendRecord {
  id: number;
  cardId: number;
  senderId: number;
  senderName: string;
  receiverEmail: string;
  sendTime: string;
  linkToken: string;
  isViewed: boolean;
  card: Card;
}
