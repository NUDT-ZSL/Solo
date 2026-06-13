import * as d3 from 'd3';
import { DataLoader, Artifact } from './dataLoader';

const YEAR_DOMAIN: [number, number] = [0, 2000];
const COLOR_START = '#b91c1c';
const COLOR_END = '#facc15';
const BRUSH_TRANSITION_MS = 400;
const MIN_BAND_WIDTH = 4;
const PREFERRED_BAND_WIDTH = 12;
const AXIS_HEIGHT = 22;
const BAND_AREA_HEIGHT = 48;

type YearRangeCallback = (minYear: number, maxYear: number) => void;

export class TimelineModule {
  private container: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private dataLoader: DataLoader;
  private artifacts: Artifact[];
  private svgWidth: number;
  private currentScale: d3.ScaleLinear<number, number>;
  private zoomLevel: number = 1;
  private panOffset: number = 0;
  private brush: d3.BrushBehavior<unknown>;
  private brushGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private bandGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private axisGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private colorScale: d3.ScaleLinear<string, string>;
  private onYearRangeChange: YearRangeCallback | null = null;
  private selectedRange: [number, number] = YEAR_DOMAIN;

  constructor(svgElement: SVGSVGElement, dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
    this.artifacts = dataLoader.getArtifacts();
    this.container = d3.select(svgElement);

    const rect = svgElement.getBoundingClientRect();
    this.svgWidth = rect.width || 800;

    this.colorScale = d3.scaleLinear<string>()
      .domain(YEAR_DOMAIN)
      .range([COLOR_START, COLOR_END])
      .interpolate(d3.interpolateRgb);

    this.currentScale = d3.scaleLinear()
      .domain(YEAR_DOMAIN)
      .range([40, this.svgWidth - 20]);

    this.container.selectAll('*').remove();

    const defs = this.container.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'timeline-gradient')
      .attr('x1', '0%').attr('x2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', COLOR_START);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', COLOR_END);

    this.bandGroup = this.container.append<SVGGElement>('g').attr('class', 'band-group');
    this.axisGroup = this.container.append<SVGGElement>('g')
      .attr('class', 'timeline-axis')
      .attr('transform', `translate(0, ${BAND_AREA_HEIGHT})`);

    this.brush = d3.brushX()
      .extent([[40, 0], [this.svgWidth - 20, BAND_AREA_HEIGHT]])
      .on('brush end', (event: d3.D3BrushEvent<unknown>) => {
        if (!event.selection) return;
        const [x0, x1] = event.selection as [number, number];
        const year0 = this.currentScale.invert(x0);
        const year1 = this.currentScale.invert(x1);
        this.selectedRange = [year0, year1];
        if (this.onYearRangeChange) {
          this.onYearRangeChange(year0, year1);
        }
      });

    this.brushGroup = this.container.append<SVGGElement>('g')
      .attr('class', 'timeline-brush')
      .call(this.brush)
      .call(this.brush.move, [40, this.svgWidth - 20]);

    this.renderBands();
    this.renderAxis();

