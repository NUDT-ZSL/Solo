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

export class DataLoader {
  private data: SiteData;

  constructor() {
    this.data = mockData as SiteData;
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
    const [minYear, maxYear] = this.getYearRange();
    const binSize = 100;
    const bins = d3.bin<Artifact, number>()
      .value(d => d.year)
      .domain([0, 2000])
      .thresholds(d3.range(0, 2001, binSize));

    const binned = bins(this.data.artifacts);
    return binned.map(bin => ({
      year: bin.x0 || 0,
      count: bin.length,
      artifacts: bin
    })).filter(b => b.year <= 2000);
  }
}
