import {
  Metronome,
  type BeatEvent,
  type PerformanceMetrics,
  type PatternType,
  type MetronomeCallbacks,
} from './metronome';

import {
  Scorer,
  type HitResult,
  type RoundRecord,
  type ScorerStats,
  type ScorerCallbacks,
} from './scorer';

import {
  Renderer,
  type RendererCallbacks,
  type RendererPerformanceSnapshot,
} from './renderer';

type AppState = 'IDLE' | 'PLAYING' | 'FINISHED';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const PATTERN_LABEL: Record<PatternType, string> = {
  standard: '标准 4/4',
  swing: '摇摆 Swing',
  syncopation: '切分 Syncopation',
  dotted: '附点 Dotted',
  triplet: '三连音 Triplet',
};

interface DOMRefs {
  bpmSlider: HTMLInputElement;
  bpmValue: HTMLElement;
  patternSelect: HTMLSelectElement;
  durationSelect: HTMLSelectElement;
  btnStart: HTMLButtonElement;
  judgmentText: HTMLElement;
  overlayHint: HTMLElement;
  floatAccuracy: HTMLElement;
  floatCombo: HTMLElement;
  statAccuracy: HTMLElement;
  statCombo: HTMLElement;
  statTotal: HTMLElement;
  mainArea: HTMLElement;
  perfBadge: HTMLElement;
  patternBanner: HTMLElement;
  beatCanvas: HTMLCanvasElement;
  historyCanvas: HTMLCanvasElement;
}

class RhythmTrainer {
  private state: AppState = 'IDLE';
  private dom: DOMRefs;

  private metronome: Metronome;
  private scorer: Scorer;
  private renderer: Renderer;

  private lastPattern: PatternType = 'standard';

  private rafAnimId: number = 0;
  private animQueue: Array<{
    kind: 'banner' | 'judgment' | 'perfBadge';
    start: number;
    duration: number;
    target: HTMLElement;
    onEnd?: () => void;
  }> = [];

  private pendingResizeObserver?: ResizeObserver;
  private lastPerfSnap: RendererPerformanceSnapshot | null = null;
  private lastMetricSnap: PerformanceMetrics | null = null;

  constructor() {
    this.dom = this.collectDOM();
    this.metronome = new Metronome();
    this.scorer = new Scorer({
      perfectWindowMs: 50,
      goodWindowMs: 100,
      debounceMs: 75,
    });
    this.renderer = new Renderer(this.dom.beatCanvas, this.dom.historyCanvas, {
      indicatorDiameter: 320,
      particleCount: 12,
      transitionMs: 300,
    });

    this.lastPattern = this.dom.patternSelect.value as PatternType;

    this.wireMetronome();
    this.wireScorer();
    this.wireRenderer();
    this.wireUI();

    this.updateStatsDisplay({
      accuracy: 0,
      combo: 0,
      maxCombo: 0,
      totalHits: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
    });

    this.renderer.setCurrentPattern(this.lastPattern, false);
    this.renderer.drawHistoryChart(this.scorer.getHistory(), true);

    this.installResizeObserver();
    this.setupKeyboardHit();
    this.setupTapHit();
  }

  private collectDOM(): DOMRefs {
    return {
      bpmSlider: $<HTMLInputElement>('bpmSlider'),
      bpmValue: $<HTMLElement>('bpmValue'),
      patternSelect: $<HTMLSelectElement>('patternSelect'),
      durationSelect: $<HTMLSelectElement>('durationSelect'),
      btnStart: $<HTMLButtonElement>('btnStart'),
      judgmentText: $<HTMLElement>('judgmentText'),
      overlayHint: $<HTMLElement>('overlayHint'),
      floatAccuracy: $<HTMLElement>('floatAccuracy'),
      floatCombo: $<HTMLElement>('floatCombo'),
      statAccuracy: $<HTMLElement>('statAccuracy'),
      statCombo: $<HTMLElement>('statCombo'),
      statTotal: $<HTMLElement>('statTotal'),
      mainArea: $<HTMLElement>('mainArea'),
      perfBadge: $<HTMLElement>('perfBadge'),
      patternBanner: $<HTMLElement>('patternBanner'),
      beatCanvas: $<HTMLCanvasElement>('beatCanvas'),
      historyCanvas: $<HTMLCanvasElement>('historyCanvas'),
    };
  }

