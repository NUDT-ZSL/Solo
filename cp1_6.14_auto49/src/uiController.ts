import type { MoleculeData } from './moleculeData';

export interface UIControllerCallbacks {
  onPlayPause: () => void;
  onVolatilityChange: (value: number) => void;
}

const MOBILE_BREAKPOINT = 768;

export class UIController {
  private playPauseBtn: HTMLButtonElement;
  private volatilitySlider: HTMLInputElement;
  private volatilityValue: HTMLElement;
  private detailContent: HTMLElement;
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private leftTitle: HTMLElement;
  private rightTitle: HTMLElement;
  private isPlaying: boolean = true;
  private callbacks: UIControllerCallbacks;
  private mq: MediaQueryList;
  private isMobile: boolean = false;
  private leftExpandBtn: HTMLButtonElement | null = null;
  private rightExpandBtn: HTMLButtonElement | null = null;
  private leftCollapseBtn: HTMLButtonElement | null = null;
  private rightCollapseBtn: HTMLButtonElement | null = null;

  constructor(callbacks: UIControllerCallbacks) {
    this.callbacks = callbacks;

    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.volatilitySlider = document.getElementById('volatility-slider') as HTMLInputElement;
    this.volatilityValue = document.getElementById('volatility-value') as HTMLElement;
    this.detailContent = document.getElementById('detail-content') as HTMLElement;
    this.leftPanel = document.getElementById('left-panel') as HTMLElement;
    this.rightPanel = document.getElementById('right-panel') as HTMLElement;

    const leftTitleEl = this.leftPanel.querySelector('.panel-title') as HTMLElement | null;
    const rightTitleEl = this.rightPanel.querySelector('.panel-title') as HTMLElement | null;
    this.leftTitle = leftTitleEl ?? this.leftPanel;
    this.rightTitle = rightTitleEl ?? this.rightPanel;

    this.playPauseBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.playPauseBtn.textContent = this.isPlaying ? '⏸ 暂停旋转' : '▶ 播放旋转';
      this.callbacks.onPlayPause();
    });

    this.volatilitySlider.addEventListener('input', () => {
      const val = parseFloat(this.volatilitySlider.value);
      this.volatilityValue.textContent = val.toFixed(2);
      this.callbacks.onVolatilityChange(val);
    });

    this.mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    this.handleBreakpointChange(this.mq.matches);
    if (typeof this.mq.addEventListener === 'function') {
      this.mq.addEventListener('change', (e) => this.handleBreakpointChange(e.matches));
    } else if (typeof (this.mq as any).addListener === 'function') {
      (this.mq as any).addListener((e: MediaQueryListEvent) => this.handleBreakpointChange(e.matches));
    }

    window.addEventListener('resize', () => this.handleBreakpointChange(
      window.innerWidth <= MOBILE_BREAKPOINT
    ));
  }

  private handleBreakpointChange(isMobile: boolean): void {
    if (this.isMobile === isMobile) return;
    this.isMobile = isMobile;

    if (isMobile) {
      this.enableMobileLayout();
    } else {
      this.disableMobileLayout();
    }
  }

  private enableMobileLayout(): void {
    this.leftPanel.classList.remove('expanded');
    this.rightPanel.classList.remove('expanded');

    this.removeCollapseBtns();

    this.leftExpandBtn = document.createElement('button');
    this.leftExpandBtn.textContent = '☰ 香调';
    this.styleMobileBarBtn(this.leftExpandBtn);
    this.leftPanel.style.display = 'block';

    this.rightExpandBtn = document.createElement('button');
    this.rightExpandBtn.textContent = '详情 ▸';
    this.styleMobileBarBtn(this.rightExpandBtn);
    this.rightPanel.style.display = 'block';

    this.leftPanel.addEventListener('click', this.handleLeftBarClick);
    this.rightPanel.addEventListener('click', this.handleRightBarClick);

    this.leftCollapseBtn = document.createElement('button');
    this.styleCollapseBtn(this.leftCollapseBtn, '← 收起');
    this.leftPanel.appendChild(this.leftCollapseBtn);
    this.leftCollapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.leftPanel.classList.remove('expanded');
    });

    this.rightCollapseBtn = document.createElement('button');
    this.styleCollapseBtn(this.rightCollapseBtn, '收起 →');
    this.rightPanel.appendChild(this.rightCollapseBtn);
    this.rightCollapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.rightPanel.classList.remove('expanded');
    });
  }

  private disableMobileLayout(): void {
    this.leftPanel.classList.remove('expanded');
    this.rightPanel.classList.remove('expanded');
    this.leftPanel.style.display = '';
    this.rightPanel.style.display = '';

    this.leftPanel.removeEventListener('click', this.handleLeftBarClick);
    this.rightPanel.removeEventListener('click', this.handleRightBarClick);

    this.removeCollapseBtns();
  }

  private removeCollapseBtns(): void {
    if (this.leftCollapseBtn && this.leftCollapseBtn.parentNode) {
      this.leftCollapseBtn.parentNode.removeChild(this.leftCollapseBtn);
      this.leftCollapseBtn = null;
    }
    if (this.rightCollapseBtn && this.rightCollapseBtn.parentNode) {
      this.rightCollapseBtn.parentNode.removeChild(this.rightCollapseBtn);
      this.rightCollapseBtn = null;
    }
    if (this.leftExpandBtn && this.leftExpandBtn.parentNode) {
      this.leftExpandBtn.parentNode.removeChild(this.leftExpandBtn);
      this.leftExpandBtn = null;
    }
    if (this.rightExpandBtn && this.rightExpandBtn.parentNode) {
      this.rightExpandBtn.parentNode.removeChild(this.rightExpandBtn);
      this.rightExpandBtn = null;
    }
  }

  private handleLeftBarClick = (e: Event): void => {
    if (!this.isMobile) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    if (!this.leftPanel.classList.contains('expanded')) {
      e.preventDefault();
      e.stopPropagation();
      this.leftPanel.classList.add('expanded');
    }
  };

  private handleRightBarClick = (e: Event): void => {
    if (!this.isMobile) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    if (!this.rightPanel.classList.contains('expanded')) {
      e.preventDefault();
      e.stopPropagation();
      this.rightPanel.classList.add('expanded');
    }
  };

  private styleMobileBarBtn(btn: HTMLButtonElement): void {
    btn.style.position = 'absolute';
    btn.style.top = '8px';
    btn.style.right = '12px';
    btn.style.background = 'transparent';
    btn.style.border = '1px solid #ffffff40';
    btn.style.color = '#fff';
    btn.style.padding = '4px 10px';
    btn.style.borderRadius = '6px';
    btn.style.fontSize = '13px';
    btn.style.cursor = 'pointer';
  }

  private styleCollapseBtn(btn: HTMLButtonElement, label: string): void {
    btn.textContent = label;
    btn.style.marginTop = '16px';
    btn.style.background = '#2a2a4a';
    btn.style.color = '#fff';
    btn.style.border = '1px solid #ffffff40';
    btn.style.padding = '8px 14px';
    btn.style.borderRadius = '8px';
    btn.style.fontSize = '13px';
    btn.style.cursor = 'pointer';
    btn.style.width = '100%';
  }

  showMoleculeDetail(mol: MoleculeData): void {
    const atomRows = mol.atoms.map(a =>
      `<div class="atom-list-row">
        <span style="color:${a.color};font-weight:bold;width:20px;display:inline-block;">${a.symbol}</span>
        <span style="flex:1;">(${a.position.x.toFixed(1)}, ${a.position.y.toFixed(1)}, ${a.position.z.toFixed(1)})</span>
        <span>r=${a.radius.toFixed(2)}</span>
      </div>`
    ).join('');

    const bondRows = mol.bonds.map(b =>
      `<div class="bond-list-row">
        <span>${b.atomIndex1}-${b.atomIndex2}</span>
        <span>${b.type === 'double' ? '═ 双键' : '─ 单键'}</span>
      </div>`
    ).join('');

    this.detailContent.innerHTML = `
      <div class="detail-row"><span class="detail-label">名称</span><span class="detail-value">${mol.name}</span></div>
      <div class="detail-row"><span class="detail-label">香调</span><span class="detail-value">${mol.noteTag}</span></div>
      <div class="detail-row"><span class="detail-label">原子数</span><span class="detail-value">${mol.atoms.length}</span></div>
      <div class="detail-row"><span class="detail-label">键数</span><span class="detail-value">${mol.bonds.length}</span></div>
      <div class="detail-row"><span class="detail-label">分子量</span><span class="detail-value">${mol.molecularWeight.toFixed(2)}</span></div>
      <div class="detail-row"><span class="detail-label">挥发性</span><span class="detail-value">${mol.volatility.toFixed(2)}</span></div>
      <div class="section-label">原子列表</div>
      ${atomRows}
      <div class="section-label">键列表</div>
      ${bondRows}
    `;
  }

  clearDetail(): void {
    this.detailContent.innerHTML = '<div class="detail-placeholder">点击分子查看详情</div>';
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
