import { Metronome, type PatternType } from './metronome';
import { Scorer, type Judgment } from './scorer';
import { Renderer } from './renderer';

type AppState = 'IDLE' | 'PLAYING' | 'FINISHED';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

class RhythmTrainer {
  private state: AppState = 'IDLE';
  private metronome: Metronome;
  private scorer: Scorer;
  private renderer: Renderer;

  private bpmSlider: HTMLInputElement;
  private bpmValue: HTMLElement;
  private patternSelect: HTMLSelectElement;
  private durationSelect: HTMLSelectElement;
  private btnStart: HTMLButtonElement;
  private judgmentText: HTMLElement;
  private overlayHint: HTMLElement;
  private floatAccuracy: HTMLElement;
  private floatCombo: HTMLElement;
  private statAccuracy: HTMLElement;
  private statCombo: HTMLElement;
  private statTotal: HTMLElement;

  private judgmentTimeout: number = 0;

  constructor() {
    this.metronome = new Metronome();
    this.scorer = new Scorer();

    const beatCanvas = $<HTMLCanvasElement>('beatCanvas');
    const historyCanvas = $<HTMLCanvasElement>('historyCanvas');
    this.renderer = new Renderer(beatCanvas, historyCanvas);

    this.bpmSlider = $<HTMLInputElement>('bpmSlider');
    this.bpmValue = $<HTMLElement>('bpmValue');
    this.patternSelect = $<HTMLSelectElement>('patternSelect');
    this.durationSelect = $<HTMLSelectElement>('durationSelect');
    this.btnStart = $<HTMLButtonElement>('btnStart');
    this.judgmentText = $<HTMLElement>('judgmentText');
    this.overlayHint = $<HTMLElement>('overlayHint');
    this.floatAccuracy = $<HTMLElement>('floatAccuracy');
    this.floatCombo = $<HTMLElement>('floatCombo');
    this.statAccuracy = $<HTMLElement>('statAccuracy');
    this.statCombo = $<HTMLElement>('statCombo');
    this.statTotal = $<HTMLElement>('statTotal');

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.bpmSlider.addEventListener('input', () => {
      const bpm = parseInt(this.bpmSlider.value, 10);
      this.bpmValue.textContent = String(bpm);
      this.metronome.setBPM(bpm);
    });

    this.patternSelect.addEventListener('change', () => {
      this.metronome.setPattern(this.patternSelect.value as PatternType);
    });

    this.durationSelect.addEventListener('change', () => {
      this.metronome.setDuration(parseInt(this.durationSelect.value, 10));
    });

    this.btnStart.addEventListener('click', () => {
      if (this.state === 'IDLE' || this.state === 'FINISHED') {
        this.startTraining();
      } else if (this.state === 'PLAYING') {
        this.stopTraining();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleHit();
      }
    });

    const mainArea = $<HTMLElement>('mainArea');
    mainArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleHit();
    }, { passive: false });

    mainArea.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.control-panel')) return;
      if ((e.target as HTMLElement).closest('.float-stats')) return;
      this.handleHit();
    });

    window.addEventListener('resize', () => {
      this.renderer.resize();
    });

    this.metronome.onBeatCallback((event) => {
      this.scorer.addBeatTime(event.time);
      this.renderer.triggerBeat(event.isDownbeat);
    });

    this.metronome.onFinishCallback(() => {
      this.finishTraining();
    });
  }

  private startTraining(): void {
    this.state = 'PLAYING';
    this.scorer.reset();

    const bpm = parseInt(this.bpmSlider.value, 10);
    const duration = parseInt(this.durationSelect.value, 10);
    const pattern = this.patternSelect.value as PatternType;

    this.metronome.setBPM(bpm);
    this.metronome.setDuration(duration);
    this.metronome.setPattern(pattern);

    this.renderer.setPlaying(true);
    this.metronome.start();

    this.overlayHint.style.display = 'none';
    this.btnStart.textContent = '■ 停止训练';
    this.btnStart.className = 'btn btn-stop';

    this.setControlsEnabled(false);
    this.updateStats(0, 0, 0);
  }

  private stopTraining(): void {
    this.metronome.stop();
    this.finishTraining();
  }

  private finishTraining(): void {
    this.state = 'FINISHED';
    this.metronome.stop();
    this.renderer.setPlaying(false);

    const record = this.scorer.finishRound();
    this.renderer.drawHistoryChart(this.scorer.getHistory());

    this.overlayHint.textContent = `训练结束！本轮准确率 ${record.accuracy}%\n点击「开始训练」继续`;
    this.overlayHint.style.display = '';
    this.overlayHint.style.whiteSpace = 'pre-line';

    this.btnStart.textContent = '▶ 开始训练';
    this.btnStart.className = 'btn btn-start';
    this.setControlsEnabled(true);
  }

  private handleHit(): void {
    if (this.state !== 'PLAYING') return;

    const hitTime = performance.now();
    const result = this.scorer.judgeHit(hitTime);

    this.showJudgment(result.judgment);
    this.renderer.triggerFeedback(result.judgment);
    this.updateStats(result.accuracy, result.combo, result.totalHits);
  }

  private showJudgment(judgment: Judgment): void {
    const el = this.judgmentText;
    el.textContent = judgment;
    el.className = 'judgment-text show ' + judgment.toLowerCase();

    if (this.judgmentTimeout) clearTimeout(this.judgmentTimeout);
    this.judgmentTimeout = window.setTimeout(() => {
      el.className = 'judgment-text';
    }, 300);
  }

  private updateStats(accuracy: number, combo: number, total: number): void {
    const accStr = accuracy + '%';
    this.floatAccuracy.textContent = accStr;
    this.floatCombo.textContent = String(combo);
    this.statAccuracy.textContent = accStr;
    this.statCombo.textContent = String(combo);
    this.statTotal.textContent = String(total);
  }

  private setControlsEnabled(enabled: boolean): void {
    this.bpmSlider.disabled = !enabled;
    this.patternSelect.disabled = !enabled;
    this.durationSelect.disabled = !enabled;
  }

  private updateUI(): void {
    this.bpmValue.textContent = this.bpmSlider.value;
    this.renderer.drawHistoryChart(this.scorer.getHistory());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RhythmTrainer();
});
