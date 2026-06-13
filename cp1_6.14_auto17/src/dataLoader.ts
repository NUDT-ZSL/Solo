import * as d3 from 'd3';
import mockData from './data/mockData.json';

export interface Stratum {
  id: number;
  name: string;
  color: string;
  depthTop: number;
  depthBottom: number;
  period: string;
}

export interface Artifact {
  id: string;
  name: string;
  year: number;
  material: string;
  description: string;
  stratumId: number;
  position: { x: number; y: number; z: number };
  category: string;
}

export interface SiteData {
  strata: Stratum[];
  artifacts: Artifact[];
}

export interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
  data?: Artifact;
}

export interface HeatmapCell {
  col: number;
  row: number;
  count: number;
  artifacts: Artifact[];
}

const DECAY_K = 0.28;
const BASE_THICKNESS = 2.5;
const TOTAL_DEPTH = 12.0;
const STRATA_COUNT = 6;

export class DataLoader {
  private data: SiteData;
  private computedThicknesses: number[] = [];
  private computedDeppts: { top: number; bottom: number }[] = [];

  constructor() {
    this.data = mockData as SiteData;
    this.computeNonlinearDepths();
  }

  private computeNonlinearDepths(): void {
    let rawThicknesses: number[] = [];
    for (let i = 0; i < STRATA_COUNT; i++) {
      rawThicknesses.push(BASE_THICKNESS * Math.exp(-DECAY_K * i));
    }
    const sumRaw = rawThicknesses.reduce((a, b) => a + b, 0);
    this.computedThicknesses = rawThicknesses.map(t => (t / sumRaw) * TOTAL_DEPTH);
    let cumulative = 0;
    this.computedDepts = this.computedThicknesses.map(thickness => {
      const top = cumulative;
      cumulative += thickness;
      return { top, bottom: cumulative };
    });
  }

  public getComputedThickness(stratumIndex: number): number {
    return this.computedThicknesses[stratumIndex] ?? 0;
  }

  public getComputedDepth(stratumIndex: number): { top: number; bottom: number } {
    return this.computedDepts[stratumIndex] ?? { top: 0, bottom: 0 };
  }

  public getAllComputedDepths(): { top: number; bottom: number }[] {
    return this.computedDepts;
  }

  public depthToSliderValue(depth: number): number {
    const idx = this.computedDepts.findIndex(d => depth >= d.top && depth <= d.bottom);
    if (idx === -1) {
      if (depth <= 0) return 0;
      return STRATA_COUNT;
    }
    const d = this.computedDepts[idx];
    const fraction = (depth - d.top) / (d.bottom - d.top);
    return idx + fraction;
  }

  public sliderValueToDepth(value: number): number {
    const clamped = Math.max(0, Math.min(STRATA_COUNT, value));
    const idx = Math.min(Math.floor(clamped), STRATA_COUNT - 1);
    const fraction = clamped - idx;
    const d = this.computedDepts[idx];
    return d.top + fraction * (d.bottom - d.top);
  }

  public getSiteData(): SiteData {
    return this.data;
  }

  public getStrata(): Stratum[] {
    return this.data.strata;
  }

  public getArtifacts(category: string = 'all'): Artifact[] {
    if (category === 'all') return this.data.artifacts;
    return this.data.artifacts.filter(a => a.category === category);
  }

  public getArtifactById(id: string): Artifact | undefined {
    return this.data.artifacts.find(a => a.id === id);
  }

  public getArtifactsByStratum(stratumId: number): Artifact[] {
    return this.data.artifacts.filter(a => a.stratumId === stratumId);
  }

  public getArtifactsByYearRange(minYear: number, maxYear: number): Artifact[] {
    return this.data.artifacts.filter(a => a.year >= minYear && a.year <= maxYear);
  }

