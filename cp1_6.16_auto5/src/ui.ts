import { PlanetInfo } from './solarSystem';

export interface UIEventCallbacks {
  onSpeedChange: (speed: number) => void;
  onPlanetSelect: (planetId: string | null) => void;
  onConstellationToggle: (visible: boolean) => void;
  onTrackPlanet: () => void;
  onClearTrajectory: () => void;
  onClosePanel: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UIEventCallbacks;
  private infoPanel: HTMLElement | null = null;
  private controlBar: HTMLElement | null = null;
  private constellationBtn: HTMLElement | null = null;
  private title: HTMLElement | null = null;
  private speedSlider: HTMLInputElement | null = null;
  private speedDisplay: HTMLElement | null = null;
  private dateTimeDisplay: HTMLElement | null = null;
  private trackBtn: HTMLButtonElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;
  private constellationsVisible: boolean = true;
  private speedOptions: number[] = [0.5, 1, 2, 5, 10];

  constructor(container: HTMLElement, callbacks: UIEventCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.createUI();
    this.bindEvents();
  }

  private createUI(): void {
    this.createTitle();
    this.createConstellationButton();
    this.createControlBar();
    this.createInfoPanel();
  }

  private createTitle(): void {
    this.title = document.createElement('div');
    this.title.textContent = 'Solar System Explorer';
    this.title.style.position = 'absolute';
    this.title.style.top = '1.5rem';
    this.title.style.left = '1.5rem';
    this.title.style.color = '#E2E8F0';
    this.title.style.fontFamily = 'Georgia, serif';
    this.title.style.fontSize = '0.8rem';
    this.title.style.letterSpacing = '0.05em';
    this.title.style.textShadow = '0 0.1rem 0.2rem rgba(0, 0, 0, 0.5)';
    this.title.style.zIndex = '100';
    this.title.style.pointerEvents = 'none';
    this.title.style.opacity = '0';
    this.title.style.transition = 'opacity 0.2s ease';
    this.container.appendChild(this.title);

    requestAnimationFrame(() => {
      if (this.title) {
        this.title.style.opacity = '1';
      }
    });
  }

  private createConstellationButton(): void {
    this.constellationBtn = document.createElement('button');
    this.constellationBtn.textContent = '星座 ON';
    this.constellationBtn.style.position = 'absolute';
    this.constellationBtn.style.top = '1.5rem';
    this.constellationBtn.style.right = '1.5rem';
    this.constellationBtn.style.padding = '0.6rem 1.2rem';
    this.constellationBtn.style.backgroundColor = '#1F2833';
    this.constellationBtn.style.color = '#45A29E';
    this.constellationBtn.style.border = 'none';
    this.constellationBtn.style.borderRadius = '8px';
    this.constellationBtn.style.fontFamily = 'Georgia, serif';
    this.constellationBtn.style.fontSize = '0.85rem';
    this.constellationBtn.style.cursor = 'pointer';
    this.constellationBtn.style.zIndex = '100';
    this.constellationBtn.style.transition = 'all 0.2s ease';
    this.constellationBtn.style.opacity = '0';
    this.container.appendChild(this.constellationBtn);

    requestAnimationFrame(() => {
      if (this.constellationBtn) {
        this.constellationBtn.style.opacity = '1';
      }
    });
  }

