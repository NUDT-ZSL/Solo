export interface ReviewDoc {
  _id?: string;
  exchangeId: string;
  skillId: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  toUserId: string;
  rating: number;
  comment: string;
  anonymous: boolean;
  createdAt: number;
}