  private wireMetronome(): void {
    const cbs: MetronomeCallbacks = {
      onBeat: this.handleOnBeat,
      onFinish: this.handleOnRoundFinish,
      onPerformanceMetrics: (m) => {
        this.lastMetricSnap = m;
        this.maybeUpdatePerfBadge();
      },
    };
    this.metronome.setCallbacks(cbs);

    this.metronome.setBPM(parseInt(this.dom.bpmSlider.value, 10));
    this.metronome.setDuration(parseInt(this.dom.durationSelect.value, 10));
    this.metronome.setPattern(this.dom.patternSelect.value as PatternType);
  }

  private wireScorer(): void {
    const cbs: ScorerCallbacks = {
      onHit: this.handleOnScorerHit,
      onRoundEnd: this.handleOnRoundEnd,
      onStatsChange: this.handleOnStatsChange,
    };
    this.scorer.setCallbacks(cbs);
  }

  private wireRenderer(): void {
    const cbs: RendererCallbacks = {
      onPerformance: (snap) => {
        this.lastPerfSnap = snap;
        this.maybeUpdatePerfBadge();
      },
    };
    this.renderer.setCallbacks(cbs);
  }

  private wireUI(): void {
    const { bpmSlider, bpmValue, patternSelect, durationSelect, btnStart } = this.dom;

    bpmSlider.addEventListener('input', () => {
      const v = parseInt(bpmSlider.value, 10);
      bpmValue.textContent = String(v);
      if (this.state === 'PLAYING') this.metronome.setBPM(v);
      else this.metronome.setBPM(v);
    });

    durationSelect.addEventListener('change', () => {
      const v = parseInt(durationSelect.value, 10);
      this.metronome.setDuration(v);
    });

    patternSelect.addEventListener('change', () => {
      const p = patternSelect.value as PatternType;
      this.changePattern(p);
    });

    btnStart.addEventListener('click', () => {
      if (this.state === 'IDLE' || this.state === 'FINISHED') {
        this.startTraining();
      } else if (this.state === 'PLAYING') {
        this.stopTraining();
      }
    });
  }