  public getArtifactsByDepthRange(minDepth: number, maxDepth: number): Artifact[] {
    return this.data.artifacts.filter(a => {
      const s = this.data.strata.find(st => st.id === a.stratumId);
      if (!s) return false;
      const sIdx = this.data.strata.indexOf(s);
      const computed = this.computedDepts[sIdx];
      if (!computed) return false;
      const artifactDepth = computed.top + (a.position.y - s.depthTop) / (s.depthBottom - s.depthTop) * (computed.bottom - computed.top);
      return artifactDepth >= minDepth && artifactDepth <= maxDepth;
    });
  }

  public getCategories(): string[] {
    return Array.from(new Set(this.data.artifacts.map(a => a.category)));
  }

  public getYearRange(): [number, number] {
    const years = this.data.artifacts.map(a => a.year);
    return [Math.min(...years), Math.max(...years)];
  }

  public buildHierarchy(): d3.HierarchyNode<HierarchyNode> {
    const root: HierarchyNode = { name: 'root', children: [] };
    const stratumMap = new Map<number, HierarchyNode>();

    this.data.strata.forEach(s => {
      const node: HierarchyNode = {
        name: s.name,
        children: []
      };
      stratumMap.set(s.id, node);
      root.children!.push(node);
    });

    this.data.artifacts.forEach(a => {
      const stratumNode = stratumMap.get(a.stratumId);
      if (stratumNode && stratumNode.children) {
        stratumNode.children.push({
          name: a.name,
          value: 1,
          data: a
        });
      }
    });

    return d3.hierarchy(root).sum(d => d.value || 0);
  }

  public buildTimeBins(): Array<{ year: number; count: number; artifacts: Artifact[] }> {
    const binSize = 100;
    const bins = d3.bin<Artifact, number>()
      .value(d => d.year)
      .domain([0, 2000])
      .thresholds(d3.range(0, 2001, binSize));

    const binned = bins(this.data.artifacts.filter(a => a.year <= 2000));
    return binned.map(bin => ({
      year: bin.x0 || 0,
      count: bin.length,
      artifacts: bin
    })).filter(b => b.year <= 2000);
  }

  public buildHeatmap(gridCols: number = 10, gridRows: number = 6): HeatmapCell[][] {
    const grid: HeatmapCell[][] = [];
    for (let r = 0; r < gridRows; r++) {
      grid[r] = [];
      for (let c = 0; c < gridCols; c++) {
        grid[r][c] = { col: c, row: r, count: 0, artifacts: [] };
      }
    }

    const xExtent = d3.extent(this.data.artifacts, a => a.position.x) as [number, number];
    const zExtent = d3.extent(this.data.artifacts, a => a.position.z) as [number, number];
    const xScale = d3.scaleQuantize().domain(xExtent).range(d3.range(gridCols));
    const stratumScale = d3.scaleQuantize().domain([1, STRATA_COUNT + 1]).range(d3.range(gridRows));

    this.data.artifacts.forEach(a => {
      const col = xScale(a.position.x);
      const row = stratumScale(a.stratumId);
      if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
        grid[row][col].count++;
        grid[row][col].artifacts.push(a);
      }
    });

    return grid;
  }

  public searchArtifacts(query: string, limit: number = 8): Artifact[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const scored = this.data.artifacts.map(a => {
      const name = a.name.toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else {
        for (const char of q) {
          if (name.includes(char)) score += 5;
        }
      }
      if (a.material.toLowerCase().includes(q)) score += 30;
      if (a.category.toLowerCase().includes(q)) score += 20;
      if (a.description.toLowerCase().includes(q)) score += 10;
      return { artifact: a, score };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.artifact);
  }

  public getArtifactWorldPosition(artifact: Artifact): { x: number; y: number; z: number } {
    const sIdx = this.data.strata.findIndex(s => s.id === artifact.stratumId);
    if (sIdx === -1) return artifact.position;
    const computed = this.computedDepts[sIdx];
    const origStratum = this.data.strata[sIdx];
    const yRatio = origStratum.depthBottom > origStratum.depthTop
      ? (artifact.position.y - origStratum.depthTop) / (origStratum.depthBottom - origStratum.depthTop)
      : 0.5;
    return {
      x: artifact.position.x,
      y: -(computed.top + yRatio * (computed.bottom - computed.top)),
      z: artifact.position.z
    };
  }
}
