import React, { useMemo, useRef, useCallback } from 'react';
import { ArtParameters, GRID_SIZE, CELL_GAP, GAP_COLOR, BG_COLOR } from './types';
import { generateCellContent } from './utils/patternGenerators';

interface CanvasGridProps {
  params: ArtParameters;
  fading: boolean;
  showRipple: boolean;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
}

const CELL_SIZE = 64;
const TOTAL_GAP = CELL_GAP * (GRID_SIZE + 1);
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE + TOTAL_GAP;

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const CanvasGrid: React.FC<CanvasGridProps> = ({ params, fading, showRipple, svgRef }) => {
  const rotationSeeds = useRef<number[]>(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => seededRandom(i + 1))
  );

  const getCellRotation = useCallback((index: number): number => {
    const baseRotation = params.rotation;
    if (params.randomRotation) {
      const seed = rotationSeeds.current[index];
      return baseRotation + seed * 720 - 360;
    }
    return baseRotation + (index % 8) * 45;
  }, [params.rotation, params.randomRotation]);

  const cells = useMemo(() => {
    const startTime = performance.now();
    const result = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const index = row * GRID_SIZE + col;
        const x = CELL_GAP + col * (CELL_SIZE + CELL_GAP);
        const y = CELL_GAP + row * (CELL_SIZE + CELL_GAP);
        const rotation = getCellRotation(index);
        const cx = x + CELL_SIZE / 2;
        const cy = y + CELL_SIZE / 2;

        const cellCtx = {
          row,
          col,
          gridSize: GRID_SIZE,
          cellSize: CELL_SIZE,
          params,
        };

        const content = generateCellContent(params.mode, cellCtx);

        result.push(
          <g
            key={`cell-${row}-${col}`}
            className="cell-group"
            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px` }}
          >
            {content.type === 'wave' && (
              <path
                d={content.path}
                transform={`translate(${x}, ${y})`}
                fill={params.fillColor}
                stroke={params.strokeColor}
                strokeWidth={1.5}
                opacity={params.opacity}
                className="cell-content"
              />
            )}
            {content.type === 'spiral' && (
              <path
                d={content.path}
                transform={`translate(${x}, ${y})`}
                fill="none"
                stroke={params.strokeColor}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={params.opacity}
                className="cell-content"
              />
            )}
            {content.type === 'fractal' && (
              <g transform={`translate(${x}, ${y})`} className="cell-content">
                {content.paths.map((path, i) => (
                  <path
                    key={`branch-${i}`}
                    d={path}
                    fill="none"
                    stroke={params.strokeColor}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    opacity={params.opacity}
                  />
                ))}
                {content.circles.map((circle, i) => (
                  <circle
                    key={`tip-${i}`}
                    cx={circle.cx}
                    cy={circle.cy}
                    r={circle.r}
                    fill={params.fillColor}
                    opacity={params.opacity}
                  />
                ))}
              </g>
            )}
          </g>
        );
      }
    }

    const elapsed = performance.now() - startTime;
    if (elapsed > 16) {
      console.warn(`Canvas render took ${elapsed.toFixed(1)}ms (target: <16ms)`);
    }

    return result;
  }, [params, getCellRotation]);

  const gapLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * (CELL_SIZE + CELL_GAP);
      lines.push(
        <rect
          key={`h-gap-${i}`}
          x={0}
          y={pos}
          width={CANVAS_SIZE}
          height={CELL_GAP}
          fill={GAP_COLOR}
        />
      );
      lines.push(
        <rect
          key={`v-gap-${i}`}
          x={pos}
          y={0}
          width={CELL_GAP}
          height={CANVAS_SIZE}
          fill={GAP_COLOR}
        />
      );
    }
    return lines;
  }, []);

  return (
    <div className="canvas-area">
      <div className={`canvas-wrapper ${fading ? 'fading' : ''}`}>
        {showRipple && <div className="ripple-effect" />}
        <svg
          ref={svgRef}
          className="canvas-svg"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ background: BG_COLOR }}
        >
          <rect width={CANVAS_SIZE} height={CANVAS_SIZE} fill={BG_COLOR} />
          {cells}
          {gapLines}
        </svg>
      </div>
    </div>
  );
};

export default CanvasGrid;
