import { AlignmentEngine, type SequenceType, type AlignmentResult } from './alignmentEngine';
import { SequenceRenderer, type HoverInfo } from './sequenceRenderer';

interface AppState {
  seq1Raw: string;
  seq2Raw: string;
  seq1Clean: string;
  seq2Clean: string;
  seqType: SequenceType;
  alignment: AlignmentResult | null;
}

const state: AppState = {
  seq1Raw: '',
  seq2Raw: '',
  seq1Clean: '',
  seq2Clean: '',
  seqType: 'DNA',
  alignment: null,
};

const engine = new AlignmentEngine();
let renderer: SequenceRenderer;
let lastExportTime = 0;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function init(): void {
  const canvas = $('mainCanvas') as HTMLCanvasElement;
  const tooltip = $('tooltip') as HTMLDivElement;
  const container = $('canvasContainer') as HTMLDivElement;

  renderer = new SequenceRenderer(canvas, {
    onHover: (info: HoverInfo | null) => {
      if (info) {
        showTooltip(tooltip, container, info);
      } else {
        hideTooltip(tooltip);
      }
    },
  });

  bindInputEvents();
  bindButtonEvents();
  updateStatusBar();
}

function showTooltip(
  tooltip: HTMLDivElement,
  container: HTMLDivElement,
  info: HoverInfo
): void {
  const complement = engine.getComplement(info.base, state.seqType);
  tooltip.innerHTML = `
    <div class="tooltip-title">序列 ${info.seqIndex} · 位置 ${info.position + 1}</div>
    <div class="tooltip-row"><span>碱基类型</span><span>${info.base.toUpperCase()}</span></div>
    <div class="tooltip-row"><span>互补碱基</span><span>${complement}</span></div>
    <div class="tooltip-row"><span>比对得分</span><span>${info.score}</span></div>
  `;
  tooltip.style.display = 'block';

  const rect = container.getBoundingClientRect();
  let left = info.x + 20;
  let top = info.y - 10;

  if (left + tooltip.offsetWidth > rect.width - 10) {
    left = info.x - tooltip.offsetWidth - 20;
  }
  if (top + tooltip.offsetHeight > rect.height - 10) {
    top = rect.height - tooltip.offsetHeight - 10;
  }
  if (top < 10) top = 10;
  if (left < 10) left = 10;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip(tooltip: HTMLDivElement): void {
  tooltip.style.display = 'none';
}

function bindInputEvents(): void {
  const seq1Input = $('seq1') as HTMLInputElement;
  const seq2Input = $('seq2') as HTMLInputElement;
  const seqTypeSelect = $('seqType') as HTMLSelectElement;
  const count1 = $('count1') as HTMLSpanElement;
  const count2 = $('count2') as HTMLSpanElement;

  seq1Input.addEventListener('input', () => {
    state.seq1Raw = seq1Input.value;
    updateSequenceInput(seq1Input, count1, 1);
  });

  seq2Input.addEventListener('input', () => {
    state.seq2Raw = seq2Input.value;
    updateSequenceInput(seq2Input, count2, 2);
  });

  seqTypeSelect.addEventListener('change', () => {
    state.seqType = seqTypeSelect.value as SequenceType;
    updateSequenceInput(seq1Input, count1, 1);
    updateSequenceInput(seq2Input, count2, 2);
    if (state.alignment) {
      runAlignment();
    }
  });
}

function updateSequenceInput(
  input: HTMLInputElement,
  countEl: HTMLSpanElement,
  seqIndex: 1 | 2
): void {
  const raw = seqIndex === 1 ? state.seq1Raw : state.seq2Raw;
  const { clean, invalidIndices } = engine.sanitizeSequence(raw, state.seqType);

  if (seqIndex === 1) {
    state.seq1Clean = clean;
  } else {
    state.seq2Clean = clean;
  }

  const hasInvalid = invalidIndices.length > 0;
  input.classList.toggle('invalid', hasInvalid);
  countEl.classList.toggle('invalid', hasInvalid);
  countEl.textContent = `${raw.length}/2000`;

  renderer.setSequences(state.seq1Clean, state.seq2Clean, state.seqType);
  updateStatusBar();
}

function bindButtonEvents(): void {
  $('alignBtn').addEventListener('click', runAlignment);
  $('clearBtn').addEventListener('click', clearAll);
  $('exportReport').addEventListener('click', exportReport);
  $('exportImage').addEventListener('click', exportImage);
}

function runAlignment(): void {
  if (state.seq1Clean.length < 50 || state.seq2Clean.length < 50) {
    alert('请输入长度至少50碱基的有效序列');
    return;
  }

  showLoading();
  setTimeout(() => {
    const result = engine.align(state.seq1Clean, state.seq2Clean);
    state.alignment = result;
    renderer.setAlignment(result);
    updateStatusBar();
    hideLoading();
  }, 10);
}

function clearAll(): void {
  state.seq1Raw = '';
  state.seq2Raw = '';
  state.seq1Clean = '';
  state.seq2Clean = '';
  state.alignment = null;

  ($('seq1') as HTMLInputElement).value = '';
  ($('seq2') as HTMLInputElement).value = '';
  ($('count1') as HTMLSpanElement).textContent = '0/2000';
  ($('count2') as HTMLSpanElement).textContent = '0/2000';
  ($('seq1') as HTMLInputElement).classList.remove('invalid');
  ($('seq2') as HTMLInputElement).classList.remove('invalid');
  ($('count1') as HTMLSpanElement).classList.remove('invalid');
  ($('count2') as HTMLSpanElement).classList.remove('invalid');

  renderer.setSequences('', '', state.seqType);
  renderer.setAlignment(null);
  updateStatusBar();
}

function updateStatusBar(): void {
  $('len1').textContent = state.seq1Clean.length.toString();
  $('len2').textContent = state.seq2Clean.length.toString();

  const totalLen = state.seq1Clean.length + state.seq2Clean.length;
  let gcContent = 0;
  if (totalLen > 0) {
    const gc1 = engine.calculateGC(state.seq1Clean);
    const gc2 = engine.calculateGC(state.seq2Clean);
    gcContent = (gc1 * state.seq1Clean.length + gc2 * state.seq2Clean.length) / totalLen;
  }
  $('gcContent').textContent = `${gcContent.toFixed(1)}%`;

  if (state.alignment) {
    $('alignScore').textContent = state.alignment.score.toString();
    $('matchCount').textContent = state.alignment.matches.toString();
    $('mismatchCount').textContent = state.alignment.mismatches.toString();
    $('gapCount').textContent = state.alignment.gaps.toString();

    const total =
      state.alignment.matches + state.alignment.mismatches + state.alignment.gaps;
    const matchRate = total > 0 ? (state.alignment.matches / total) * 100 : 0;
    ($('matchProgress') as HTMLDivElement).style.width = `${matchRate}%`;
  } else {
    $('alignScore').textContent = '0';
    $('matchCount').textContent = '0';
    $('mismatchCount').textContent = '0';
    $('gapCount').textContent = '0';
    ($('matchProgress') as HTMLDivElement).style.width = '0%';
  }
}

function showLoading(): void {
  const overlay = $('loadingOverlay') as HTMLDivElement;
  overlay.classList.remove('fade-out');
  overlay.style.display = 'flex';
}

function hideLoading(): void {
  const overlay = $('loadingOverlay') as HTMLDivElement;
  overlay.classList.add('fade-out');
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('fade-out');
  }, 1000);
}

