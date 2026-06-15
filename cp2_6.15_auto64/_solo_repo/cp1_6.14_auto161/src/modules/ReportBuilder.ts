import {
  RideRecord,
  RideReport,
  RideSummary,
  TrackPoint,
  ChartSeries,
  Note,
  PlannedRoute,
} from '../types';
import { eventBus } from '../eventBus';

interface EChartsPoint {
  name: string;
  value: [number, number];
}

interface EChartsCompatibleSeries {
  xAxisTimestamps: number[];
  xAxisLabels: string[];
  numericData: number[];
  echartsPoints: EChartsPoint[];
}

class ReportBuilder {
  private static readonly MIN_ELEVATION_GAIN_M = 0.8;
  private static readonly SAMPLE_INTERVAL_SEC = 4;

  buildReport(rideRecord: RideRecord): RideReport {
    const summary = this.calculateSummary(rideRecord.trackPoints, rideRecord.plannedRoute);
    const elevationSeries = this.buildElevationSeries(rideRecord.trackPoints);
    const speedSeries = this.buildSpeedSeries(rideRecord.trackPoints);
    const notesTimeline = this.sortNotesByTime(rideRecord.notes);

    const report: RideReport = {
      id: this.generateId(),
      rideId: rideRecord.id,
      generatedAt: Date.now(),
      summary,
      elevationChart: {
        xAxis: elevationSeries.xAxisTimestamps,
        data: elevationSeries.numericData,
      } as ChartSeries,
      speedChart: {
        xAxis: speedSeries.xAxisTimestamps,
        data: speedSeries.numericData,
      } as ChartSeries,
      notesTimeline,
    };

    (report.elevationChart as any).echartsPoints = elevationSeries.echartsPoints;
    (report.elevationChart as any).xAxisLabels = elevationSeries.xAxisLabels;
    (report.speedChart as any).echartsPoints = speedSeries.echartsPoints;
    (report.speedChart as any).xAxisLabels = speedSeries.xAxisLabels;

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
    const series = this.buildElevationSeries(trackPoints);
    const result: ChartSeries = {
      xAxis: series.xAxisTimestamps,
      data: series.numericData,
    };
    (result as any).echartsPoints = series.echartsPoints;
    (result as any).xAxisLabels = series.xAxisLabels;
    return result;
  }

  buildSpeedChart(trackPoints: TrackPoint[]): ChartSeries {
    const series = this.buildSpeedSeries(trackPoints);
    const result: ChartSeries = {
      xAxis: series.xAxisTimestamps,
      data: series.numericData,
    };
    (result as any).echartsPoints = series.echartsPoints;
    (result as any).xAxisLabels = series.xAxisLabels;
    return result;
  }

  getEChartsSeriesData(
    chart: ChartSeries
  ): EChartsPoint[] {
    const typed = chart as any;
    if (typed && Array.isArray(typed.echartsPoints) && typed.echartsPoints.length > 0) {
      return typed.echartsPoints;
    }

    const timestamps = chart.xAxis as number[];
    const values = chart.data;
    const result: EChartsPoint[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      result.push({
        name: this.formatTime(timestamps[i]),
        value: [timestamps[i], values[i]],
      });
    }
    return result;
  }

  getXAxisLabels(chart: ChartSeries): string[] {
    const typed = chart as any;
    if (typed && Array.isArray(typed.xAxisLabels) && typed.xAxisLabels.length > 0) {
      return typed.xAxisLabels;
    }
    const timestamps = chart.xAxis as number[];
    return timestamps.map((t) => this.formatTime(t));
  }

  private buildElevationSeries(trackPoints: TrackPoint[]): EChartsCompatibleSeries {
    const sampled = this.downsample(trackPoints);
    const smoothed = this.smoothAltitude(sampled);

    const xAxisTimestamps: number[] = [];
    const xAxisLabels: string[] = [];
    const numericData: number[] = [];
    const echartsPoints: EChartsPoint[] = [];

    for (let i = 0; i < smoothed.length; i++) {
      const tp = smoothed[i];
      const ts = tp.timestamp;
      const alt = Math.round(tp.altitude * 10) / 10;
      const label = this.formatTime(ts);

      xAxisTimestamps.push(ts);
      xAxisLabels.push(label);
      numericData.push(alt);
      echartsPoints.push({
        name: label,
        value: [ts, alt],
      });
    }

    return { xAxisTimestamps, xAxisLabels, numericData, echartsPoints };
  }

