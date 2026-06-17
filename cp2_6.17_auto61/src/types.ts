export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number;
  estimatedArrival: string;
  note: string;
  order: number;
}

export interface SupplyPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  waterLiters: number;
  foodPortions: number;
  addedAt: string;
  approved: boolean;
  addedBy: string;
}

export interface Activity {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  totalDistance: number;
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
  waypoints: Waypoint[];
  supplyPoints: SupplyPoint[];
  status: 'planning' | 'active' | 'completed';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface WSMessage {
  type: 'ROUTE_UPDATE' | 'SUPPLY_POINT_ADD' | 'SUPPLY_POINT_APPROVE' | 'SUPPLY_POINT_REJECT' | 'ACTIVITY_STATUS' | 'MEMBER_JOIN' | 'MEMBER_GPS';
  payload: any;
  activityId: string;
  senderId: string;
}
