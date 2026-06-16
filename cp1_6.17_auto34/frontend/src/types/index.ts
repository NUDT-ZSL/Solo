export interface User {
  id: string;
  nickname: string;
  avatar: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SpecialDrink {
  id: string;
  name: string;
  baristaNote: string;
  flavorTags: {
    acidity: number;
    sweetness: number;
    bitterness: number;
  };
  limitedCount: number;
  price: number;
  imageColor: string;
}

export interface OrderItem {
  userId: string;
  userName: string;
  drinkId: string;
  drinkName: string;
}

export interface GroupOrder {
  id: string;
  initiatorId: string;
  initiatorName: string;
  targetDrinkId: string;
  targetDrinkName: string;
  participants: OrderItem[];
  maxParticipants: number;
  deadline: number;
  tableNumber: number;
  status: 'active' | 'completed' | 'timeout';
  createdAt: number;
}

export interface HiddenMenu {
  id: string;
  name: string;
  story: string;
  imageSvg: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  hiddenMenu: HiddenMenu;
  likes: string[];
  createdAt: number;
}

export interface CreateOrderData {
  targetDrinkId: string;
  targetDrinkName: string;
  duration: number;
  tableNumber: number;
}

export interface FlavorAnswer {
  question: number;
  answer: string;
}

export interface RecommendedDrink {
  id: string;
  name: string;
  region: string;
  roast: string;
  brew: string;
  desc: string;
}
