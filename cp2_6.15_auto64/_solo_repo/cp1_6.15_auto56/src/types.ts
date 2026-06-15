export type ActivityStatus = 'upcoming' | 'ongoing' | 'ended';

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Plant {
  id: string;
  name: string;
  variety: string;
  description: string;
  photoUrl: string;
  startPrice: number;
  currentPrice: number;
  highestBidder: string | null;
  sellerId: string;
  activityId: string;
  status: 'active' | 'sold';
  bidHistory: Bid[];
}

export interface Bid {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  timestamp: Date;
}

export interface Activity {
  id: string;
  name: string;
  date: Date;
  location: string;
  description: string;
  status: ActivityStatus;
  plants: Plant[];
  organizerId: string;
}

export interface Favorite {
  plantId: string;
  addedAt: Date;
}