  private installResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.pendingResizeObserver = new ResizeObserver(() => {
        this.renderer.resize();
        this.renderer.drawHistoryChart(this.scorer.getHistory(), true);
      });
      this.pendingResizeObserver.observe(this.dom.mainArea);
      this.pendingResizeObserver.observe(document.body);
    }
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.renderer.drawHistoryChart(this.scorer.getHistory(), true);
    });
  }

  private setupKeyboardHit(): void {
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleUserHit();
      }
    });
  }

  private setupTapHit(): void {
    const onTap = (e: Event) => {
      const tgt = e.target as HTMLElement | null;
      if (!tgt) return;
      if (tgt.closest('.control-panel')) return;
      if (tgt.closest('.float-stats')) return;
      if (tgt.closest('.history-section')) return;
      if (tgt.closest('#btnStart')) return;
      if (e.type === 'touchstart') e.preventDefault();
      this.handleUserHit();
    };
    this.dom.mainArea.addEventListener('touchstart', onTap, { passive: false });
    this.dom.mainArea.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'CANVAS') {
        onTap(e);
      }
    });
  }

  private changePattern(p: PatternType): void {
    if (p === this.lastPattern) return;
    const fromLabel = PATTERN_LABEL[this.lastPattern];
    const toLabel = PATTERN_LABEL[p];
    this.lastPattern = p;
    this.renderer.setCurrentPattern(p, true);
    this.metronome.setPattern(p);
    this.showPatternBanner(`${fromLabel} → ${toLabel}`);
  }

  private showPatternBanner(text: string): void {
    const b = this.dom.patternBanner;
    b.textContent = text;
    b.classList.remove('hide');
    b.classList.add('show');
    if (this.bannerHideTimer) clearTimeout(this.bannerHideTimer);
    this.bannerHideTimer = window.setTimeout(() => {
      b.classList.remove('show');
      b.classList.add('hide');
    }, 1500);
  }

  private startTraining(): void {
    this.state = 'PLAYING';

    const bpm = parseInt(this.dom.bpmSlider.value, 10);
    const duration = parseInt(this.dom.durationSelect.value, 10);
    const pattern = this.lastPattern;

    this.metronome.setBPM(bpm);
    this.metronome.setDuration(duration);
    this.metronome.setPattern(pattern);
    this.scorer.resetRound();
    this.renderer.setCurrentPattern(pattern, false);
    this.renderer.setPlaying(true);
    this.metronome.start();

    this.dom.overlayHint.style.display = 'none';
    this.dom.btnStart.textContent = '■ 停止训练';
    this.dom.btnStart.classList.remove('btn-start');
    this.dom.btnStart.classList.add('btn-stop');

    this.setControlsEnabled(false);
    this.updateStatsDisplay({
      accuracy: 0,
      combo: 0,
      maxCombo: 0,
      totalHits: 0,
      perfectCount: 0,
      goodCount: 0,
      missCount: 0,
    });
  }

  private stopTraining(): void {
    if (this.metronome.isRunning()) this.metronome.stop();
    this.renderer.setPlaying(false);
    this.finalizeRound();
  }

  private finalizeRound(): void {
    const record = this.scorer.endRoundAndRecord();
    this.state = 'FINISHED';
    this.renderer.drawHistoryChart(this.scorer.getHistory(), true);

    const msg = [
      `训练结束！本轮准确率: ${record.accuracy}%`,
      `Perfect ${record.perfectCount}  ·  Good ${record.goodCount}  ·  Miss ${record.missCount}`,
      `最高连击 ${record.maxCombo}`,
      '',
      '点击「开始训练」继续',
    ].join('\n');

    this.dom.overlayHint.textContent = msg;
    this.dom.overlayHint.style.whiteSpace = 'pre-line';
    this.dom.overlayHint.style.display = '';

    this.dom.btnStart.textContent = '▶ 开始训练';
    this.dom.btnStart.classList.remove('btn-stop');
    this.dom.btnStart.classList.add('btn-start');
    this.setControlsEnabled(true);
  }

  private handleOnBeat = (beat: BeatEvent): void => {
    this.scorer.registerBeat(beat.index, beat.scheduledTime);
    this.renderer.triggerBeat(beat.isDownbeat);
  };

  private handleOnRoundFinish = (): void => {
    this.renderer.setPlaying(false);
    this.finalizeRound();
  };

  private handleUserHit = (): void => {
    if (this.state !== 'PLAYING') return;
    const now = performance.now();
    this.scorer.submitHit(now);
  };

  private handleOnScorerHit = (r: HitResult): void => {
    if (r.throttled) return;
    this.renderer.triggerFeedback(r.judgment);
    this.showJudgment(r.judgment);
  };

  private handleOnRoundEnd = (_record: RoundRecord): void => {};

  private handleOnStatsChange = (s: ScorerStats): void => {
    this.updateStatsDisplay(s);
  };

  private showJudgment(judgment: HitResult['judgment']): void {
    const el = this.dom.judgmentText;
    el.textContent = judgment;
    el.className = `judgment-text show ${judgment.toLowerCase()}`;
    if (this.judgmentHideTimer) clearTimeout(this.judgmentHideTimer);
    this.judgmentHideTimer = window.setTimeout(() => {
      el.className = 'judgment-text';
    }, 260);
  }

  private updateStatsDisplay(s: ScorerStats): void {
    const acc = s.accuracy + '%';
    this.dom.floatAccuracy.textContent = acc;
    this.dom.floatCombo.textContent = String(s.combo);
    this.dom.statAccuracy.textContent = acc;
    this.dom.statCombo.textContent = String(s.combo);
    this.dom.statTotal.textContent = String(s.totalHits);
  }

  private maybeUpdatePerfBadge(): void {
    const render = this.lastPerfSnap;
    const metric = this.lastMetricSnap;
    if (!render && !metric) return;
    const parts: string[] = [];
    if (render) {
      if (render.drawTimeMs > 50) parts.push(`画${render.drawTimeMs.toFixed(0)}ms`);
      if (render.chartDrawTimeMs > 50) parts.push(`图${render.chartDrawTimeMs.toFixed(0)}ms`);
    }
    if (metric) {
      if (metric.exceeds16msCount > 0)
        parts.push(`节拍超标${metric.exceeds16msCount}/${metric.totalBeats}`);
    }
    if (parts.length === 0) return;
    const badge = this.dom.perfBadge;
    badge.textContent = '⚠ ' + parts.join('  ');
    badge.classList.add('visible');
    if (this.perfBadgeHideTimer) clearTimeout(this.perfBadgeHideTimer);
    this.perfBadgeHideTimer = window.setTimeout(() => {
      badge.classList.remove('visible');
    }, 4000);
  }

  private setControlsEnabled(enabled: boolean): void {
    this.dom.bpmSlider.disabled = !enabled;
    this.dom.durationSelect.disabled = !enabled;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RhythmTrainer();
});
