import React, { useState, useEffect } from 'react';
import { Droplets, Leaf } from 'lucide-react';
import { plantManager } from './PlantManager';
import type { ScheduleItem } from './types';

interface CalendarViewProps {
  plantId?: number;
}

interface TaskWithPlant {
  type: 'water' | 'fertilize';
  completed: boolean;
  plantName: string;
  plantId: number;
}

interface MergedSchedule {
  [date: string]: TaskWithPlant[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ plantId }) => {
  const [mergedSchedule, setMergedSchedule] = useState<MergedSchedule>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const days = plantManager.getNextNDays(7);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => (t + 1) % 10000);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [plantId, tick]);

  const loadSchedule = async () => {
    setLoading(true);
    const data = await plantManager.getSchedule(plantId);
    const merged: MergedSchedule = {};
    
    data.forEach((item) => {
      const date = item.date;
      if (!merged[date]) merged[date] = [];
      
      if ('items' in (item as unknown as { items?: ScheduleItem[] })) {
        const multiItem = item as unknown as { items: ScheduleItem[] };
        multiItem.items.forEach(subItem => {
          subItem.tasks.forEach(task => {
            merged[date].push({
              ...task,
              plantName: subItem.plantName,
              plantId: subItem.plantId
            });
          });
        });
      } else {
        const scheduleItem = item as ScheduleItem;
        scheduleItem.tasks.forEach(task => {
          merged[date].push({
            ...task,
            plantName: scheduleItem.plantName,
            plantId: scheduleItem.plantId
          });
        });
      }
    });

    setMergedSchedule(merged);
    setLoading(false);
  };

  if (loading) {
    return <div className="calendar-loading">加载中...</div>;
  }

  return (
    <div className="calendar-container">
      <h2 className="calendar-title">未来7天养护提醒</h2>
      <div className="calendar-grid">
        {days.map((dateStr) => {
          const tasks = mergedSchedule[dateStr] || [];
          const isWeekend = plantManager.isWeekend(dateStr);
          const isToday = plantManager.isToday(dateStr);
          const hasPendingTasks = tasks.some(t => !t.completed);
          const showBlink = isToday && hasPendingTasks;
          
          return (
            <div
              key={dateStr}
              className={`calendar-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''} ${showBlink ? 'has-pending' : ''}`}
            >
              <div className="calendar-date-label">
                {plantManager.getDateLabel(dateStr)}
              </div>
              <div className="calendar-tasks">
                {tasks.length === 0 ? (
                  <div className="no-task">—</div>
                ) : (
                  tasks.map((task, index) => (
                    <div
                      key={index}
                      className={`task-icon ${!task.completed ? 'pending' : ''} ${showBlink ? 'blinking' : ''} task-${task.type}`}
                      title={`${task.plantName} - ${task.type === 'water' ? '浇水' : '施肥'}${task.completed ? '（已完成）' : '（待完成）'}`}
                    >
                      <div className="task-icon-inner">
                        {task.type === 'water' ? (
                          <Droplets size={20} />
                        ) : (
                          <Leaf size={20} />
                        )}
                      </div>
                      {!plantId && (
                        <span className="task-plant-name">{task.plantName}</span>
                      )}
                      <span className={`task-status ${task.completed ? 'completed' : 'incomplete'}`}>
                        {task.completed ? '✓' : '!'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
