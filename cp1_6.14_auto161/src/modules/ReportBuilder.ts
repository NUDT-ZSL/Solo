import { RideRecord, RideReport, RideSummary, TrackPoint, ChartSeries, Note, PlannedRoute } from '../types';
import { eventBus } from '../eventBus';

class ReportBuilder {
  buildReport(rideRecord: RideRecord): RideReport {
    const summary = this.calculateSummary(rideRecord.trackPoints, rideRecord.plannedRoute);
    const elevationChart = this.buildElevationChart(rideRecord.trackPoints);
    const speedChart = this.buildSpeedChart(rideRecord.trackPoints);
    const notesTimeline = this.sortNotesByTime(rideRecord.notes);

    const report: RideReport = {
      id: this.generateId(),
      rideId: rideRecord.id,
      generatedAt: Date.now(),
      summary,
      elevationChart,
      speedChart,
      notesTimeline,
    };

    eventBus.emit('report:generated', report);
    return report;
  }

  calculateSummary(trackPoints: TrackPoint[], _plannedRoute: PlannedRoute): RideSummary {
    if (trackPoints.length === 0) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        totalElevation: 0,
        startPointName: '起点',
        endPointName: '终点',
      };
    }

    const totalDistance = this.calculateTotalDistance(trackPoints);
    const totalDuration = this.calculateTotalDuration(trackPoints);
    const avgSpeed = totalDuration > 0 ? totalDistance / (totalDuration / 3600) : 0;
    const maxSpeed = this.calculateMaxSpeed(trackPoints);
    const totalElevation = this.calculateTotalElevation(trackPoints);

    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration: Math.round(totalDuration),
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      totalElevation: Math.round(totalElevation * 10) / 10,
      startPointName: '起点',
      endPointName: '终点',
    };
  }

  buildElevationChart(trackPoints: TrackPoint[]): ChartSeries {
    const xAxis: string[] = [];
    const data: number[] = [];

    for (const point of trackPoints) {
      xAxis.push(this.formatTime(point.timestamp));
      data.push(Math.round(point.altitude * 10) / 10);
    }

    return { xAxis, data };
  }

  buildSpeedChart(trackPoints: TrackPoint[]): ChartSeries {
    const xAxis: string[] = [];
    const data: number[] = [];

    for (const point of trackPoints) {
      xAxis.push(this.formatTime(point.timestamp));
      data.push(Math.round(point.speed * 10) / 10);
    }

    return { xAxis, data };
  }

  sortNotesByTime(notes: Note[]): Note[] {
    return [...notes].sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculateTotalDistance(trackPoints: TrackPoint[]): number {
    let total = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      total += this.haversineDistance(trackPoints[i - 1], trackPoints[i]);
    }
    return total;
  }

  private calculateTotalDuration(trackPoints: TrackPoint[]): number {
    if (trackPoints.length < 2) return 0;
    return (trackPoints[trackPoints.length - 1].timestamp - trackPoints[0].timestamp) / 1000;
  }

  private calculateMaxSpeed(trackPoints: TrackPoint[]): number {
    let max = 0;
    for (const point of trackPoints) {
      if (point.speed > max) {
        max = point.speed;
      }
    }
    return max;
  }

  private calculateTotalElevation(trackPoints: TrackPoint[]): number {
    let totalGain = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const gain = trackPoints[i].altitude - trackPoints[i - 1].altitude;
      if (gain > 0) {
        totalGain += gain;
      }
    }
    return totalGain;
  }

  private haversineDistance(p1: TrackPoint, p2: TrackPoint): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private generateId(): string {
    return 'rpt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }
}

export const reportBuilder = new ReportBuilder();
export { ReportBuilder };
