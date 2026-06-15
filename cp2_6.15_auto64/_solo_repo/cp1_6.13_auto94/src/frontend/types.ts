export interface Collectible {
  _id: string;
  name: string;
  series: string;
  purchaseDate: string;
  price: number;
  status: 'new' | 'opened' | 'swap';
  notes: string;
  image: string;
  thumbnail: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface SwapRequest {
  _id: string;
  collectibleId: string;
  collectibleName: string;
  requester: string;
  owner: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'swap_request' | 'swap_accepted' | 'swap_rejected';
  swapRequestId: string;
  collectibleName: string;
  fromUser: string;
  read: boolean;
  createdAt: string;
}

export type StatusType = 'new' | 'opened' | 'swap';

export const statusLabels: Record<StatusType, string> = {
  new: '全新',
  opened: '拆封',
  swap: '待交换'
};