function exportReport(): void {
  const now = Date.now();
  if (now - lastExportTime < 1000) {
    showExportHint('请稍候再导出');
    return;
  }
  lastExportTime = now;

  showLoading();

  setTimeout(() => {
    const report = {
      exportTime: new Date().toISOString(),
      sequenceType: state.seqType,
      sequences: {
        seq1: {
          raw: state.seq1Raw,
          clean: state.seq1Clean,
          length: state.seq1Clean.length,
          gcContent: engine.calculateGC(state.seq1Clean).toFixed(1) + '%',
        },
        seq2: {
          raw: state.seq2Raw,
          clean: state.seq2Clean,
          length: state.seq2Clean.length,
          gcContent: engine.calculateGC(state.seq2Clean).toFixed(1) + '%',
        },
      },
      alignment: state.alignment
        ? {
            score: state.alignment.score,
            matches: state.alignment.matches,
            mismatches: state.alignment.mismatches,
            gaps: state.alignment.gaps,
            alignedSeq1: state.alignment.alignedSeq1,
            alignedSeq2: state.alignment.alignedSeq2,
            matchRate: (
              (state.alignment.matches /
                (state.alignment.matches +
                  state.alignment.mismatches +
                  state.alignment.gaps)) *
              100
            ).toFixed(1) + '%',
          }
        : null,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alignment-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideLoading();
    showExportHint('比对报告已导出');
  }, 100);
}

function exportImage(): void {
  const now = Date.now();
  if (now - lastExportTime < 1000) {
    showExportHint('请稍候再导出');
    return;
  }
  lastExportTime = now;

  showLoading();

  setTimeout(() => {
    const exportCanvas = renderer.exportImage();
    exportCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sequence-alignment-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      hideLoading();
      showExportHint('截图已保存');
    }, 'image/png');
  }, 100);
}

function showExportHint(msg: string): void {
  const hint = $('exportHint') as HTMLSpanElement;
  hint.textContent = msg;
  setTimeout(() => {
    hint.textContent = '';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', init);