    window.addEventListener('resize', () => this.handleResize(svgElement));
  }

  private computeAdaptiveBandWidth(): number {
    const visibleRange = YEAR_DOMAIN[1] - YEAR_DOMAIN[0];
    const scaleX = (this.svgWidth - 60) / visibleRange * this.zoomLevel;
    const idealWidth = PREFERRED_BAND_WIDTH;
    const countInRange = this.artifacts.filter(
      a => a.year >= this.currentScale.domain()[0] && a.year <= this.currentScale.domain()[1]
    ).length;
    const availableWidth = this.svgWidth - 60;
    const maxTotalWidth = countInRange * idealWidth;
    if (maxTotalWidth <= availableWidth) return idealWidth;
    const adapted = Math.max(MIN_BAND_WIDTH, availableWidth / countInRange);
    return adapted;
  }

  private renderBands(): void {
    this.bandGroup.selectAll('.timeline-band').remove();
    const bandwidth = this.computeAdaptiveBandWidth();
    const halfBand = bandwidth / 2;
    const sortedArtifacts = [...this.artifacts].sort((a, b) => a.year - b.year);

    const rowCounts = new Map<number, number>();

    this.bandGroup.selectAll('.timeline-band')
      .data(sortedArtifacts)
      .enter()
      .append('rect')
      .attr('class', 'timeline-band')
      .attr('x', (d: Artifact) => this.currentScale(d.year) - halfBand)
      .attr('y', (d: Artifact) => {
        const col = Math.floor(this.currentScale(d.year) / bandwidth);
        const row = rowCounts.get(col) || 0;
        rowCounts.set(col, row + 1);
        const yPos = 4 + (row % 3) * (bandwidth + 2);
        return yPos;
      })
      .attr('width', bandwidth)
      .attr('height', bandwidth)
      .attr('rx', 2)
      .attr('fill', (d: Artifact) => this.colorScale(d.year))
      .attr('opacity', 0.85)
      .on('mouseover', (event: MouseEvent, d: Artifact) => {
        d3.select(event.currentTarget as Element).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 1);
      })
      .on('mouseout', (event: MouseEvent) => {
        d3.select(event.currentTarget as Element).attr('opacity', 0.85).attr('stroke', 'none');
      })
      .append('title')
      .text((d: Artifact) => `${d.name} · 距今${d.year}年 · ${d.material}`);
  }

  private renderAxis(): void {
    const axis = d3.axisBottom(this.currentScale)
      .ticks(8)
      .tickFormat((d: d3.NumberValue) => `${Math.round(d.valueOf())}年`)
      .tickSizeInner(4)
      .tickSizeOuter(0);

    this.axisGroup.call(axis);
    this.axisGroup.selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');
    this.axisGroup.selectAll('path, line').attr('stroke', '#475569');
  }

  public zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel * 1.5, 8);
    this.updateScale();
  }

  public zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel / 1.5, 1);
    this.panOffset = 0;
    this.updateScale();
  }

  private updateScale(): void {
    const margin = 40;
    const rangeWidth = this.svgWidth - 60;
    const visibleDomain = (YEAR_DOMAIN[1] - YEAR_DOMAIN[0]) / this.zoomLevel;
    const center = (YEAR_DOMAIN[0] + YEAR_DOMAIN[1]) / 2 + this.panOffset;
    const domainMin = Math.max(YEAR_DOMAIN[0], center - visibleDomain / 2);
    const domainMax = Math.min(YEAR_DOMAIN[1], center + visibleDomain / 2);

    this.currentScale.domain([domainMin, domainMax]);

    this.brush.extent([[margin, 0], [this.svgWidth - 20, BAND_AREA_HEIGHT]]);
    this.brushGroup.call(this.brush);

    this.bandGroup.selectAll('.timeline-band')
      .transition()
      .duration(BRUSH_TRANSITION_MS)
      .attr('x', (d: Artifact) => this.currentScale(d.year) - this.computeAdaptiveBandWidth() / 2)
      .attr('fill', (d: Artifact) => this.colorScale(d.year));

    this.renderAxis();
  }

  private handleResize(svgElement: SVGSVGElement): void {
    const rect = svgElement.getBoundingClientRect();
    this.svgWidth = rect.width || 800;
    this.currentScale.range([40, this.svgWidth - 20]);
    this.brush.extent([[40, 0], [this.svgWidth - 20, BAND_AREA_HEIGHT]]);
    this.brushGroup.call(this.brush);
    this.renderBands();
    this.renderAxis();
  }

  public setOnYearRangeChange(cb: YearRangeCallback): void {
    this.onYearRangeChange = cb;
  }

  public getSelectedRange(): [number, number] {
    return this.selectedRange;
  }

  public resetBrush(): void {
    this.selectedRange = YEAR_DOMAIN;
    this.brushGroup.call(this.brush.move, [40, this.svgWidth - 20]);
  }
}
