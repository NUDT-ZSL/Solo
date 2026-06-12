import React, { useCallback } from 'react';
import { useGalleryStore } from '@/store';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { Trash2 } from 'lucide-react';
import { cmToPx } from '@/utils/geometry';
import type { PlacedExhibit } from '@/types';

interface ExhibitProps {
  exhibit: PlacedExhibit;
  zoom: number;
}

export const Exhibit: React.FC<ExhibitProps> = ({ exhibit, zoom }) => {
  const { updateExhibit, removeExhibit, selectElement } = useGalleryStore();

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDragAndDrop({
    zoom,
    onStart: () => {
      selectElement({ type: 'exhibit', id: exhibit.id });
    },
    onMove: (delta) => {
      updateExhibit(exhibit.id, {
        x: exhibit.x + delta.x,
        y: exhibit.y + delta.y,
      });
    },
  });

  const isSelected =
    useGalleryStore(
      (s) => s.selectedElement?.type === 'exhibit' && s.selectedElement?.id === exhibit.id
    );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeExhibit(exhibit.id);
    },
    [removeExhibit, exhibit.id]
  );

  const pxWidth = cmToPx(exhibit.physicalWidth);
  const pxHeight = cmToPx(exhibit.physicalHeight);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: exhibit.x,
        top: exhibit.y,
        width: pxWidth,
        height: pxHeight + 20,
        cursor: 'move',
        touchAction: 'none',
        zIndex: isSelected ? 10 : 2,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: pxWidth,
          height: pxHeight,
          border: `2px solid ${isSelected ? '#3b82f6' : exhibit.colorTag}`,
          borderRadius: 4,
          backgroundColor: `${exhibit.colorTag}22`,
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: isSelected
            ? '0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.12)'
            : '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: exhibit.colorTag,
            borderRadius: '4px 4px 0 0',
          }}
        />
      </div>
      <div
        style={{
          width: pxWidth,
          textAlign: 'center',
          fontSize: 12,
          color: '#000',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
          userSelect: 'none',
          marginTop: 4,
          lineHeight: 1,
        }}
      >
        {exhibit.name}
      </div>
      {isSelected && (
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#ef4444',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            padding: 0,
            transition: 'box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(239,68,68,0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
};
