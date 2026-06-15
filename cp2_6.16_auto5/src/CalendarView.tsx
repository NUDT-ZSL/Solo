import React, { useState, useEffect } from 'react';
import { Droplets, Leaf } from 'lucide-react';
import { plantManager } from './PlantManager';
import type { ScheduleItem } from './types';

interface CalendarViewProps {
  plantId?: number;
}

const CalendarView: React.FC<CalendarViewProps> = ({ plantId }) => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const days = plantManager.getNextNDays(7);

  useEffect(() => {
    loadSchedule();
  }, [plantId]);

  const loadSchedule = async () => {
    setLoading(true);
    const data = await plantManager.getSchedule(plantId);
    setSchedule(data);
    setLoading(false);
  };

  const getTasksForDate = (dateStr: string) => {
    const daySchedule = schedule.find(s => s.date === dateStr);
    if (!daySchedule) return [];
    if ('items' in daySchedule) {
      return (daySchedule as unknown as { items: ScheduleItem[] }).items.flatMap(item => 
        item.tasks.map(task => ({ ...task, plantName: item.plantName }))
      );
    }
    return (daySchedule as ScheduleItem).tasks.map(task => ({
      ...task,
      plantName: (daySchedule as ScheduleItem).plantName
    }));
  };

  if (loading) {
    return <div className="calendar-loading">加载中...</div>;
  }

  return (
    <div className="calendar-container">
      <h2 className="calendar-title">未来7天养护提醒</h2>
      <div className="calendar-grid">
        {days.map((dateStr) => {
          const tasks = getTasksForDate(dateStr);
          const isWeekend = plantManager.isWeekend(dateStr);
          const isToday = plantManager.isToday(dateStr);
          
          return (
            <div
              key={dateStr}
              className={`calendar-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
            >
              <div className="calendar-date-label">
                {plantManager.getDateLabel(dateStr)}
              </div>
              <div className="calendar-tasks">
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className={`task-icon ${!task.completed ? 'pending' : ''}`}
                    title={`${task.plantName} - ${task.type === 'water' ? '浇水' : '施肥'}`}
                  >
                    {task.type === 'water' ? (
                      <Droplets size={20} />
                    ) : (
                      <Leaf size={20} />
                    )}
                    {!plantId && (
                      <span className="task-plant-name">{task.plantName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
