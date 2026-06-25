import { LightController, WeatherMode } from './lightController';

const SLIDER_WIDTH = 200;
const SLIDER_HEIGHT = 8;
const SLIDER_BORDER_RADIUS = 4;
const THUMB_DIAMETER = 16;
const THUMB_BG = '#ffb74d';
const BTN_DIAMETER = 40;
const BTN_GAP = 12;

const WEATHER_ICONS: Record<WeatherMode, { icon: string; bg: string; label: string }> = {
  sunny: { icon: '☀', bg: '#ffecb3', label: '晴天' },
  cloudy: { icon: '☁', bg: '#cfd8dc', label: '多云' },
  dusk: { icon: '🌅', bg: '#ffe0b2', label: '黄昏' },
};

function createSlider(
  label: string,
  min: number,
  max: number,
  value: number,
  isVertical: boolean,
  onChange: (val: number) => void
): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `margin-bottom:16px;`;

  const lbl = document.createElement('div');
  lbl.textContent = label;
  lbl.style.cssText = `color:#b0bec5;font-size:13px;margin-bottom:8px;font-family:sans-serif;`;
  wrapper.appendChild(lbl);

  const sliderContainer = document.createElement('div');
  sliderContainer.style.cssText = `
    position: relative;
    width: ${SLIDER_WIDTH}px;
    height: ${isVertical ? SLIDER_WIDTH : SLIDER_HEIGHT}px;
    cursor: pointer;
    user-select: none;
  `;

  const track = document.createElement('div');
  track.style.cssText = `
    position: absolute;
    ${isVertical ? 'width' : 'height'}: ${SLIDER_HEIGHT}px;
    ${isVertical ? 'height' : 'width'}: ${SLIDER_WIDTH}px;
    background: #546e7a;
    border-radius: ${SLIDER_BORDER_RADIUS}px;
    ${isVertical ? 'left:50%;transform:translateX(-50%);' : 'top:50%;transform:translateY(-50%);'}
  `;
  sliderContainer.appendChild(track);

  const fill = document.createElement('div');
  fill.style.cssText = `
    position: absolute;
    ${isVertical ? 'width' : 'height'}: ${SLIDER_HEIGHT}px;
    background: ${THUMB_BG};
    border-radius: ${SLIDER_BORDER_RADIUS}px;
    ${isVertical ? 'left:50%;transform:translateX(-50%);bottom:0;' : 'top:50%;transform:translateY(-50%);left:0;'}
    pointer-events: none;
  `;
  sliderContainer.appendChild(fill);

  const thumb = document.createElement('div');
  thumb.style.cssText = `
    position: absolute;
    width: ${THUMB_DIAMETER}px;
    height: ${THUMB_DIAMETER}px;
    border-radius: 50%;
    background: ${THUMB_BG};
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    transform: translate(-50%, -50%);
    cursor: grab;
    z-index: 2;
    transition: box-shadow 0.15s;
  `;
  sliderContainer.appendChild(thumb);

  const updateSlider = (val: number) => {
    const pct = (val - min) / (max - min);
    if (isVertical) {
      thumb.style.left = '50%';
      thumb.style.top = `${(1 - pct) * SLIDER_WIDTH}px`;
      fill.style.height = `${pct * SLIDER_WIDTH}px`;
    } else {
      thumb.style.left = `${pct * SLIDER_WIDTH}px`;
      thumb.style.top = '50%';
      fill.style.width = `${pct * SLIDER_WIDTH}px`;
    }
  };

  updateSlider(value);

  let dragging = false;

  const getVal = (clientX: number, clientY: number): number => {
    const rect = sliderContainer.getBoundingClientRect();
    let pct: number;
    if (isVertical) {
      pct = 1 - (clientY - rect.top) / rect.height;
    } else {
      pct = (clientX - rect.left) / rect.width;
    }
    pct = Math.max(0, Math.min(1, pct));
    return min + pct * (max - min);
  };

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    dragging = true;
    thumb.style.cursor = 'grabbing';
    const val = getVal(e.clientX, e.clientY);
    updateSlider(val);
    onChange(val);
    const onPointerMove = (ev: PointerEvent) => {
      if (!dragging) return;
      const v = getVal(ev.clientX, ev.clientY);
      updateSlider(v);
      onChange(v);
    };
    const onPointerUp = () => {
      dragging = false;
      thumb.style.cursor = 'grab';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  sliderContainer.addEventListener('pointerdown', onPointerDown);

  wrapper.appendChild(sliderContainer);
  return wrapper;
}

function createWeatherButtons(
  lightController: LightController
): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `display:flex;gap:${BTN_GAP}px;align-items:center;`;

  const modes: WeatherMode[] = ['sunny', 'cloudy', 'dusk'];
  let activeBtn: HTMLButtonElement | null = null;

  modes.forEach((mode) => {
    const { icon, bg, label } = WEATHER_ICONS[mode];
    const btn = document.createElement('button');
    btn.style.cssText = `
      width: ${BTN_DIAMETER}px;
      height: ${BTN_DIAMETER}px;
      border-radius: 50%;
      border: 2px solid transparent;
      background: ${bg};
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      outline: none;
    `;
    btn.textContent = icon;
    btn.title = label;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 0 8px #ffb74d';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      if (activeBtn !== btn) {
        btn.style.boxShadow = 'none';
      }
    });

    btn.addEventListener('click', () => {
      if (activeBtn) {
        activeBtn.style.borderColor = 'transparent';
        activeBtn.style.boxShadow = 'none';
      }
      activeBtn = btn;
      btn.style.borderColor = '#ffb74d';
      btn.style.boxShadow = '0 0 8px #ffb74d';
      lightController.setWeather(mode);
    });

    if (mode === 'sunny') {
      activeBtn = btn;
      btn.style.borderColor = '#ffb74d';
      btn.style.boxShadow = '0 0 8px #ffb74d';
    }

    container.appendChild(btn);
  });

  return container;
}

export function createUI(lightController: LightController): void {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    width: 280px;
    background: rgba(55, 71, 79, 0.9);
    border-radius: 16px;
    padding: 16px;
    z-index: 100;
    font-family: sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  `;

  const title = document.createElement('div');
  title.textContent = '光影控制';
  title.style.cssText = `
    color: #ffffff;
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 16px;
  `;
  panel.appendChild(title);

  const azimuthSlider = createSlider(
    '太阳方位角',
    0,
    360,
    lightController.getSunAngles().azimuth,
    false,
    (val) => lightController.setAzimuth(val)
  );
  panel.appendChild(azimuthSlider);

  const elevationSlider = createSlider(
    '太阳高度角',
    0,
    90,
    lightController.getSunAngles().elevation,
    true,
    (val) => lightController.setElevation(val)
  );
  panel.appendChild(elevationSlider);

  const weatherLabel = document.createElement('div');
  weatherLabel.textContent = '天气模式';
  weatherLabel.style.cssText = `
    color: #b0bec5;
    font-size: 13px;
    margin-bottom: 8px;
  `;
  panel.appendChild(weatherLabel);

  const weatherButtons = createWeatherButtons(lightController);
  panel.appendChild(weatherButtons);

  document.body.appendChild(panel);
}
