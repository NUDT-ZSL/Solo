import * as d3 from 'd3-scale';
import * as THREE from 'three';

export const SPEED_COLOR_SCALE = d3
  .scaleLinear<[number, number, number]>()
  .domain([0, 30, 60, 80])
  .range([
    [1.0, 0.267, 0.267],
    [1.0, 0.667, 0.0],
    [0.267, 1.0, 0.267],
    [0.267, 1.0, 0.267],
  ])
  .clamp(true);

export const HEATMAP_COLOR_SCALE = d3
  .scaleLinear<[number, number, number]>()
  .domain([0, 500, 800, 1000])
  .range([
    [0.0, 0.4, 1.0],
    [0.0, 0.8, 1.0],
    [1.0, 1.0, 0.0],
    [1.0, 0.0, 0.0],
  ])
  .clamp(true);

export function speedToColor(speed: number): THREE.Color {
  const [r, g, b] = SPEED_COLOR_SCALE(speed);
  return new THREE.Color(r, g, b);
}

export function speedToRGB(speed: number): [number, number, number] {
  return SPEED_COLOR_SCALE(speed);
}

export function flowToHeatmapColor(flow: number): [number, number, number] {
  return HEATMAP_COLOR_SCALE(flow);
}

export function flowToHeatmapRadius(flow: number): number {
  const normalizedFlow = Math.min(flow / 1000, 1);
  return 30 + normalizedFlow * 20;
}

export function sizeBySpeed(speed: number): number {
  const normalized = Math.min(speed / 80, 1);
  return 2 + normalized * 2;
}
