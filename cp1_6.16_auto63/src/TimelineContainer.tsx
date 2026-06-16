import { forwardRef, useMemo } from 'react';
import { CityData } from './data';

interface TimelineContainerProps {
  cities: CityData[];
  selectedCityId: string | null;
  onCityClick: (cityId: string) => void;
}

const TimelineContainer = forwardRef<HTMLDivElement, TimelineContainerProps>(
  ({ cities, selectedCityId, onCityClick }, ref) => {
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
      <div className="timeline-wrapper" ref={ref}>
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
