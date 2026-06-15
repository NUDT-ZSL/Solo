import * as d3 from 'd3';
import { eventBus, EVENTS } from './utils/EventBus';
import { dataProcessor } from './DataProcessor';

export interface ProjectedStation {
  id: string;
  x: number;
  y: number;
}

class MapLayer {
  private projection: d3.GeoProjection | null = null;
  private bounds: { width: number; height: number } = { width: 30, height: 30 };

  init(width: number = 30, height: number = 30): void {
    this.bounds = { width, height };
    this.setupProjection();
    this.projectStations();

    eventBus.on(EVENTS.STATION_POSITIONS_UPDATED, this.handlePositionsUpdate.bind(this));
  }

  private setupProjection(): void {
    const stations = dataProcessor.getStations();
    if (stations.length === 0) return;

    const lats = stations.map((s) => s.lat);
    const lngs = stations.map((s) => s.lng);

    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);

    const scaleFactor = Math.min(
      (this.bounds.width * 0.7) / lngRange,
      (this.bounds.height * 0.7) / latRange
    ) * 111;

    this.projection = d3
      .geoMercator()
      .center([centerLng, centerLat])
      .scale(scaleFactor * 1000)
      .translate([this.bounds.width / 2, this.bounds.height / 2]);
  }

  private handlePositionsUpdate(positions: { id: string; lat: number; lng: number }[]): void {
    this.projectStations();
  }

  projectStations(): ProjectedStation[] {
    if (!this.projection) return [];

    const stations = dataProcessor.getStations();
    const projected: ProjectedStation[] = stations.map((station) => {
      const coords = this.projection!([station.lng, station.lat]);
      const x = coords ? coords[0] - this.bounds.width / 2 : 0;
      const y = coords ? this.bounds.height / 2 - coords[1] : 0;

      dataProcessor.setStationPosition(station.id, x, y);

      return { id: station.id, x, y };
    });

    return projected;
  }

  project(lng: number, lat: number): { x: number; y: number } | null {
    if (!this.projection) return null;
    const coords = this.projection([lng, lat]);
    if (!coords) return null;
    return {
      x: coords[0] - this.bounds.width / 2,
      y: this.bounds.height / 2 - coords[1],
    };
  }

  setBounds(width: number, height: number): void {
    this.bounds = { width, height };
    if (this.projection) {
      this.projection.translate([width / 2, height / 2]);
    }
  }
}

export const mapLayer = new MapLayer();
