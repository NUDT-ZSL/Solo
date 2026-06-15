import React, { useState, useRef } from 'react';
import { useItinerary, DayItinerary } from '../context/ItineraryContext';
import './ItineraryPanel.css';

const ItineraryPanel: React.FC = () => {
  const { itinerary, selectedDay, expandedDays, setSelectedDay, toggleDayExpanded, reorderDays } = useItinerary();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  if (!itinerary) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragItemRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderDays(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderDays(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const handleDayClick = (day: DayItinerary) => {
    setSelectedDay(day.day);
    toggleDayExpanded(day.day);
  };

  return (
    <div className="itinerary-panel">
      <div className="panel-header">
        <h2 className="panel-title">行程安排</h2>
        <div className="panel-summary">
          <span className="summary-label">总花费</span>
          <span className="summary-value">¥{itinerary.totalCost.toFixed(2)}</span>
        </div>
      </div>

      <div className="days-list">
        {itinerary.itineraries.map((day, index) => (
          <div
            key={day.day}
            className={`day-card ${selectedDay === day.day ? 'selected' : ''} ${
              expandedDays.includes(day.day) ? 'expanded' : ''
            } ${draggedIndex === index ? 'dragging' : ''} ${
              dragOverIndex === index && draggedIndex !== index ? 'drag-over' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => handleDayClick(day)}
            style={{
              height: expandedDays.includes(day.day) ? '240px' : '80px'
            }}
          >
            <div className="day-card-header">
              <div className="day-info">
                <span className="day-number">Day {day.day}</span>
                <span className="day-date">{day.date}</span>
              </div>
              <div className="day-budget">
                <span className="budget-label">预算</span>
                <span className="budget-value">¥{day.actualCost.toFixed(0)}</span>
              </div>
            </div>

            {expandedDays.includes(day.day) && (
              <div className="day-activities-preview">
                {day.activities.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="activity-preview-item">
                    <span className="activity-time">{activity.time.split(' ')[0]}</span>
                    <span className="activity-name">{activity.name}</span>
                    <span className="activity-cost">¥{activity.cost}</span>
                  </div>
                ))}
                {day.activities.length > 3 && (
                  <div className="more-activities">
                    还有 {day.activities.length - 3} 项活动...
                  </div>
                )}
              </div>
            )}

            <div className="drag-handle">
              <span>⋮⋮</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItineraryPanel;
