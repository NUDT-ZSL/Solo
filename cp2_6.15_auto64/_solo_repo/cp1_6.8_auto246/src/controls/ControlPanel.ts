export interface ControlPanelCallbacks {
  onIntensityChange: (value: number) => void;
  onDensityChange: (value: number) => void;
  onReset: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private intensitySlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;

  constructor(callbacks: ControlPanelCallbacks) {
    this.container = this.createContainer();
    const panel = this.createPanel();

    const title = this.createTitle();
    panel.appendChild(title);

    const intensityGroup = this.createSliderGroup(
      "引力波强度",
      0.1,
      3.0,
      1.0,
      0.1,
      (val) => callbacks.onIntensityChange(val)
    );
    this.intensitySlider = intensityGroup.slider;
    panel.appendChild(intensityGroup.group);

    const densityGroup = this.createSliderGroup(
      "粒子密度",
      0.1,
      2.0,
      1.0,
      0.1,
      (val) => callbacks.onDensityChange(val)
    );
    this.densitySlider = densityGroup.slider;
    panel.appendChild(densityGroup.group);

    const resetBtn = this.createResetButton(callbacks.onReset);
    panel.appendChild(resetBtn);

    this.container.appendChild(panel);
    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLDivElement {
    const el = document.createElement("div");
    el.id = "control-panel-container";
    Object.assign(el.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: "100",
      pointerEvents: "auto",
      fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    });
    return el;
  }

  private createPanel(): HTMLDivElement {
    const el = document.createElement("div");
    Object.assign(el.style, {
      background: "rgba(10, 10, 40, 0.55)",
      backdropFilter: "blur(20px) saturate(1.2)",
      WebkitBackdropFilter: "blur(20px) saturate(1.2)",
      border: "1px solid rgba(120, 100, 220, 0.25)",
      borderRadius: "16px",
      padding: "24px 28px",
      minWidth: "240px",
      color: "#d0c8f0",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    });
    return el;
  }

  private createTitle(): HTMLDivElement {
    const el = document.createElement("div");
    el.textContent = "星痕纪元";
    Object.assign(el.style, {
      fontSize: "16px",
      fontWeight: "600",
      letterSpacing: "2px",
      color: "#c0b0f0",
      marginBottom: "20px",
      textAlign: "center",
      textTransform: "uppercase",
    });
    return el;
  }

  private createSliderGroup(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onChange: (val: number) => void
  ): { group: HTMLDivElement; slider: HTMLInputElement } {
    const group = document.createElement("div");
    Object.assign(group.style, {
      marginBottom: "18px",
    });

    const labelRow = document.createElement("div");
    Object.assign(labelRow.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px",
    });

    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    Object.assign(labelEl.style, {
      fontSize: "13px",
      color: "#a098d0",
    });

    const valueEl = document.createElement("span");
    valueEl.textContent = value.toFixed(1);
    Object.assign(valueEl.style, {
      fontSize: "13px",
      color: "#c0b0f0",
      fontWeight: "500",
      fontFamily: "monospace",
    });

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.step = String(step);
    Object.assign(slider.style, {
      width: "100%",
      height: "4px",
      appearance: "none",
      WebkitAppearance: "none",
      background: `linear-gradient(to right, #7c4dff 0%, #7c4dff ${((value - min) / (max - min)) * 100}%, rgba(120,100,220,0.2) ${((value - min) / (max - min)) * 100}%, rgba(120,100,220,0.2) 100%)`,
      borderRadius: "2px",
      outline: "none",
      cursor: "pointer",
    });

    slider.addEventListener("input", () => {
      const val = parseFloat(slider.value);
      valueEl.textContent = val.toFixed(1);
      const pct = ((val - min) / (max - min)) * 100;
      slider.style.background = `linear-gradient(to right, #7c4dff 0%, #7c4dff ${pct}%, rgba(120,100,220,0.2) ${pct}%, rgba(120,100,220,0.2) 100%)`;
      onChange(val);
    });

    const thumbStyle = document.createElement("style");
    thumbStyle.textContent = `
      #control-panel-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #b388ff;
        box-shadow: 0 0 8px rgba(124, 77, 255, 0.6);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      #control-panel-container input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(124, 77, 255, 0.9);
      }
      #control-panel-container input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #b388ff;
        box-shadow: 0 0 8px rgba(124, 77, 255, 0.6);
        cursor: pointer;
        border: none;
      }
    `;
    document.head.appendChild(thumbStyle);

    group.appendChild(labelRow);
    group.appendChild(slider);

    return { group, slider };
  }

  private createResetButton(onReset: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = "重置宇宙";
    Object.assign(btn.style, {
      width: "100%",
      padding: "10px 0",
      marginTop: "6px",
      background: "rgba(124, 77, 255, 0.15)",
      border: "1px solid rgba(124, 77, 255, 0.4)",
      borderRadius: "8px",
      color: "#c0b0f0",
      fontSize: "13px",
      letterSpacing: "1px",
      cursor: "pointer",
      transition: "all 0.25s ease",
      fontFamily: "inherit",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(124, 77, 255, 0.35)";
      btn.style.borderColor = "rgba(179, 136, 255, 0.6)";
      btn.style.boxShadow = "0 0 16px rgba(124, 77, 255, 0.3)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(124, 77, 255, 0.15)";
      btn.style.borderColor = "rgba(124, 77, 255, 0.4)";
      btn.style.boxShadow = "none";
    });
    btn.addEventListener("click", onReset);

    return btn;
  }

  public destroy(): void {
    this.container.remove();
  }
}
