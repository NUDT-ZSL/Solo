import {
  DinosaurSpecies,
  DisplayMode,
  DINOSAURS,
  DINOSAUR_LIST,
  GEOLOGICAL_PERIODS,
  TIMELINE_START,
  TIMELINE_END
} from './data';

export interface UICallbacks {
  onSpeciesSelect: (viewport: 0 | 1, species: DinosaurSpecies) => void;
  onModeChange: (mode: DisplayMode) => void;
  onTimelineDragEnd: (year: number) => void;
  onTimelineNodeClick: (species: DinosaurSpecies) => void;
  onCloseModal: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private selectedSpecies: [DinosaurSpecies, DinosaurSpecies];
  private activeViewport: 0 | 1 = 0;
  private currentMode: DisplayMode = 'anatomy';
  private timelineDragging = false;
  private modal: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.selectedSpecies = ['tyrannosaurus', 'diplodocus'];
    this.buildUI();
  }

  private buildUI(): void {
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.width = '100%';
    this.container.style.height = '100%';

    const mainArea = document.createElement('div');
    mainArea.style.display = 'flex';
    mainArea.style.flex = '1';
    mainArea.style.minHeight = '0';

    const sidebar = this.createSidebar();
    const viewportArea = this.createViewportArea();

    mainArea.appendChild(sidebar);
    mainArea.appendChild(viewportArea);

    const timelineArea = this.createTimeline();

    this.container.appendChild(mainArea);
    this.container.appendChild(timelineArea);
  }

  private createSidebar(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.style.width = '300px';
    sidebar.style.minWidth = '300px';
    sidebar.style.background = '#16213E';
    sidebar.style.borderRight = '1px solid #2a3a5e';
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.overflow = 'hidden';
    sidebar.id = 'sidebar';

    const header = document.createElement('div');
    header.style.padding = '16px';
    header.style.borderBottom = '1px solid #2a3a5e';

    const title = document.createElement('h2');
    title.textContent = '🦖 恐龙物种';
    title.style.color = '#D4A853';
    title.style.fontSize = '18px';
    title.style.marginBottom = '4px';

    const subtitle = document.createElement('p');
    subtitle.textContent = '选择两种恐龙进行对比';
    subtitle.style.color = '#90A4AE';
    subtitle.style.fontSize = '12px';

    header.appendChild(title);
    header.appendChild(subtitle);
    sidebar.appendChild(header);

    const viewportSelector = this.createViewportSelector();
    sidebar.appendChild(viewportSelector);

    const modeSelector = this.createModeSelector();
    sidebar.appendChild(modeSelector);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '120px 120px';
    grid.style.gap = '12px';
    grid.style.padding = '16px';
    grid.style.justifyContent = 'center';
    grid.style.overflowY = 'auto';
    grid.style.flex = '1';
    grid.id = 'species-grid';

    DINOSAUR_LIST.forEach((species) => {
      const card = this.createSpeciesCard(species);
      grid.appendChild(card);
    });

    sidebar.appendChild(grid);
    return sidebar;
  }

  private createViewportSelector(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '12px 16px';
    wrapper.style.borderBottom = '1px solid #2a3a5e';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const label = document.createElement('span');
    label.textContent = '当前激活视口';
    label.style.color = '#90A4AE';
    label.style.fontSize = '12px';

    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.gap = '8px';

    const makeBtn = (idx: 0 | 1, text: string) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.flex = '1';
      btn.style.padding = '8px 12px';
      btn.style.borderRadius = '8px';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '13px';
      btn.style.transition = 'all 0.2s';
      btn.style.background = idx === this.activeViewport ? '#D4A853' : '#2a3a5e';
      btn.style.color = idx === this.activeViewport ? '#1A1A2E' : '#E0E0E0';
      btn.style.fontWeight = idx === this.activeViewport ? 'bold' : 'normal';

      btn.addEventListener('mouseenter', () => {
        if (idx !== this.activeViewport) btn.style.background = '#3a4a6e';
        btn.style.transform = 'scale(1.02)';
      });
      btn.addEventListener('mouseleave', () => {
        if (idx !== this.activeViewport) btn.style.background = '#2a3a5e';
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'scale(0.95)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.transform = idx === this.activeViewport ? 'scale(1)' : 'scale(1.02)';
      });
      btn.addEventListener('click', () => {
        this.activeViewport = idx;
        this.updateViewportButtons();
      });

      btn.id = `viewport-btn-${idx}`;
      return btn;
    };

    btns.appendChild(makeBtn(0, '视口 A'));
    btns.appendChild(makeBtn(1, '视口 B'));

    wrapper.appendChild(label);
    wrapper.appendChild(btns);
    return wrapper;
  }

  private updateViewportButtons(): void {
    for (let i = 0; i < 2; i++) {
      const btn = document.getElementById(`viewport-btn-${i}`) as HTMLButtonElement;
      if (btn) {
        btn.style.background = i === this.activeViewport ? '#D4A853' : '#2a3a5e';
        btn.style.color = i === this.activeViewport ? '#1A1A2E' : '#E0E0E0';
        btn.style.fontWeight = i === this.activeViewport ? 'bold' : 'normal';
      }
    }
  }

  private createModeSelector(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '12px 16px';
    wrapper.style.borderBottom = '1px solid #2a3a5e';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const label = document.createElement('span');
    label.textContent = '显示模式';
    label.style.color = '#90A4AE';
    label.style.fontSize = '12px';

    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.gap = '8px';

    const makeBtn = (mode: DisplayMode, text: string) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.flex = '1';
      btn.style.padding = '8px 12px';
      btn.style.borderRadius = '8px';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '13px';
      btn.style.transition = 'all 0.2s';
      btn.style.background = mode === this.currentMode ? '#D4A853' : '#2a3a5e';
      btn.style.color = mode === this.currentMode ? '#1A1A2E' : '#E0E0E0';
      btn.style.fontWeight = mode === this.currentMode ? 'bold' : 'normal';

      btn.addEventListener('mouseenter', () => {
        if (mode !== this.currentMode) btn.style.background = '#3a4a6e';
        btn.style.transform = 'scale(1.02)';
      });
      btn.addEventListener('mouseleave', () => {
        if (mode !== this.currentMode) btn.style.background = '#2a3a5e';
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'scale(0.95)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.transform = mode === this.currentMode ? 'scale(1)' : 'scale(1.02)';
      });
      btn.addEventListener('click', () => {
        this.currentMode = mode;
        this.updateModeButtons();
        this.callbacks.onModeChange(mode);
      });

      btn.id = `mode-btn-${mode}`;
      return btn;
    };

    btns.appendChild(makeBtn('anatomy', '解剖模式'));
    btns.appendChild(makeBtn('evolution', '演化模式'));

    wrapper.appendChild(label);
    wrapper.appendChild(btns);
    return wrapper;
  }

  private updateModeButtons(): void {
    (['anatomy', 'evolution'] as DisplayMode[]).forEach((mode) => {
      const btn = document.getElementById(`mode-btn-${mode}`) as HTMLButtonElement;
      if (btn) {
        btn.style.background = mode === this.currentMode ? '#D4A853' : '#2a3a5e';
        btn.style.color = mode === this.currentMode ? '#1A1A2E' : '#E0E0E0';
        btn.style.fontWeight = mode === this.currentMode ? 'bold' : 'normal';
      }
    });
  }

  private createSpeciesCard(species: DinosaurSpecies): HTMLElement {
    const dino = DINOSAURS[species];
    const card = document.createElement('div');
    card.style.width = '120px';
    card.style.height = '160px';
    card.style.background = '#1A1A2E';
    card.style.borderRadius = '8px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'space-between';
    card.style.padding = '10px';
    card.style.cursor = 'pointer';
    card.style.transition = 'all 0.2s ease';
    card.style.boxShadow = '0 0 0 1px #2a3a5e';
    card.style.position = 'relative';
    card.dataset.species = species;

    const badge = document.createElement('div');
    badge.textContent = dino.pixelIcon;
    badge.style.fontSize = '40px';
    badge.style.lineHeight = '1';
    badge.style.marginTop = '6px';
    badge.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))';

    const nameDiv = document.createElement('div');
    nameDiv.style.textAlign = 'center';
    nameDiv.style.width = '100%';

    const name = document.createElement('div');
    name.textContent = dino.name;
    name.style.color = '#E0E0E0';
    name.style.fontSize = '14px';
    name.style.fontWeight = 'bold';
    name.style.marginBottom = '4px';

    const period = document.createElement('div');
    period.textContent = dino.period;
    period.style.color = '#D4A853';
    period.style.fontSize = '10px';

    nameDiv.appendChild(name);
    nameDiv.appendChild(period);

    const selectedBadge = document.createElement('div');
    selectedBadge.style.position = 'absolute';
    selectedBadge.style.top = '6px';
    selectedBadge.style.right = '6px';
    selectedBadge.style.fontSize = '10px';
    selectedBadge.style.padding = '2px 6px';
    selectedBadge.style.borderRadius = '4px';
    selectedBadge.style.background = '#D4A853';
    selectedBadge.style.color = '#1A1A2E';
    selectedBadge.style.fontWeight = 'bold';
    selectedBadge.style.display = 'none';
    selectedBadge.id = `selected-badge-${species}`;

    card.appendChild(badge);
    card.appendChild(nameDiv);
    card.appendChild(selectedBadge);

    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = '0 0 12px 1px #D4A853';
      card.style.transform = 'scale(1.05)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '0 0 0 1px #2a3a5e';
      card.style.transform = 'scale(1)';
    });
    card.addEventListener('mousedown', () => {
      card.style.transform = 'scale(0.98)';
    });
    card.addEventListener('mouseup', () => {
      card.style.transform = 'scale(1.05)';
    });
    card.addEventListener('click', () => {
      this.selectSpecies(species);
    });

    this.updateSpeciesBadge(species);
    return card;
  }

  private selectSpecies(species: DinosaurSpecies): void {
    this.selectedSpecies[this.activeViewport] = species;
    this.callbacks.onSpeciesSelect(this.activeViewport, species);
    this.updateAllSpeciesBadges();
  }

  private updateSpeciesBadge(species: DinosaurSpecies): void {
    const badge = document.getElementById(`selected-badge-${species}`);
    if (!badge) return;

    const inA = this.selectedSpecies[0] === species;
    const inB = this.selectedSpecies[1] === species;

    if (inA && inB) {
      badge.style.display = 'block';
      badge.textContent = 'A+B';
    } else if (inA) {
      badge.style.display = 'block';
      badge.textContent = 'A';
    } else if (inB) {
      badge.style.display = 'block';
      badge.textContent = 'B';
    } else {
      badge.style.display = 'none';
    }
  }

  private updateAllSpeciesBadges(): void {
    DINOSAUR_LIST.forEach((s) => this.updateSpeciesBadge(s));
  }

  private createViewportArea(): HTMLElement {
    const area = document.createElement('div');
    area.style.flex = '1';
    area.style.display = 'flex';
    area.style.gap = '1%';
    area.style.padding = '12px';
    area.style.minWidth = '0';
    area.style.minHeight = '0';
    area.style.background = '#1A1A2E';

    const vp1 = document.createElement('div');
    vp1.style.flex = '1';
    vp1.style.position = 'relative';
    vp1.style.background = '#0F0F1A';
    vp1.style.borderRadius = '8px';
    vp1.style.overflow = 'hidden';
    vp1.style.minWidth = '0';
    vp1.id = 'viewport-0';

    const vp2 = document.createElement('div');
    vp2.style.flex = '1';
    vp2.style.position = 'relative';
    vp2.style.background = '#0F0F1A';
    vp2.style.borderRadius = '8px';
    vp2.style.overflow = 'hidden';
    vp2.style.minWidth = '0';
    vp2.id = 'viewport-1';

    [vp1, vp2].forEach((vp, idx) => {
      const label = document.createElement('div');
      label.textContent = idx === 0 ? '视口 A' : '视口 B';
      label.style.position = 'absolute';
      label.style.top = '8px';
      label.style.left = '12px';
      label.style.color = '#D4A853';
      label.style.fontSize = '13px';
      label.style.fontWeight = 'bold';
      label.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
      label.style.zIndex = '10';
      label.id = `viewport-label-${idx}`;
      vp.appendChild(label);

      const hint = document.createElement('div');
      hint.innerHTML = '拖拽旋转 · 滚轮缩放 · Shift+拖拽平移';
      hint.style.position = 'absolute';
      hint.style.bottom = '8px';
      hint.style.left = '50%';
      hint.style.transform = 'translateX(-50%)';
      hint.style.color = 'rgba(224,224,224,0.5)';
      hint.style.fontSize = '10px';
      hint.style.zIndex = '10';
      vp.appendChild(hint);
    });

    area.appendChild(vp1);
    area.appendChild(vp2);
    return area;
  }

  private createTimeline(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.height = '120px';
    wrapper.style.minHeight = '120px';
    wrapper.style.background = '#0F0F1A';
    wrapper.style.borderTop = '1px solid #2a3a5e';
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';
    wrapper.id = 'timeline-container';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.id = 'timeline-svg';

    wrapper.appendChild(svg);

    const dragger = document.createElement('div');
    dragger.style.position = 'absolute';
    dragger.style.width = '20px';
    dragger.style.height = '20px';
    dragger.style.borderRadius = '50%';
    dragger.style.background = '#D4A853';
    dragger.style.boxShadow = '0 0 12px #D4A853, 0 2px 6px rgba(0,0,0,0.5)';
    dragger.style.top = '50%';
    dragger.style.transform = 'translate(-50%, -50%)';
    dragger.style.cursor = 'grab';
    dragger.style.zIndex = '20';
    dragger.style.transition = 'left 0.5s ease-out';
    dragger.id = 'timeline-dragger';

    const yearLabel = document.createElement('div');
    yearLabel.style.position = 'absolute';
    yearLabel.style.bottom = '8px';
    yearLabel.style.left = '50%';
    yearLabel.style.transform = 'translateX(-50%)';
    yearLabel.style.color = '#D4A853';
    yearLabel.style.fontSize = '11px';
    yearLabel.style.fontWeight = 'bold';
    yearLabel.id = 'timeline-year-label';
    wrapper.appendChild(yearLabel);

    wrapper.appendChild(dragger);

    const title = document.createElement('div');
    title.textContent = '演化树时间轴 (百万年前)';
    title.style.position = 'absolute';
    title.style.top = '6px';
    title.style.left = '16px';
    title.style.color = '#90A4AE';
    title.style.fontSize = '11px';
    title.style.zIndex = '15';
    wrapper.appendChild(title);

    const hint = document.createElement('div');
    hint.textContent = '拖动金色圆点切换年代 · 点击节点查看详情';
    hint.style.position = 'absolute';
    hint.style.top = '6px';
    hint.style.right = '16px';
    hint.style.color = '#90A4AE';
    hint.style.fontSize = '11px';
    hint.style.zIndex = '15';
    wrapper.appendChild(hint);

    setTimeout(() => this.renderTimeline(), 0);
    this.setupTimelineDragger();

    return wrapper;
  }

  public renderTimeline(): void {
    const svg = document.getElementById('timeline-svg') as unknown as SVGSVGElement;
    if (!svg) return;

    const container = document.getElementById('timeline-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const paddingLeft = 60;
    const paddingRight = 60;
    const drawWidth = width - paddingLeft - paddingRight;
    const centerY = height / 2;
    const topY = 20;
    const bottomY = height - 30;

    const yearToX = (year: number) => {
      const ratio = (TIMELINE_START - year) / (TIMELINE_START - TIMELINE_END);
      return paddingLeft + ratio * drawWidth;
    };

    GEOLOGICAL_PERIODS.forEach((period) => {
      if (period.end > TIMELINE_START || period.start < TIMELINE_END) return;
      const x1 = yearToX(Math.min(period.start, TIMELINE_START));
      const x2 = yearToX(Math.max(period.end, TIMELINE_END));

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', String(x1));
      bg.setAttribute('y', '0');
      bg.setAttribute('width', String(x2 - x1));
      bg.setAttribute('height', String(height));
      bg.setAttribute('fill', period.color);
      bg.setAttribute('opacity', '0.08');
      svg.appendChild(bg);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String((x1 + x2) / 2));
      label.setAttribute('y', String(bottomY + 18));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', period.color);
      label.setAttribute('font-size', '12');
      label.setAttribute('font-weight', 'bold');
      label.textContent = `${period.name} ${period.start}-${period.end}M`;
      svg.appendChild(label);
    });

    const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    mainLine.setAttribute('x1', String(paddingLeft));
    mainLine.setAttribute('y1', String(centerY));
    mainLine.setAttribute('x2', String(width - paddingRight));
    mainLine.setAttribute('y2', String(centerY));
    mainLine.setAttribute('stroke', '#D4A853');
    mainLine.setAttribute('stroke-width', '2');
    mainLine.setAttribute('opacity', '0.6');
    svg.appendChild(mainLine);

    DINOSAUR_LIST.forEach((species, idx) => {
      const dino = DINOSAURS[species];
      const midYear = (dino.periodStart + dino.periodEnd) / 2;
      const x = yearToX(midYear);
      const isTop = idx % 2 === 0;
      const branchY = isTop ? topY + 10 : bottomY - 10;
      const nodeY = isTop ? topY : bottomY;

      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', String(x));
      vLine.setAttribute('y1', String(centerY));
      vLine.setAttribute('x2', String(x));
      vLine.setAttribute('y2', String(branchY));
      vLine.setAttribute('stroke', '#D4A853');
      vLine.setAttribute('stroke-width', '1.5');
      svg.appendChild(vLine);

      if (dino.evolutionParent) {
        const parent = DINOSAURS[dino.evolutionParent];
        const parentMid = (parent.periodStart + parent.periodEnd) / 2;
        const px = yearToX(parentMid);
        const curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const mx = (x + px) / 2;
        curve.setAttribute('d', `M ${x} ${branchY} Q ${mx} ${isTop ? topY - 15 : bottomY + 15} ${px} ${idx % 2 === 0 ? topY + 10 : bottomY - 10}`);
        curve.setAttribute('stroke', dino.color);
        curve.setAttribute('stroke-width', '1.5');
        curve.setAttribute('stroke-dasharray', '4,3');
        curve.setAttribute('fill', 'none');
        curve.setAttribute('opacity', '0.5');
        svg.appendChild(curve);
      }

      const periodLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const startX = yearToX(dino.periodStart);
      const endX = yearToX(dino.periodEnd);
      periodLine.setAttribute('x1', String(startX));
      periodLine.setAttribute('y1', String(branchY));
      periodLine.setAttribute('x2', String(endX));
      periodLine.setAttribute('y2', String(branchY));
      periodLine.setAttribute('stroke', dino.color);
      periodLine.setAttribute('stroke-width', '3');
      periodLine.setAttribute('opacity', '0.7');
      svg.appendChild(periodLine);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(x));
      circle.setAttribute('cy', String(nodeY));
      circle.setAttribute('r', '8');
      circle.setAttribute('fill', '#D4A853');
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '2');
      circle.style.cursor = 'pointer';
      circle.style.transition = 'all 0.2s';

      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('r', '11');
        circle.setAttribute('fill', '#F0C06A');
      });
      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#D4A853');
      });
      circle.addEventListener('click', () => {
        this.callbacks.onTimelineNodeClick(species);
      });

      svg.appendChild(circle);

      const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      name.setAttribute('x', String(x));
      name.setAttribute('y', String(isTop ? nodeY - 12 : nodeY + 22));
      name.setAttribute('text-anchor', 'middle');
      name.setAttribute('fill', '#fff');
      name.setAttribute('font-size', '12');
      name.setAttribute('font-weight', 'bold');
      name.textContent = dino.name;
      svg.appendChild(name);

      const periodText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      periodText.setAttribute('x', String(x));
      periodText.setAttribute('y', String(isTop ? nodeY - 1 : nodeY + 35));
      periodText.setAttribute('text-anchor', 'middle');
      periodText.setAttribute('fill', '#D4A853');
      periodText.setAttribute('font-size', '9');
      periodText.textContent = `${dino.periodStart}-${dino.periodEnd}M`;
      svg.appendChild(periodText);
    });

    for (let y = TIMELINE_START; y >= TIMELINE_END; y -= 20) {
      const x = yearToX(y);
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', String(x));
      tick.setAttribute('y1', String(centerY - 4));
      tick.setAttribute('x2', String(x));
      tick.setAttribute('y2', String(centerY + 4));
      tick.setAttribute('stroke', '#D4A853');
      tick.setAttribute('stroke-width', '1');
      tick.setAttribute('opacity', '0.5');
      svg.appendChild(tick);
    }
  }

  private setupTimelineDragger(): void {
    const container = document.getElementById('timeline-container')!;
    const dragger = document.getElementById('timeline-dragger')!;
    const yearLabel = document.getElementById('timeline-year-label')!;

    const updatePosition = (clientX: number) => {
      const rect = container.getBoundingClientRect();
      const paddingLeft = 60;
      const paddingRight = 60;
      const drawWidth = rect.width - paddingLeft - paddingRight;
      let x = clientX - rect.left - paddingLeft;
      x = Math.max(0, Math.min(x, drawWidth));
      const ratio = x / drawWidth;
      const year = TIMELINE_START - ratio * (TIMELINE_START - TIMELINE_END);

      dragger.style.left = `${paddingLeft + x}px`;
      yearLabel.style.left = `${paddingLeft + x}px`;
      yearLabel.textContent = `${Math.round(year)} 百万年前`;

      return year;
    };

    setTimeout(() => {
      updatePosition(container.getBoundingClientRect().left + 60 + (container.clientWidth - 120) * 0.5);
    }, 100);

    let moved = false;

    dragger.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.timelineDragging = true;
      moved = false;
      dragger.style.cursor = 'grabbing';
      dragger.style.transition = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.timelineDragging) return;
      updatePosition(e.clientX);
      moved = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.timelineDragging) return;
      this.timelineDragging = false;
      dragger.style.cursor = 'grab';
      dragger.style.transition = 'left 0.5s ease-out';
      if (moved) {
        const year = updatePosition(e.clientX);
        this.callbacks.onTimelineDragEnd(year);
      }
    });

    window.addEventListener('resize', () => this.renderTimeline());
  }

  public showSpeciesModal(species: DinosaurSpecies): void {
    if (this.modal) {
      this.closeModal();
    }

    const dino = DINOSAURS[species];

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.67)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.animation = 'fadeIn 0.3s ease';

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.style.background = '#16213E';
    modal.style.border = '1px solid #D4A853';
    modal.style.borderRadius = '12px';
    modal.style.padding = '28px';
    modal.style.maxWidth = '520px';
    modal.style.width = '90%';
    modal.style.boxShadow = '0 8px 40px rgba(212,168,83,0.25)';
    modal.style.animation = 'slideUp 0.3s ease';
    modal.style.position = 'relative';

    const icon = document.createElement('div');
    icon.textContent = dino.pixelIcon;
    icon.style.fontSize = '64px';
    icon.style.textAlign = 'center';
    icon.style.marginBottom = '8px';

    const title = document.createElement('h2');
    title.textContent = dino.name;
    title.style.color = '#D4A853';
    title.style.fontSize = '24px';
    title.style.textAlign = 'center';
    title.style.marginBottom = '4px';

    const period = document.createElement('div');
    period.textContent = `${dino.period} (${dino.periodStart}-${dino.periodEnd} 百万年前)`;
    period.style.color = '#90A4AE';
    period.style.fontSize = '13px';
    period.style.textAlign = 'center';
    period.style.marginBottom = '20px';

    const desc = document.createElement('p');
    desc.textContent = dino.description;
    desc.style.color = '#E0E0E0';
    desc.style.fontSize = '14px';
    desc.style.lineHeight = '1.7';
    desc.style.marginBottom = '16px';

    const infoGrid = document.createElement('div');
    infoGrid.style.display = 'grid';
    infoGrid.style.gridTemplateColumns = 'auto 1fr';
    infoGrid.style.gap = '10px 16px';
    infoGrid.style.marginBottom = '10px';

    const lenLabel = document.createElement('span');
    lenLabel.textContent = '体长：';
    lenLabel.style.color = '#90A4AE';
    lenLabel.style.fontSize = '13px';
    const lenVal = document.createElement('span');
    lenVal.textContent = dino.length;
    lenVal.style.color = '#E0E0E0';
    lenVal.style.fontSize = '13px';

    const habLabel = document.createElement('span');
    habLabel.textContent = '生存环境：';
    habLabel.style.color = '#90A4AE';
    habLabel.style.fontSize = '13px';
    habLabel.style.alignSelf = 'center';

    const habVal = document.createElement('div');
    habVal.style.display = 'flex';
    habVal.style.flexWrap = 'wrap';
    habVal.style.gap = '6px';
    dino.habitat.forEach((h) => {
      const tag = document.createElement('span');
      tag.textContent = h;
      tag.style.padding = '3px 10px';
      tag.style.borderRadius = '12px';
      tag.style.background = dino.color + '33';
      tag.style.color = dino.color;
      tag.style.fontSize = '12px';
      tag.style.fontWeight = 'bold';
      tag.style.border = `1px solid ${dino.color}66`;
      habVal.appendChild(tag);
    });

    infoGrid.appendChild(lenLabel);
    infoGrid.appendChild(lenVal);
    infoGrid.appendChild(habLabel);
    infoGrid.appendChild(habVal);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '14px';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#90A4AE';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.lineHeight = '1';
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#D4A853'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#90A4AE'; });
    closeBtn.addEventListener('click', () => this.closeModal());

    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(period);
    modal.appendChild(desc);
    modal.appendChild(infoGrid);
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    document.body.appendChild(overlay);
    this.modal = overlay;
  }

  public closeModal(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
      this.callbacks.onCloseModal();
    }
  }

  public updateViewportLabels(species: [DinosaurSpecies, DinosaurSpecies]): void {
    for (let i = 0; i < 2; i++) {
      const label = document.getElementById(`viewport-label-${i}`);
      if (label) {
        const dino = DINOSAURS[species[i]];
        label.textContent = `${i === 0 ? '视口 A' : '视口 B'} · ${dino.name}`;
      }
    }
  }

  public getSelectedSpecies(): [DinosaurSpecies, DinosaurSpecies] {
    return this.selectedSpecies;
  }

  public getCurrentMode(): DisplayMode {
    return this.currentMode;
  }

  public setTimelineYear(year: number): void {
    const container = document.getElementById('timeline-container')!;
    const dragger = document.getElementById('timeline-dragger')!;
    const yearLabel = document.getElementById('timeline-year-label')!;
    if (!container || !dragger || !yearLabel) return;

    const rect = container.getBoundingClientRect();
    const paddingLeft = 60;
    const paddingRight = 60;
    const drawWidth = rect.width - paddingLeft - paddingRight;
    const ratio = (TIMELINE_START - year) / (TIMELINE_START - TIMELINE_END);
    const x = ratio * drawWidth;

    dragger.style.left = `${paddingLeft + x}px`;
    yearLabel.style.left = `${paddingLeft + x}px`;
    yearLabel.textContent = `${Math.round(year)} 百万年前`;
  }

  public setTimelineBackgroundColor(color: string): void {
    const container = document.getElementById('timeline-container');
    if (container) {
      container.style.transition = 'background 0.5s ease';
      const oldBg = container.style.background;
      container.style.background = `linear-gradient(to bottom, ${color}22, #0F0F1A 60%)`;
      setTimeout(() => {
        if (container) container.style.background = oldBg || '#0F0F1A';
      }, 1500);
    }
  }

  public setActiveViewport(vp: 0 | 1): void {
    this.activeViewport = vp;
    this.updateViewportButtons();
  }
}