  private createControlBar(): void {
    this.controlBar = document.createElement('div');
    this.controlBar.style.position = 'absolute';
    this.controlBar.style.bottom = '2%';
    this.controlBar.style.left = '5%';
    this.controlBar.style.right = '5%';
    this.controlBar.style.display = 'flex';
    this.controlBar.style.alignItems = 'center';
    this.controlBar.style.justifyContent = 'center';
    this.controlBar.style.flexWrap = 'wrap';
    this.controlBar.style.gap = '1.5rem';
    this.controlBar.style.padding = '1rem 2rem';
    this.controlBar.style.backgroundColor = 'rgba(26, 26, 46, 0.85)';
    this.controlBar.style.backdropFilter = 'blur(10px)';
    this.controlBar.style.borderRadius = '12px';
    this.controlBar.style.zIndex = '100';
    this.controlBar.style.opacity = '0';
    this.controlBar.style.transition = 'opacity 0.2s ease';

    this.dateTimeDisplay = document.createElement('div');
    this.dateTimeDisplay.style.color = '#E2E8F0';
    this.dateTimeDisplay.style.fontFamily = 'Georgia, serif';
    this.dateTimeDisplay.style.fontSize = '0.9rem';
    this.dateTimeDisplay.style.minWidth = '180px';
    this.dateTimeDisplay.textContent = '2024-01-01 00:00';

    const speedControl = document.createElement('div');
    speedControl.style.display = 'flex';
    speedControl.style.alignItems = 'center';
    speedControl.style.gap = '0.8rem';

    const speedLabel = document.createElement('span');
    speedLabel.style.color = '#A9B2C3';
    speedLabel.style.fontFamily = 'Georgia, serif';
    speedLabel.style.fontSize = '0.85rem';
    speedLabel.textContent = '速度:';

    this.speedSlider = document.createElement('input');
    this.speedSlider.type = 'range';
    this.speedSlider.min = '0';
    this.speedSlider.max = (this.speedOptions.length - 1).toString();
    this.speedSlider.step = '1';
    this.speedSlider.value = '1';
    this.speedSlider.style.width = '150px';
    this.speedSlider.style.height = '6px';
    this.speedSlider.style.appearance = 'none';
    this.speedSlider.style.backgroundColor = '#2C3E50';
    this.speedSlider.style.borderRadius = '3px';
    this.speedSlider.style.outline = 'none';
    this.speedSlider.style.cursor = 'pointer';
    this.speedSlider.style.transition = 'all 0.2s ease';

    this.speedDisplay = document.createElement('span');
    this.speedDisplay.style.color = '#3498DB';
    this.speedDisplay.style.fontFamily = 'Georgia, serif';
    this.speedDisplay.style.fontSize = '0.85rem';
    this.speedDisplay.style.fontWeight = 'bold';
    this.speedDisplay.style.minWidth = '40px';
    this.speedDisplay.textContent = '1x';

    speedControl.appendChild(speedLabel);
    speedControl.appendChild(this.speedSlider);
    speedControl.appendChild(this.speedDisplay);

    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '0.8rem';

    this.trackBtn = document.createElement('button') as HTMLButtonElement;
    this.trackBtn.textContent = '轨迹追踪';
    this.trackBtn.style.padding = '0.5rem 1rem';
    this.trackBtn.style.backgroundColor = '#1F2833';
    this.trackBtn.style.color = '#45A29E';
    this.trackBtn.style.border = 'none';
    this.trackBtn.style.borderRadius = '6px';
    this.trackBtn.style.fontFamily = 'Georgia, serif';
    this.trackBtn.style.fontSize = '0.8rem';
    this.trackBtn.style.cursor = 'pointer';
    this.trackBtn.style.transition = 'all 0.2s ease';
    this.trackBtn.disabled = true;
    this.trackBtn.style.opacity = '0.5';

    this.clearBtn = document.createElement('button') as HTMLButtonElement;
    this.clearBtn.textContent = '清除轨迹';
    this.clearBtn.style.padding = '0.5rem 1rem';
    this.clearBtn.style.backgroundColor = '#1F2833';
    this.clearBtn.style.color = '#E94560';
    this.clearBtn.style.border = 'none';
    this.clearBtn.style.borderRadius = '6px';
    this.clearBtn.style.fontFamily = 'Georgia, serif';
    this.clearBtn.style.fontSize = '0.8rem';
    this.clearBtn.style.cursor = 'pointer';
    this.clearBtn.style.transition = 'all 0.2s ease';
    this.clearBtn.disabled = true;
    this.clearBtn.style.opacity = '0.5';

    buttonGroup.appendChild(this.trackBtn);
    buttonGroup.appendChild(this.clearBtn);

    this.controlBar.appendChild(this.dateTimeDisplay);
    this.controlBar.appendChild(speedControl);
    this.controlBar.appendChild(buttonGroup);

    this.container.appendChild(this.controlBar);

    requestAnimationFrame(() => {
      if (this.controlBar) {
        this.controlBar.style.opacity = '1';
      }
    });
  }

