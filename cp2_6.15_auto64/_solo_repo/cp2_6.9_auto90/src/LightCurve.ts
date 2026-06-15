export interface LightCurvePoint {
  time: number;
  brightness: number;
}

export class LightCurve {
  private svg: SVGSVGElement;
  private data: LightCurvePoint[] = [];
  private maxDataPoints: number = 200;
  private chartWidth: number = 400;
  private chartHeight: number = 250;
  private paddingLeft: number = 40;
  private paddingRight: number = 15;
  private paddingTop: number = 15;
  private paddingBottom: number = 30;
  private pathElement: SVGPathElement | null = null;
  private crosshairH: SVGLineElement | null = null;
  private crosshairV: SVGLineElement | null = null;
  private crosshairPoint: SVGCircleElement | null = null;
  private brightnessDisplay: HTMLElement;
  private cycleDisplay: HTMLElement;
  private currentPeriod: number = 5;
  private axisGroup: SVGGElement | null = null;

  constructor(
    svgElement: SVGSVGElement,
    brightnessDisplayId: string,
    cycleDisplayId: string
  ) {
    this.svg = svgElement;
    const brEl = document.getElementById(brightnessDisplayId);
    const cyEl = document.getElementById(cycleDisplayId);
    if (!brEl || !cyEl) throw new Error('Display elements not found');
    this.brightnessDisplay = brEl;
    this.cycleDisplay = cyEl;
    this.initializeChart();
  }

  private initializeChart(): void {
    const viewbox = this.svg.getAttribute('viewBox');
    if (viewbox) {
      const parts = viewbox.split(' ').map(Number);
      this.chartWidth = parts[2];
      this.chartHeight = parts[3];
    }

    this.axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.axisGroup);

    const pathGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(pathGroup);

    this.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.pathElement.setAttribute('fill', 'none');
    this.pathElement.setAttribute('stroke', 'url(#curveGradient)');
    this.pathElement.setAttribute('stroke-width', '2');
    this.pathElement.setAttribute('stroke-linejoin', 'round');
    this.pathElement.setAttribute('stroke-linecap', 'round');
    this.pathElement.setAttribute('filter', 'url(#glow)');
    pathGroup.appendChild(this.pathElement);

    const crosshairGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(crosshairGroup);

    this.crosshairH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.crosshairH.setAttribute('id', 'crosshair-h');
    crosshairGroup.appendChild(this.crosshairH);

    this.crosshairV = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.crosshairV.setAttribute('id', 'crosshair-v');
    crosshairGroup.appendChild(this.crosshairV);

    this.crosshairPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.crosshairPoint.setAttribute('id', 'crosshair-point');
    this.crosshairPoint.setAttribute('r', '3');
    crosshairGroup.appendChild(this.crosshairPoint);

