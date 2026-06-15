import { MaterialType } from './particles';

export interface UIEvents {
  onMaterialChange: (material: MaterialType) => void;
  onSpeedChange: (speed: number) => void;
  onRateChange: (rate: number) => void;
  onReset: () => void;
}

export class UIController {
  private events: UIEvents;

  constructor(events: UIEvents) {
    this.events = events;
    this.bindEvents();
  }

  private bindEvents(): void {
    const materialBtns = document.querySelectorAll('.material-btn');
    materialBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mat = (btn as HTMLElement).dataset.material as MaterialType;
        if (!mat) return;

        materialBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        this.events.onMaterialChange(mat);
      });
    });

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value') as HTMLElement;
    if (speedSlider && speedValue) {
      speedSlider.addEventListener('input', () => {
        const val = parseFloat(speedSlider.value);
        speedValue.textContent = val.toFixed(1);
        this.events.onSpeedChange(val);

        const mobileSlider = document.getElementById('speed-slider-mobile') as HTMLInputElement;
        const mobileValue = document.getElementById('speed-value-mobile') as HTMLElement;
        if (mobileSlider) mobileSlider.value = speedSlider.value;
        if (mobileValue) mobileValue.textContent = val.toFixed(1);
      });
    }

    const speedSliderMobile = document.getElementById('speed-slider-mobile') as HTMLInputElement;
    const speedValueMobile = document.getElementById('speed-value-mobile') as HTMLElement;
    if (speedSliderMobile && speedValueMobile) {
      speedSliderMobile.addEventListener('input', () => {
        const val = parseFloat(speedSliderMobile.value);
        speedValueMobile.textContent = val.toFixed(1);
        this.events.onSpeedChange(val);

        if (speedSlider) speedSlider.value = speedSliderMobile.value;
        if (speedValue) speedValue.textContent = val.toFixed(1);
      });
    }

    const rateSlider = document.getElementById('rate-slider') as HTMLInputElement;
    const rateValue = document.getElementById('rate-value') as HTMLElement;
    if (rateSlider && rateValue) {
      rateSlider.addEventListener('input', () => {
        const val = parseInt(rateSlider.value, 10);
        rateValue.textContent = val.toString();
        this.events.onRateChange(val);

        const mobileSlider = document.getElementById('rate-slider-mobile') as HTMLInputElement;
        const mobileValue = document.getElementById('rate-value-mobile') as HTMLElement;
        if (mobileSlider) mobileSlider.value = rateSlider.value;
        if (mobileValue) mobileValue.textContent = val.toString();
      });
    }

    const rateSliderMobile = document.getElementById('rate-slider-mobile') as HTMLInputElement;
    const rateValueMobile = document.getElementById('rate-value-mobile') as HTMLElement;
    if (rateSliderMobile && rateValueMobile) {
      rateSliderMobile.addEventListener('input', () => {
        const val = parseInt(rateSliderMobile.value, 10);
        rateValueMobile.textContent = val.toString();
        this.events.onRateChange(val);

        if (rateSlider) rateSlider.value = rateSliderMobile.value;
        if (rateValue) rateValue.textContent = val.toString();
      });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.events.onReset();
      });
    }

    const speedPopupBtn = document.getElementById('speed-popup-btn');
    const speedPopup = document.getElementById('speed-popup');
    if (speedPopupBtn && speedPopup) {
      speedPopupBtn.addEventListener('click', () => {
        speedPopup.classList.toggle('show');
        document.getElementById('rate-popup')?.classList.remove('show');
      });
    }

    const ratePopupBtn = document.getElementById('rate-popup-btn');
    const ratePopup = document.getElementById('rate-popup');
    if (ratePopupBtn && ratePopup) {
      ratePopupBtn.addEventListener('click', () => {
        ratePopup.classList.toggle('show');
        document.getElementById('speed-popup')?.classList.remove('show');
      });
    }

    const closeBtns = document.querySelectorAll('.popup-close');
    closeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset.close;
        if (targetId) {
          document.getElementById(targetId)?.classList.remove('show');
        }
      });
    });
  }

  resetUI(): void {
    const materialBtns = document.querySelectorAll('.material-btn');
    materialBtns.forEach((b) => b.classList.remove('active'));
    const waterBtn = document.querySelector('.material-btn.water');
    waterBtn?.classList.add('active');

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value') as HTMLElement;
    const speedSliderMobile = document.getElementById('speed-slider-mobile') as HTMLInputElement;
    const speedValueMobile = document.getElementById('speed-value-mobile') as HTMLElement;
    if (speedSlider) {
      speedSlider.value = '1.0';
      if (speedSliderMobile) speedSliderMobile.value = '1.0';
      if (speedValue) speedValue.textContent = '1.0';
      if (speedValueMobile) speedValueMobile.textContent = '1.0';
    }

    const rateSlider = document.getElementById('rate-slider') as HTMLInputElement;
    const rateValue = document.getElementById('rate-value') as HTMLElement;
    const rateSliderMobile = document.getElementById('rate-slider-mobile') as HTMLInputElement;
    const rateValueMobile = document.getElementById('rate-value-mobile') as HTMLElement;
    if (rateSlider) {
      rateSlider.value = '300';
      if (rateSliderMobile) rateSliderMobile.value = '300';
      if (rateValue) rateValue.textContent = '300';
      if (rateValueMobile) rateValueMobile.textContent = '300';
    }
  }
}
