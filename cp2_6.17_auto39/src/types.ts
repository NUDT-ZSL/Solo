export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface YearlyEmission {
  year: number;
  emission: number;
  shipCount: number;
}

export interface ShippingRoute {
  id: string;
  name: string;
  fromPort: string;
  toPort: string;
  from: RoutePoint;
  to: RoutePoint;
  distanceKm: number;
  avgShipsPerYear: number;
  totalEmissionTons: number;
  region: string;
  yearlyData: YearlyEmission[];
}

export interface EmissionAggregate {
  year: number;
  totalEmissionTons: number;
  totalShips: number;
  regionBreakdown: { region: string; emission: number }[];
}

export interface ShipInfo {
  type: string;
  count: number;
  avgEmissionPerShip: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