  private createInfoPanel(): void {
    this.infoPanel = document.createElement('div');
    this.infoPanel.style.position = 'absolute';
    this.infoPanel.style.bottom = '120px';
    this.infoPanel.style.right = '2rem';
    this.infoPanel.style.width = '320px';
    this.infoPanel.style.maxWidth = '90vw';
    this.infoPanel.style.padding = '1.5rem';
    this.infoPanel.style.backgroundColor = 'rgba(26, 26, 46, 0.9)';
    this.infoPanel.style.backdropFilter = 'blur(15px)';
    this.infoPanel.style.borderRadius = '12px';
    this.infoPanel.style.color = '#ffffff';
    this.infoPanel.style.fontFamily = 'Georgia, serif';
    this.infoPanel.style.zIndex = '100';
    this.infoPanel.style.transform = 'translateX(120%)';
    this.infoPanel.style.opacity = '0';
    this.infoPanel.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    this.infoPanel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    this.infoPanel.style.display = 'none';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '0.8rem';
    closeBtn.style.right = '1rem';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#A9B2C3';
    closeBtn.style.fontSize = '1.5rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.transition = 'color 0.2s ease';
    closeBtn.addEventListener('click', () => {
      this.callbacks.onClosePanel();
    });

    this.infoPanel.appendChild(closeBtn);
    this.container.appendChild(this.infoPanel);
  }

