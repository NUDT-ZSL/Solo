import { useState, useMemo, useRef } from 'react';
import { CityData } from './data';
import TimelineContainer from './TimelineContainer';
import CityPanel from './CityPanel';

interface AppProps {
  cities: CityData[];
}

const App = ({ cities }: AppProps) => {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<number>(2024);
  const timelineWrapperRef = useRef<HTMLDivElement>(null);

  const selectedCity = useMemo(() => {
    return cities.find((c) => c.id === selectedCityId) || null;
  }, [cities, selectedCityId]);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    cities.forEach((c) => yearSet.add(c.year));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [cities]);

  const handleCityClick = (cityId: string) => {
    setSelectedCityId(cityId);
  };

  const handleYearClick = (year: number) => {
    setActiveYear(year);
    if (timelineWrapperRef.current) {
      const yearGroup = timelineWrapperRef.current.querySelector(
        `[data-year="${year}"]`
      );
      if (yearGroup) {
        (yearGroup as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          inline: 'start',
          block: 'nearest',
        });
      }
    }
  };

  return (
    <div className="app">
      <nav className="year-nav">
        {years.map((year) => (
          <div
            key={year}
            className={`year-nav-item ${activeYear === year ? 'active' : ''}`}
            onClick={() => handleYearClick(year)}
          >
            {year}
          </div>
        ))}
      </nav>

      <div className="main-content">
        <TimelineContainer
          ref={timelineWrapperRef}
          cities={cities}
          selectedCityId={selectedCityId}
          onCityClick={handleCityClick}
        />

        <div className="divider" />

        <CityPanel city={selectedCity} />
      </div>
    </div>
  );
};

export default App;
