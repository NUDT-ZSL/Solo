import React, { useState } from 'react';
import { MaterialCard } from './MaterialCard';
import type { Material } from '../types';

interface MaterialListProps {
  materials: Material[];
  missingMaterialIds?: string[];
  onDelete: (id: string) => void;
}

export const MaterialList: React.FC<MaterialListProps> = ({
  materials,
  missingMaterialIds = [],
  onDelete,
}) => {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      onDelete(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  return (
    <div className="material-grid fade-in">
      {materials.map((material) => (
        <MaterialCard
          key={material.id}
          material={material}
          isMissing={missingMaterialIds.includes(material.id)}
          onDelete={handleDelete}
          isDeleting={deletingIds.has(material.id)}
        />
      ))}
      {materials.length === 0 && (
        <div className="empty-state">
          <p>暂无材料数据</p>
        </div>
      )}
    </div>
  );
};