  private buildSpeedSeries(trackPoints: TrackPoint[]): EChartsCompatibleSeries {
    const sampled = this.downsample(trackPoints);
    const smoothed = this.smoothSpeed(sampled);

    const xAxisTimestamps: number[] = [];
    const xAxisLabels: string[] = [];
    const numericData: number[] = [];
    const echartsPoints: EChartsPoint[] = [];

    for (let i = 0; i < smoothed.length; i++) {
      const tp = smoothed[i];
      const ts = tp.timestamp;
      const spd = Math.round(tp.speed * 10) / 10;
      const label = this.formatTime(ts);

      xAxisTimestamps.push(ts);
      xAxisLabels.push(label);
      numericData.push(spd);
      echartsPoints.push({
        name: label,
        value: [ts, spd],
      });
    }

    return { xAxisTimestamps, xAxisLabels, numericData, echartsPoints };
  }

  private downsample(points: TrackPoint[]): TrackPoint[] {
    if (points.length <= 300) return [...points];

    const result: TrackPoint[] = [];
    const targetCount = 280;
    const step = points.length / targetCount;

    for (let i = 0; i < targetCount; i++) {
      const idx = Math.min(points.length - 1, Math.floor(i * step));
      result.push(points[idx]);
    }

    if (result[result.length - 1] !== points[points.length - 1]) {
      result.push(points[points.length - 1]);
    }

    return result;
  }

  private smoothAltitude(points: TrackPoint[]): TrackPoint[] {
    if (points.length < 3) return points;

    const WINDOW = 5;
    const result: TrackPoint[] = [];

    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - WINDOW);
      const end = Math.min(points.length - 1, i + WINDOW);
      let sum = 0;
      let count = 0;

      for (let j = start; j <= end; j++) {
        const dist = Math.abs(j - i);
        const weight = 1 - dist / (WINDOW + 1);
        sum += points[j].altitude * weight;
        count += weight;
      }

      const smoothed = count > 0 ? sum / count : points[i].altitude;
      result.push({
        ...points[i],
        altitude: Math.round(smoothed * 10) / 10,
      });
    }

    return result;
  }

  private smoothSpeed(points: TrackPoint[]): TrackPoint[] {
    if (points.length < 3) return points;

    const WINDOW = 3;
    const result: TrackPoint[] = [];

    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - WINDOW);
      const end = Math.min(points.length - 1, i + WINDOW);
      let sum = 0;
      let count = 0;

      for (let j = start; j <= end; j++) {
        const dist = Math.abs(j - i);
        const weight = 1 - dist / (WINDOW + 1);
        sum += points[j].speed * weight;
        count += weight;
      }

      const smoothed = count > 0 ? sum / count : points[i].speed;
      result.push({
        ...points[i],
        speed: Math.max(0, Math.round(smoothed * 10) / 10),
      });
    }

    return result;
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
    return (
      (trackPoints[trackPoints.length - 1].timestamp - trackPoints[0].timestamp) /
      1000
    );
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
    if (trackPoints.length < 2) return 0;

    const alts: number[] = trackPoints.map((p) => p.altitude);

    const W = 5;
    const smoothed: number[] = [];
    for (let i = 0; i < alts.length; i++) {
      let sum = 0;
      let cnt = 0;
      for (let j = Math.max(0, i - W); j <= Math.min(alts.length - 1, i + W); j++) {
        const d = Math.abs(j - i);
        const w = 1 - d / (W + 1);
        sum += alts[j] * w;
        cnt += w;
      }
      smoothed.push(cnt > 0 ? sum / cnt : alts[i]);
    }

    let totalGain = 0;
    for (let i = 1; i < smoothed.length; i++) {
      const delta = smoothed[i] - smoothed[i - 1];
      if (delta > ReportBuilder.MIN_ELEVATION_GAIN_M) {
        totalGain += delta - ReportBuilder.MIN_ELEVATION_GAIN_M * 0.5;
      }
    }

    return Math.max(0, totalGain);
  }

  private haversineDistance(p1: TrackPoint, p2: TrackPoint): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(p1.lat)) *
        Math.cos(toRad(p2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
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
    return (
      'rpt_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).substring(2, 8)
    );
  }

  static get SAMPLE_INTERVAL(): number {
    return ReportBuilder.SAMPLE_INTERVAL_SEC;
  }
}

export const reportBuilder = new ReportBuilder();
export { ReportBuilder };
