export interface Coordinate {
  lat: number;
  lng: number;
  altitude: number;
}

export interface TrackPoint extends Coordinate {
  timestamp: number;
  speed: number;
}

export interface Note {
  id: string;
  lat: number;
  lng: number;
  text: string;
  timestamp: number;
}

export interface PlannedRoute {
  coordinates: Coordinate[];
  totalDistance: number;
  estimatedTime: number;
  waypoints: {
    start: Coordinate;
    vias: Coordinate[];
    end: Coordinate;
  };
}

export interface RideSummary {
  totalDistance: number;
  totalDuration: number;
  avgSpeed: number;
  maxSpeed: number;
  totalElevation: number;
  startPointName: string;
  endPointName: string;
}

export interface RideRecord {
  id: string;
  title: string;
  createdAt: number;
  startAt: number;
  endAt: number;
  plannedRoute: PlannedRoute;
  trackPoints: TrackPoint[];
  notes: Note[];
  summary: RideSummary;
}

export interface ChartSeries {
  xAxis: (string | number)[];
  data: number[];
}

export interface RideReport {
  id: string;
  rideId: string;
  generatedAt: number;
  summary: RideSummary;
  elevationChart: ChartSeries;
  speedChart: ChartSeries;
  notesTimeline: Note[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
