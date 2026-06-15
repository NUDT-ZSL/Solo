import React, { useState, useEffect, useRef, useCallback } from 'react';
import { eventBus, EVENTS } from '../utils/EventBus';
import { dataProcessor } from '../DataProcessor';

type PlaySpeed = 1 | 2 | 5;

export const TimeSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const [timeLabel, setTimeLabel] = useState('00:00');
  const totalHours = dataProcessor.getTotalHours();

  const playIntervalRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const timePoints = dataProcessor.getTimePoints();
    if (timePoints.length > 0) {
      const firstPoint = timePoints[0];
      setTimeLabel(dataProcessor.formatTime(firstPoint.timestamp));
    }
  }, []);

  useEffect(() => {
    const handleTimeChange = (index: number) => {
      setCurrentIndex(index);
      const timePoints = dataProcessor.getTimePoints();
      if (timePoints[index]) {
        setTimeLabel(dataProcessor.formatTime(timePoints[index].timestamp));
      }
    };

    const handlePlayState = (playing: boolean) => {
      setIsPlaying(playing);
    };

    eventBus.on(EVENTS.TIME_CHANGED, handleTimeChange);
    eventBus.on(EVENTS.PLAY_STATE_CHANGED, handlePlayState);

    return () => {
      eventBus.off(EVENTS.TIME_CHANGED, handleTimeChange);
      eventBus.off(EVENTS.PLAY_STATE_CHANGED, handlePlayState);
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / speed;

      const tick = () => {
        const now = performance.now();
        if (now - lastUpdateRef.current >= interval) {
          lastUpdateRef.current = now;
          setCurrentIndex((prev) => {
            const next = prev + 1;
            if (next >= totalHours) {
              setIsPlaying(false);
              eventBus.emit(EVENTS.PLAY_STATE_CHANGED, false);
              return 0;
            }
            dataProcessor.setCurrentTimeIndex(next);
            return next;
          });
        }
        playIntervalRef.current = requestAnimationFrame(tick);
      };

      playIntervalRef.current = requestAnimationFrame(tick);
    } else {
      if (playIntervalRef.current) {
        cancelAnimationFrame(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        cancelAnimationFrame(playIntervalRef.current);
      }
    };
  }, [isPlaying, speed, totalHours]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const index = parseInt(e.target.value, 10);
      setCurrentIndex(index);
      dataProcessor.setCurrentTimeIndex(index);
    },
    []
  );

  const togglePlay = useCallback(() => {
    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);
    eventBus.emit(EVENTS.PLAY_STATE_CHANGED, newPlaying);
  }, [isPlaying]);

  const handleSpeedChange = useCallback((newSpeed: PlaySpeed) => {
    setSpeed(newSpeed);
    eventBus.emit(EVENTS.SPEED_CHANGED, newSpeed);
  }, []);

  return (
    <div className="timeline-container">
      <div className="timeline-controls">
        <button className="play-btn" onClick={togglePlay}>
          {isPlaying ? '暂停' : '播放'}
        </button>
        <div className="speed-buttons">
          {([1, 2, 5] as PlaySpeed[]).map((s) => (
            <button
              key={s}
              className={`speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => handleSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <div className="slider-wrapper">
        <span className="time-label">{timeLabel}</span>
        <input
          type="range"
          className="time-slider"
          min={0}
          max={totalHours - 1}
          value={currentIndex}
          onChange={handleSliderChange}
        />
        <span className="time-label">23:00</span>
      </div>
    </div>
  );
};
