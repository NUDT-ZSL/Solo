import React, { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  addDays,
} from 'date-fns';
import { Plant } from './App';

interface CalendarProps {
  plants: Plant[];
}

const Calendar: React.FC<CalendarProps> = ({ plants }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getPlantCareDays = (plant: Plant) => {
    const careDays: { date: Date; type: 'water' | 'fertilize'; isPast: boolean }[] = [];

    if (plant.lastWatered) {
      const lastWater = new Date(plant.lastWatered);
      careDays.push({ date: lastWater, type: 'water', isPast: true });

      let nextWater = addDays(lastWater, plant.waterCycle);
      const monthEnd = endOfMonth(currentMonth);
      while (nextWater <= monthEnd) {
        careDays.push({ date: nextWater, type: 'water', isPast: false });
        nextWater = addDays(nextWater, plant.waterCycle);
      }
    }

    if (plant.lastFertilized) {
      const lastFert = new Date(plant.lastFertilized);
      careDays.push({ date: lastFert, type: 'fertilize', isPast: true });

      let nextFert = addDays(lastFert, plant.fertilizeCycle);
      const monthEnd = endOfMonth(currentMonth);
      while (nextFert <= monthEnd) {
        careDays.push({ date: nextFert, type: 'fertilize', isPast: false });
        nextFert = addDays(nextFert, plant.fertilizeCycle);
      }
    }

    return careDays;
  };

  const hasCareOnDay = (plant: Plant, day: Date) => {
    const careDays = getPlantCareDays(plant);
    const onDay = careDays.filter((c) => isSameDay(c.date, day));
    if (onDay.length === 0) return null;

    const hasPast = onDay.some((c) => c.isPast);
    return hasPast ? 'solid' : 'empty';
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">养护日历</h1>
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={prevMonth}>
            ‹
          </button>
          <h2 className="calendar-title">
            {format(currentMonth, 'yyyy年 M月')}
          </h2>
          <button className="calendar-nav-btn" onClick={nextMonth}>
            ›
          </button>
        </div>

        {plants.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <p>还没有植物，先去添加几株吧！</p>
          </div>
        ) : (
          <table className="calendar-table">
            <thead>
              <tr>
                <th>植物</th>
                {daysInMonth.map((day) => (
                  <th key={day.toISOString()} className={isToday(day) ? 'today' : ''}>
                    {format(day, 'd')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plants.map((plant) => (
                <tr key={plant._id}>
                  <td className="plant-name-cell">{plant.name}</td>
                  {daysInMonth.map((day) => {
                    const dotType = hasCareOnDay(plant, day);
                    return (
                      <td
                        key={day.toISOString()}
                        className={`day-cell ${isToday(day) ? 'today' : ''}`}
                      >
                        {dotType && <span className={`dot ${dotType}`}></span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', fontSize: '13px', color: '#66bb6a' }}>
          <span><span className="dot solid" style={{ marginRight: '6px' }}></span>已完成</span>
          <span><span className="dot empty" style={{ marginRight: '6px' }}></span>计划中</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
