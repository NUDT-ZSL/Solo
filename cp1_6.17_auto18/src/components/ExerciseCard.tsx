import React from 'react';
import type { Exercise } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, exercise: Exercise) => void;
  selected?: boolean;
  size?: 'normal' | 'small';
}

export default function ExerciseCard({
  exercise,
  onClick,
  draggable = false,
  onDragStart,
  selected = false,
  size = 'normal',
}: ExerciseCardProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, exercise);
    }
  };

  const gifSize = size === 'small' ? 80 : 120;

  return (
    <div
      ref={cardRef}
      className={`exercise-card ${selected ? 'selected' : ''} ${size}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {isVisible ? (
        <img
          className="exercise-gif"
          src={exercise.gifUrl}
          alt={exercise.name}
          style={{ width: gifSize, height: gifSize }}
        />
      ) : (
        <div
          className="exercise-gif-placeholder"
          style={{ width: gifSize, height: gifSize }}
        />
      )}
      <div className="exercise-info">
        <div className="exercise-name">{exercise.name}</div>
        <div className="exercise-muscle">{exercise.targetMuscle}</div>
        <div className={`exercise-category ${exercise.category}`}>
          {exercise.category}
        </div>
      </div>
    </div>
  );
}
