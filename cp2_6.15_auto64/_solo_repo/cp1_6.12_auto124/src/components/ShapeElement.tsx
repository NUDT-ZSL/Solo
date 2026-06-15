import React, { memo, useMemo } from 'react';
import { Shape } from '../types';
import { getShapePath, getGradientId, getShadowId } from '../utils/shapeUtils';

interface ShapeElementProps {
  shape: Shape;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, shapeId: string) => void;
}

const ShapeElement: React.FC<ShapeElementProps> = memo(function ShapeElement({
  shape,
  isSelected,
  onMouseDown,
}) {
  const { id, x, y, width, height, rotation, fill, useGradient, shadow, visible, locked } = shape;

  const transform = useMemo(() => {
    return `translate(${x}, ${y}) rotate(${rotation}, ${width / 2}, ${height / 2})`;
  }, [x, y, rotation, width, height]);

  const fillValue = useMemo(() => {
    return useGradient ? `url(#${getGradientId(id)})` : fill;
  }, [useGradient, id, fill]);

  const shadowFilter = useMemo(() => {
    if (shadow.blur === 0 && shadow.offsetX === 0 && shadow.offsetY === 0) {
      return undefined;
    }
    return `url(#${getShadowId(id)})`;
  }, [shadow, id]);

  const pathD = useMemo(() => getShapePath(shape), [shape]);

  if (!visible) return null;

  return (
    <g
      transform={transform}
      filter={shadowFilter}
      onMouseDown={(e) => !locked && onMouseDown(e, id)}
      className={`shape-element ${locked ? 'locked' : ''} ${isSelected ? 'selected' : ''}`}
      style={{ cursor: locked ? 'not-allowed' : 'move' }}
    >
      <path d={pathD} fill={fillValue} />
    </g>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.shape === nextProps.shape &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onMouseDown === nextProps.onMouseDown
  );
});

export default ShapeElement;
