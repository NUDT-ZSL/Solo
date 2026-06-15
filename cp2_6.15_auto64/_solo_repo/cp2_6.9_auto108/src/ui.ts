export interface UIControllers {
  globalLightIntensity: number;
  creatureDensity: number;
  isDayMode: boolean;
  animationEnabled: boolean;
  onLightChange: (value: number) => void;
  onDensityChange: (value: number) => void;
  onDayNightToggle: (isDay: boolean) => void;
  onAnimationToggle: (enabled: boolean) => void;
}

export interface UIUpdateData {
  totalCreatures: number;
  fungusCount: number;
  wormCount: number;
  mothCount: number;
  avgBrightness: number;
  fps: number;
  selectedCreatureType: string | null;
  selectedCreatureBrightness: number | null;
  selectedCreatureScreenPos: { x: number; y: number } | null;
}

export function createUI(controllers: UIControllers) {
  const lightSlider = document.getElementById('light-slider') as HTMLInputElement;
  const lightValue = document.getElementById('light-value') as HTMLElement;
  const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
  const densityValue = document.getElementById('density-value') as HTMLElement;
  const dayBtn = document.getElementById('day-btn') as HTMLButtonElement;
  const nightBtn = document.getElementById('night-btn') as HTMLButtonElement;
  const animationToggle = document.getElementById('animation-toggle') as HTMLElement;
  const fpsCounter = document.getElementById('fps-counter') as HTMLElement;
  const statTotal = document.getElementById('stat-total') as HTMLElement;
  const statFungus = document.getElementById('stat-fungus') as HTMLElement;
  const statWorm = document.getElementById('stat-worm') as HTMLElement;
  const statMoth = document.getElementById('stat-moth') as HTMLElement;
  const statBrightness = document.getElementById('stat-brightness') as HTMLElement;
  const infoLabel = document.getElementById('info-label') as HTMLElement;
  const panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;
  const mobileOverlay = document.getElementById('mobile-overlay') as HTMLElement;
  const closeOverlay = document.getElementById('close-overlay') as HTMLButtonElement;
  const mobilePanel = document.getElementById('mobile-panel') as HTMLElement;
  const controlPanel = document.getElementById('control-panel') as HTMLElement;

  lightSlider.value = String(controllers.globalLightIntensity);
  lightValue.textContent = `${controllers.globalLightIntensity}%`;
  densitySlider.value = String(controllers.creatureDensity);
  densityValue.textContent = `${controllers.creatureDensity}%`;

  if (controllers.isDayMode) {
    dayBtn.classList.add('active');
    nightBtn.classList.remove('active');
  } else {
    dayBtn.classList.remove('active');
    nightBtn.classList.add('active');
  }

  if (controllers.animationEnabled) {
    animationToggle.classList.add('on');
  } else {
    animationToggle.classList.remove('on');
  }

  lightSlider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value);
    controllers.globalLightIntensity = value;
    lightValue.textContent = `${value}%`;
    controllers.onLightChange(value);
  });

  densitySlider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value);
    controllers.creatureDensity = value;
    densityValue.textContent = `${value}%`;
    controllers.onDensityChange(value);
  });

  dayBtn.addEventListener('click', () => {
    controllers.isDayMode = true;
    dayBtn.classList.add('active');
    nightBtn.classList.remove('active');
    controllers.onDayNightToggle(true);
  });

  nightBtn.addEventListener('click', () => {
    controllers.isDayMode = false;
    dayBtn.classList.remove('active');
    nightBtn.classList.add('active');
    controllers.onDayNightToggle(false);
  });

  animationToggle.addEventListener('click', () => {
    controllers.animationEnabled = !controllers.animationEnabled;
    if (controllers.animationEnabled) {
      animationToggle.classList.add('on');
    } else {
      animationToggle.classList.remove('on');
    }
    controllers.onAnimationToggle(controllers.animationEnabled);
  });

  function setupMobilePanel() {
    if (mobilePanel && controlPanel) {
      mobilePanel.innerHTML = controlPanel.innerHTML;

      const mLightSlider = mobilePanel.querySelector('#light-slider') as HTMLInputElement;
      const mLightValue = mobilePanel.querySelector('#light-value') as HTMLElement;
      const mDensitySlider = mobilePanel.querySelector('#density-slider') as HTMLInputElement;
      const mDensityValue = mobilePanel.querySelector('#density-value') as HTMLElement;
      const mDayBtn = mobilePanel.querySelector('#day-btn') as HTMLButtonElement;
      const mNightBtn = mobilePanel.querySelector('#night-btn') as HTMLButtonElement;
      const mAnimationToggle = mobilePanel.querySelector('#animation-toggle') as HTMLElement;

      if (mLightSlider && mLightValue) {
        mLightSlider.value = String(controllers.globalLightIntensity);
        mLightValue.textContent = `${controllers.globalLightIntensity}%`;
        mLightSlider.addEventListener('input', (e) => {
          const value = parseInt((e.target as HTMLInputElement).value);
          controllers.globalLightIntensity = value;
          mLightValue.textContent = `${value}%`;
          lightSlider.value = String(value);
          lightValue.textContent = `${value}%`;
          controllers.onLightChange(value);
        });
      }

      if (mDensitySlider && mDensityValue) {
        mDensitySlider.value = String(controllers.creatureDensity);
        mDensityValue.textContent = `${controllers.creatureDensity}%`;
        mDensitySlider.addEventListener('input', (e) => {
          const value = parseInt((e.target as HTMLInputElement).value);
          controllers.creatureDensity = value;
          mDensityValue.textContent = `${value}%`;
          densitySlider.value = String(value);
          densityValue.textContent = `${value}%`;
          controllers.onDensityChange(value);
        });
      }

      if (mDayBtn && mNightBtn) {
        if (controllers.isDayMode) {
          mDayBtn.classList.add('active');
          mNightBtn.classList.remove('active');
        } else {
          mDayBtn.classList.remove('active');
          mNightBtn.classList.add('active');
        }
        mDayBtn.addEventListener('click', () => {
          controllers.isDayMode = true;
          mDayBtn.classList.add('active');
          mNightBtn.classList.remove('active');
          dayBtn.classList.add('active');
          nightBtn.classList.remove('active');
          controllers.onDayNightToggle(true);
        });
        mNightBtn.addEventListener('click', () => {
          controllers.isDayMode = false;
          mDayBtn.classList.remove('active');
          mNightBtn.classList.add('active');
          dayBtn.classList.remove('active');
          nightBtn.classList.add('active');
          controllers.onDayNightToggle(false);
        });
      }

      if (mAnimationToggle) {
        if (controllers.animationEnabled) {
          mAnimationToggle.classList.add('on');
        } else {
          mAnimationToggle.classList.remove('on');
        }
        mAnimationToggle.addEventListener('click', () => {
          controllers.animationEnabled = !controllers.animationEnabled;
          if (controllers.animationEnabled) {
            mAnimationToggle.classList.add('on');
            animationToggle.classList.add('on');
          } else {
            mAnimationToggle.classList.remove('on');
            animationToggle.classList.remove('on');
          }
          controllers.onAnimationToggle(controllers.animationEnabled);
        });
      }
    }
  }

  panelToggle.addEventListener('click', () => {
    setupMobilePanel();
    mobileOverlay.classList.add('open');
  });

  closeOverlay.addEventListener('click', () => {
    mobileOverlay.classList.remove('open');
  });

  mobileOverlay.addEventListener('click', (e) => {
    if (e.target === mobileOverlay) {
      mobileOverlay.classList.remove('open');
    }
  });

  let lastStatsUpdate = 0;
  const STATS_UPDATE_INTERVAL = 1000;

  function update(data: UIUpdateData, time: number) {
    fpsCounter.textContent = `FPS: ${Math.round(data.fps)}`;
    if (data.fps < 30) {
      fpsCounter.classList.add('low');
    } else {
      fpsCounter.classList.remove('low');
    }

    if (time - lastStatsUpdate >= STATS_UPDATE_INTERVAL) {
      statTotal.textContent = String(data.totalCreatures);
      statFungus.textContent = String(data.fungusCount);
      statWorm.textContent = String(data.wormCount);
      statMoth.textContent = String(data.mothCount);
      statBrightness.textContent = `${Math.round(data.avgBrightness)}%`;
      lastStatsUpdate = time;
    }

    if (data.selectedCreatureType && data.selectedCreatureScreenPos) {
      const typeNames: Record<string, string> = {
        'fungus': '荧光真菌',
        'worm': '发光蠕虫',
        'moth': '散射飞蛾',
      };
      const typeName = typeNames[data.selectedCreatureType] || data.selectedCreatureType;
      const brightness = Math.round(data.selectedCreatureBrightness || 0);
      infoLabel.innerHTML = `<strong>${typeName}</strong><br>亮度: ${brightness}%`;
      infoLabel.style.display = 'block';
      infoLabel.style.left = `${data.selectedCreatureScreenPos.x + 15}px`;
      infoLabel.style.top = `${data.selectedCreatureScreenPos.y - 10}px`;
    } else {
      infoLabel.style.display = 'none';
    }
  }

  return { update };
}
