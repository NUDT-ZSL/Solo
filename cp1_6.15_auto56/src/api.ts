import { v4 as uuidv4 } from 'uuid';
import { Activity, Plant, Bid, User } from './types';
import { getMockActivities, getCurrentUser } from './mockData';

let activities: Activity[] = JSON.parse(JSON.stringify(getMockActivities()));

function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export function fetchActivities(): Promise<ApiResponse<Activity[]>> {
  return delay({ success: true, data: activities });
}

export function fetchActivity(id: string): Promise<ApiResponse<Activity>> {
  const activity = activities.find(a => a.id === id);
  if (!activity) {
    return delay({ success: false, message: '活动不存在' });
  }
  return delay({ success: true, data: activity });
}

export interface CreateActivityRequest {
  name: string;
  date: Date;
  location: string;
  description: string;
}

export function createActivity(req: CreateActivityRequest): Promise<ApiResponse<Activity>> {
  const currentUser = getCurrentUser();
  const newActivity: Activity = {
    id: uuidv4(),
    name: req.name,
    date: req.date,
    location: req.location,
    description: req.description,
    status: 'upcoming',
    organizerId: currentUser.id,
    plants: [],
  };
  activities.unshift(newActivity);
  return delay({ success: true, data: newActivity }, 500);
}

export interface CreatePlantRequest {
  activityId: string;
  name: string;
  variety: string;
  description: string;
  photoUrl: string;
  startPrice: number;
}

export function createPlant(req: CreatePlantRequest): Promise<ApiResponse<Plant>> {
  const activity = activities.find(a => a.id === req.activityId);
  if (!activity) {
    return delay({ success: false, message: '活动不存在' }, 500);
  }
  if (req.startPrice < 0 || req.startPrice > 1000) {
    return delay({ success: false, message: '起拍价格必须在0至1000元之间' }, 500);
  }
  const currentUser = getCurrentUser();
  const newPlant: Plant = {
    id: uuidv4(),
    name: req.name,
    variety: req.variety,
    description: req.description,
    photoUrl: req.photoUrl,
    startPrice: req.startPrice,
    currentPrice: req.startPrice,
    highestBidder: null,
    sellerId: currentUser.id,
    activityId: req.activityId,
    status: 'active',
    bidHistory: [],
  };
  activity.plants.push(newPlant);
  return delay({ success: true, data: newPlant }, 500);
}

export interface PlaceBidRequest {
  plantId: string;
  activityId: string;
  amount: number;
}

export function placeBid(req: PlaceBidRequest): Promise<ApiResponse<Plant>> {
  const activity = activities.find(a => a.id === req.activityId);
  if (!activity) {
    return delay({ success: false, message: '活动不存在' });
  }
  if (activity.status !== 'ongoing') {
    return delay({ success: false, message: '活动未进行中，无法出价' });
  }
  const plant = activity.plants.find(p => p.id === req.plantId);
  if (!plant) {
    return delay({ success: false, message: '植物不存在' });
  }
  if (plant.status !== 'active') {
    return delay({ success: false, message: '该植物已成交，无法出价' });
  }
  if (req.amount < plant.currentPrice + 1) {
    return delay({ success: false, message: `出价必须高于当前价格${plant.currentPrice}元（至少高1元）` });
  }
  const currentUser = getCurrentUser();
  const bid: Bid = {
    id: uuidv4(),
    userId: currentUser.id,
    userName: currentUser.name,
    amount: req.amount,
    timestamp: new Date(),
  };
  plant.bidHistory.push(bid);
  plant.currentPrice = req.amount;
  plant.highestBidder = currentUser.name;
  return delay({ success: true, data: plant }, 200);
}

export function endActivity(activityId: string): Promise<ApiResponse<Activity>> {
  const activity = activities.find(a => a.id === activityId);
  if (!activity) {
    return delay({ success: false, message: '活动不存在' });
  }
  activity.status = 'ended';
  activity.plants.forEach(p => {
    if (p.highestBidder) {
      p.status = 'sold';
    }
  });
  return delay({ success: true, data: activity });
}

export function fetchCurrentUser(): Promise<ApiResponse<User>> {
  return delay({ success: true, data: getCurrentUser() });
}
