export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RunningRoute {
  id: string;
  date: string;
  distance: number;
  avgPace: number;
  coordinates: RoutePoint[];
}