  private bindEvents(): void {
    if (this.constellationBtn) {
      this.constellationBtn.addEventListener('click', () => {
        this.constellationsVisible = !this.constellationsVisible;
        this.updateConstellationButton();
        this.callbacks.onConstellationToggle(this.constellationsVisible);
      });

      this.constellationBtn.addEventListener('mouseenter', () => {
        if (this.constellationBtn) {
          this.constellationBtn.style.boxShadow = '0 0 10px rgba(102, 252, 241, 0.5)';
        }
      });

      this.constellationBtn.addEventListener('mouseleave', () => {
        if (this.constellationBtn) {
          this.constellationBtn.style.boxShadow = 'none';
        }
      });
    }

    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const index = parseInt((e.target as HTMLInputElement).value);
        const speed = this.speedOptions[index];
        this.updateSpeedDisplay(speed);
        this.callbacks.onSpeedChange(speed);
      });

      this.speedSlider.addEventListener('mouseenter', () => {
        if (this.speedSlider) {
          this.speedSlider.style.boxShadow = '0 0 10px rgba(102, 252, 241, 0.5)';
        }
      });

      this.speedSlider.addEventListener('mouseleave', () => {
        if (this.speedSlider) {
          this.speedSlider.style.boxShadow = 'none';
        }
      });
    }

    if (this.trackBtn) {
      this.trackBtn.addEventListener('click', () => {
        this.callbacks.onTrackPlanet();
      });

      this.trackBtn.addEventListener('mouseenter', () => {
        if (this.trackBtn && !this.trackBtn.disabled) {
          this.trackBtn.style.boxShadow = '0 0 10px rgba(102, 252, 241, 0.5)';
        }
      });

      this.trackBtn.addEventListener('mouseleave', () => {
        if (this.trackBtn) {
          this.trackBtn.style.boxShadow = 'none';
        }
      });
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        this.callbacks.onClearTrajectory();
      });

      this.clearBtn.addEventListener('mouseenter', () => {
        if (this.clearBtn && !this.clearBtn.disabled) {
          this.clearBtn.style.boxShadow = '0 0 10px rgba(102, 252, 241, 0.5)';
        }
      });

      this.clearBtn.addEventListener('mouseleave', () => {
        if (this.clearBtn) {
          this.clearBtn.style.boxShadow = 'none';
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.callbacks.onClosePanel();
      }
    });
  }

  private updateConstellationButton(): void {
    if (!this.constellationBtn) return;

    if (this.constellationsVisible) {
      this.constellationBtn.textContent = '星座 ON';
      this.constellationBtn.style.backgroundColor = '#45A29E';
      this.constellationBtn.style.color = '#ffffff';
    } else {
      this.constellationBtn.textContent = '星座 OFF';
      this.constellationBtn.style.backgroundColor = '#1F2833';
      this.constellationBtn.style.color = '#45A29E';
    }
  }

  private updateSpeedDisplay(speed: number): void {
    if (this.speedDisplay) {
      this.speedDisplay.textContent = `${speed}x`;
    }
  }

  public showInfoPanel(planetInfo: PlanetInfo, planetColor: string): void {
    if (!this.infoPanel) return;

    this.infoPanel.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '0.8rem';
    closeBtn.style.right = '1rem';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#A9B2C3';
    closeBtn.style.fontSize = '1.5rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.transition = 'color 0.2s ease';
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#ffffff';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#A9B2C3';
    });
    closeBtn.addEventListener('click', () => {
      this.callbacks.onClosePanel();
    });

    const title = document.createElement('h2');
    title.textContent = planetInfo.name;
    title.style.margin = '0 0 1.2rem 0';
    title.style.fontSize = '1.5rem';
    title.style.color = planetColor;
    title.style.textShadow = `0 0 15px ${planetColor}40`;

    const createInfoRow = (label: string, value: string, unit?: string) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '0.6rem 0';
      row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';

      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      labelEl.style.color = '#A9B2C3';
      labelEl.style.fontSize = '0.85rem';

      const valueContainer = document.createElement('span');

      const valueEl = document.createElement('span');
      valueEl.textContent = value;
      valueEl.style.color = '#E94560';
      valueEl.style.fontWeight = 'bold';

      valueContainer.appendChild(valueEl);

      if (unit) {
        const unitEl = document.createElement('span');
        unitEl.textContent = ` ${unit}`;
        unitEl.style.color = '#A9B2C3';
        unitEl.style.fontSize = '0.85rem';
        valueContainer.appendChild(unitEl);
      }

      row.appendChild(labelEl);
      row.appendChild(valueContainer);
      return row;
    };

    this.infoPanel.appendChild(closeBtn);
    this.infoPanel.appendChild(title);
    this.infoPanel.appendChild(createInfoRow('公转周期', planetInfo.orbitalPeriod.toLocaleString(), '地球日'));
    this.infoPanel.appendChild(createInfoRow('自转周期', planetInfo.rotationPeriod.toLocaleString(), '小时'));
    this.infoPanel.appendChild(createInfoRow('与太阳距离', planetInfo.distanceFromSun.toLocaleString(), '百万公里'));
    this.infoPanel.appendChild(createInfoRow('表面温度', planetInfo.temperatureRange, '℃'));
    this.infoPanel.appendChild(createInfoRow('卫星数量', planetInfo.satelliteCount.toLocaleString(), '颗'));

    this.infoPanel.style.display = 'block';
    requestAnimationFrame(() => {
      if (this.infoPanel) {
        this.infoPanel.style.transform = 'translateX(0)';
        this.infoPanel.style.opacity = '1';
      }
    });
  }

  public hideInfoPanel(): void {
    if (!this.infoPanel) return;

    this.infoPanel.style.transform = 'translateX(120%)';
    this.infoPanel.style.opacity = '0';

    setTimeout(() => {
      if (this.infoPanel) {
        this.infoPanel.style.display = 'none';
      }
    }, 200);
  }

  public updateDateTime(date: Date): void {
    if (!this.dateTimeDisplay) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    this.dateTimeDisplay.textContent = `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  public setSelectedPlanet(planetId: string | null): void {

    if (this.trackBtn) {
      this.trackBtn.disabled = !planetId;
      this.trackBtn.style.opacity = planetId ? '1' : '0.5';
    }
  }

  public setTrackingActive(active: boolean): void {
    if (this.trackBtn) {
      if (active) {
        this.trackBtn.textContent = '追踪中...';
        this.trackBtn.style.backgroundColor = '#45A29E';
        this.trackBtn.style.color = '#ffffff';
      } else {
        this.trackBtn.textContent = '轨迹追踪';
        this.trackBtn.style.backgroundColor = '#1F2833';
        this.trackBtn.style.color = '#45A29E';
      }
    }

    if (this.clearBtn) {
      this.clearBtn.disabled = !active;
      this.clearBtn.style.opacity = active ? '1' : '0.5';
    }
  }

  public setConstellationsVisible(visible: boolean): void {
    this.constellationsVisible = visible;
    this.updateConstellationButton();
  }

  public dispose(): void {
    if (this.title) this.title.remove();
    if (this.constellationBtn) this.constellationBtn.remove();
    if (this.controlBar) this.controlBar.remove();
    if (this.infoPanel) this.infoPanel.remove();
  }
}
