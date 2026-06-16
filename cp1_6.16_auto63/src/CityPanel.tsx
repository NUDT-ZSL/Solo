import { CityData } from './data';

interface CityPanelProps {
  city: CityData | null;
}

const CityPanel = ({ city }: CityPanelProps) => {
  if (!city) {
    return (
      <div className="city-panel">
        <div className="panel-empty">
          点击时间线上的城市节点，
          <br />
          查看旅行记录详情
        </div>
      </div>
    );
  }

  return (
    <div className="city-panel" key={city.id}>
      <div className="panel-header">
        <div className="panel-city-name">{city.name}</div>
        <div className="panel-city-meta">
          {city.year}年{city.month}月 · {city.records.length} 条记录 · 坐标{' '}
          {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
        </div>
      </div>

      <div>
        {city.records.map((record) => (
          <div key={record.id} className="record-card">
            <div className="record-photo">Photo</div>
            <div className="record-date">{record.date}</div>
            <div className="record-title">{record.title}</div>
            <div className="record-thoughts">{record.thoughts}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CityPanel;