    this.drawAxes();
  }

  private drawAxes(): void {
    if (!this.axisGroup) return;
    while (this.axisGroup.firstChild) {
      this.axisGroup.removeChild(this.axisGroup.firstChild);
    }

    const innerH = this.chartHeight - this.paddingTop - this.paddingBottom;

    for (let i = 0; i <= 5; i++) {
      const y = this.paddingTop + (innerH / 5) * i;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(this.paddingLeft));
      line.setAttribute('y1', String(y));
      line.setAttribute('x2', String(this.chartWidth - this.paddingRight));
      line.setAttribute('y2', String(y));
      line.setAttribute('class', 'tick-line');
      this.axisGroup.appendChild(line);

      const brightness = 100 - i * 20;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(this.paddingLeft - 5));
      text.setAttribute('y', String(y + 3));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('class', 'tick-text');
      text.textContent = `${brightness}%`;
      this.axisGroup.appendChild(text);
    }

    const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xLabel.setAttribute('x', String(this.chartWidth - this.paddingRight));
    xLabel.setAttribute('y', String(this.chartHeight - 5));
    xLabel.setAttribute('text-anchor', 'end');
    xLabel.setAttribute('class', 'axis-label');
    xLabel.textContent = '时间 (天)';
    this.axisGroup.appendChild(xLabel);

    const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yLabel.setAttribute('x', '8');
    yLabel.setAttribute('y', String(this.paddingTop - 3));
    yLabel.setAttribute('class', 'axis-label');
    yLabel.textContent = '亮度';
    this.axisGroup.appendChild(yLabel);
  }

  public setPeriod(period: number): void {
    this.currentPeriod = period;
  }

  public addPoint(time: number, eclipseFactor: number, cycle: number): void {
    const brightness = eclipseFactor * 100;
    this.data.push({ time, brightness });

    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    this.brightnessDisplay.textContent = `${brightness.toFixed(1)}%`;
    this.cycleDisplay.textContent = String(cycle);

    this.render();
  }

  private render(): void {
    if (!this.pathElement || this.data.length < 2) return;

    const innerW = this.chartWidth - this.paddingLeft - this.paddingRight;
    const innerH = this.chartHeight - this.paddingTop - this.paddingBottom;

    const latestTime = this.data[this.data.length - 1].time;
    const timeWindow = Math.max(3 * this.currentPeriod, 10);
    const minTime = Math.max(0, latestTime - timeWindow);
    const maxTime = latestTime;

    let d = '';
    let lastX = 0;
    let lastY = 0;

    for (let i = 0; i < this.data.length; i++) {
      const point = this.data[i];
      if (point.time < minTime) continue;

      const t = (point.time - minTime) / (maxTime - minTime || 1);
      const x = this.paddingLeft + t * innerW;
      const y = this.paddingTop + (1 - point.brightness / 100) * innerH;

      if (i === 0 || d === '') {
        d += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
      } else {
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      lastX = x;
      lastY = y;
    }

    this.pathElement.setAttribute('d', d);

    if (this.crosshairH && this.crosshairV && this.crosshairPoint) {
      this.crosshairH.setAttribute('x1', String(this.paddingLeft));
      this.crosshairH.setAttribute('y1', String(lastY));
      this.crosshairH.setAttribute('x2', String(this.chartWidth - this.paddingRight));
      this.crosshairH.setAttribute('y2', String(lastY));

      this.crosshairV.setAttribute('x1', String(lastX));
      this.crosshairV.setAttribute('y1', String(this.paddingTop));
      this.crosshairV.setAttribute('x2', String(lastX));
      this.crosshairV.setAttribute('y2', String(this.chartHeight - this.paddingBottom));

      this.crosshairPoint.setAttribute('cx', String(lastX));
      this.crosshairPoint.setAttribute('cy', String(lastY));
    }

    this.updateTimeTicks(minTime, maxTime);
  }

  private updateTimeTicks(minTime: number, maxTime: number): void {
    if (!this.axisGroup) return;

    const existingTicks = this.axisGroup.querySelectorAll('.time-tick');
    existingTicks.forEach(el => el.remove());

    const innerW = this.chartWidth - this.paddingLeft - this.paddingRight;
    const tickCount = 5;

    for (let i = 0; i <= tickCount; i++) {
      const t = i / tickCount;
      const timeVal = minTime + t * (maxTime - minTime);
      const x = this.paddingLeft + t * innerW;
      const y = this.chartHeight - this.paddingBottom;

      const tickMark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tickMark.setAttribute('x1', String(x));
      tickMark.setAttribute('y1', String(y));
      tickMark.setAttribute('x2', String(x));
      tickMark.setAttribute('y2', String(y + 4));
      tickMark.setAttribute('stroke', 'rgba(255,255,255,0.2)');
      tickMark.setAttribute('stroke-width', '1');
      tickMark.setAttribute('class', 'time-tick');
      this.axisGroup.appendChild(tickMark);

      const tickText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tickText.setAttribute('x', String(x));
      tickText.setAttribute('y', String(y + 15));
      tickText.setAttribute('text-anchor', 'middle');
      tickText.setAttribute('class', 'tick-text time-tick');
      tickText.textContent = timeVal.toFixed(1);
      this.axisGroup.appendChild(tickText);
    }
  }

  public clear(): void {
    this.data = [];
    if (this.pathElement) {
      this.pathElement.setAttribute('d', '');
    }
  }
}
