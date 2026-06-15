import { DNASequence, alignSequences, generateReferenceSequence, Base, BASE_COLORS } from './sequence';
import { DNARenderer } from './renderer';

function initApp(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas元素未找到');
    return;
  }

  const mainSequence = new DNASequence();
  const referenceSequence = new DNASequence(generateReferenceSequence());

  const renderer = new DNARenderer(canvas, mainSequence, referenceSequence);

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragThreshold = 10;

  const alignmentResultEl = document.getElementById('alignmentResult');
  const matchPercentageEl = document.getElementById('matchPercentage');
  const matchValueEl = document.getElementById('matchValue');
  const panel = document.getElementById('panel');
  const togglePanelBtn = document.getElementById('togglePanel');
  const btnRotate = document.getElementById('btnRotate');
  const btnPointMutation = document.getElementById('btnPointMutation');
  const btnInsertion = document.getElementById('btnInsertion');
  const btnDeletion = document.getElementById('btnDeletion');

  renderer.setAlignmentUpdateCallback(() => {
    updateAlignmentDisplay();
  });

  function updateAlignmentDisplay(): void {
    if (!alignmentResultEl || !matchPercentageEl || !matchValueEl) return;

    const mainBases = mainSequence.getBases();
    if (mainBases.length === 0) {
      alignmentResultEl.innerHTML = `
        <div style="color: #888; text-align: center; padding: 20px;">
          拖拽画布生成序列后查看比对结果
        </div>
      `;
      matchPercentageEl.style.display = 'none';
      return;
    }

    const result = alignSequences(mainBases, referenceSequence.getBases());

    let html = '';

    html += '<div class="alignment-row">';
    html += '<span class="alignment-label">主序列</span>';
    for (let i = 0; i < result.alignedSeq1.length; i++) {
      const base = result.alignedSeq1[i];
      const isMatch = result.matches[i];
      const className = base === '-' ? 'base-neutral' : (isMatch ? 'base-match' : 'base-mismatch');
      const color = base !== '-' ? BASE_COLORS[base as Base] : 'transparent';
      html += `<span class="base-cell ${className}" style="${base !== '-' ? `color: ${color}` : ''}">${base}</span>`;
    }
    html += '</div>';

    html += '<div class="alignment-row">';
    html += '<span class="alignment-label">参考</span>';
    for (let i = 0; i < result.alignedSeq2.length; i++) {
      const base = result.alignedSeq2[i];
      const isMatch = result.matches[i];
      const className = base === '-' ? 'base-neutral' : (isMatch ? 'base-match' : 'base-mismatch');
      const color = base !== '-' ? BASE_COLORS[base as Base] : 'transparent';
      html += `<span class="base-cell ${className}" style="${base !== '-' ? `color: ${color}` : ''}">${base}</span>`;
    }
    html += '</div>';

    alignmentResultEl.innerHTML = html;
    matchPercentageEl.style.display = 'block';
    matchValueEl.textContent = `${result.matchPercentage.toFixed(1)}%`;
  }

  function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = canvas!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    const coords = getCanvasCoords(e);
    dragStartX = coords.x;
    dragStartY = coords.y;
  });

  canvas.addEventListener('mousemove', (e) => {
    const coords = getCanvasCoords(e);
    renderer.setMousePosition(coords.x, coords.y);
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!isDragging) return;

    const coords = getCanvasCoords(e);
    const distance = Math.sqrt(
      Math.pow(coords.x - dragStartX, 2) + Math.pow(coords.y - dragStartY, 2)
    );

    if (distance >= dragThreshold) {
      renderer.generateSequenceWithAnimation();
    }

    isDragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  document.addEventListener('keydown', (e) => {
    const hoverIndex = mainSequence.getHoverIndex();

    if (e.key === '1') {
      if (hoverIndex >= 0) {
        renderer.pointMutationWithAnimation(hoverIndex);
      }
    } else if (e.key === '2') {
      if (hoverIndex >= 0 || mainSequence.getLength() > 0) {
        const targetIndex = hoverIndex >= 0 ? hoverIndex : Math.floor(mainSequence.getLength() / 2);
        renderer.insertWithAnimation(targetIndex);
      }
    } else if (e.key === '3') {
      if (hoverIndex >= 0) {
        renderer.deleteWithAnimation(hoverIndex);
      }
    }
  });

  if (btnPointMutation) {
    btnPointMutation.addEventListener('click', () => {
      const hoverIndex = mainSequence.getHoverIndex();
      if (hoverIndex >= 0) {
        renderer.pointMutationWithAnimation(hoverIndex);
      }
    });
  }

  if (btnInsertion) {
    btnInsertion.addEventListener('click', () => {
      const hoverIndex = mainSequence.getHoverIndex();
      if (hoverIndex >= 0 || mainSequence.getLength() > 0) {
        const targetIndex = hoverIndex >= 0 ? hoverIndex : Math.floor(mainSequence.getLength() / 2);
        renderer.insertWithAnimation(targetIndex);
      }
    });
  }

  if (btnDeletion) {
    btnDeletion.addEventListener('click', () => {
      const hoverIndex = mainSequence.getHoverIndex();
      if (hoverIndex >= 0) {
        renderer.deleteWithAnimation(hoverIndex);
      }
    });
  }

  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      renderer.toggleViewMode();
    });
  }

  if (togglePanelBtn && panel) {
    togglePanelBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      if (panel.classList.contains('collapsed')) {
        togglePanelBtn.textContent = '▶';
        togglePanelBtn.classList.add('collapsed');
      } else {
        togglePanelBtn.textContent = '◀';
        togglePanelBtn.classList.remove('collapsed');
      }
    });
  }

  window.addEventListener('resize', () => {
    renderer.resize();
  });

  updateAlignmentDisplay();
}

window.addEventListener('DOMContentLoaded', initApp);
