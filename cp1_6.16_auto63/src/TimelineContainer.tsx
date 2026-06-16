import { forwardRef, useMemo, useState, useEffect, useImperativeHandle, useRef } from 'react';
import { CityData } from './data';

interface TimelineContainerProps {
  cities: CityData[];
  selectedCityId: string | null;
  onCityClick: (cityId: string) => void;
}

const TimelineContainer = forwardRef<HTMLDivElement, TimelineContainerProps>(
  ({ cities, selectedCityId, onCityClick }, ref) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const [leftMaskOpacity, setLeftMaskOpacity] = useState(0);
    const [rightMaskOpacity, setRightMaskOpacity] = useState(0.6);

    useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;

      const updateMaskOpacity = () => {
        const { scrollLeft, scrollWidth, clientWidth } = el;
        const maxScroll = scrollWidth - clientWidth;

        if (maxScroll <= 0) {
          setLeftMaskOpacity(0);
          setRightMaskOpacity(0);
          return;
        }

        const leftRatio = Math.min(scrollLeft / 120, 1);
        setLeftMaskOpacity(leftRatio * 0.6);

        const rightScrollLeft = maxScroll - scrollLeft;
        const rightRatio = Math.min(rightScrollLeft / 120, 1);
        setRightMaskOpacity(rightRatio * 0.6);
      };

      updateMaskOpacity();
      el.addEventListener('scroll', updateMaskOpacity, { passive: true });
      window.addEventListener('resize', updateMaskOpacity);

      return () => {
        el.removeEventListener('scroll', updateMaskOpacity);
        window.removeEventListener('resize', updateMaskOpacity);
      };
    }, [cities]);

    const groupedByYear = useMemo(() => {
      const groups = new Map<number, CityData[]>();
      cities.forEach((city) => {
        const existing = groups.get(city.year) || [];
        existing.push(city);
        groups.set(city.year, existing);
      });
      const sortedYears = Array.from(groups.keys()).sort((a, b) => a - b);
      return sortedYears.map((year) => ({
        year,
        cities: groups.get(year)!.sort((a, b) => a.month - b.month),
      }));
    }, [cities]);

    return (
      <div className="timeline-wrapper" ref={innerRef}>
        <div
          className="timeline-mask timeline-mask-left"
          style={{ opacity: leftMaskOpacity, transition: 'opacity 0.3s ease' }}
        />
        <div
          className="timeline-mask timeline-mask-right"
          style={{ opacity: rightMaskOpacity, transition: 'opacity 0.3s ease' }}
        />
        <div className="timeline">
          <div className="timeline-track" />
          {groupedByYear.map(({ year, cities: yearCities }) => (
            <div key={year} className="year-group" data-year={year}>
              <div className="year-title">{year}</div>
              <div className="cities-row">
                {yearCities.map((city) => (
                  <div
                    key={city.id}
                    className={`city-node ${
                      selectedCityId === city.id ? 'active' : ''
                    }`}
                    onClick={() => onCityClick(city.id)}
                  >
                    <div className="city-dot">
                      <div className="city-dot-inner" />
                    </div>
                    <div className="city-label">
                      <div className="city-name">{city.name}</div>
                      <div className="city-count">{city.records.length} 条记录</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

TimelineContainer.displayName = 'TimelineContainer';

export default TimelineContainer;
