import React, { useState, useMemo } from 'react';
import MapView from './MapView';
import CardPanel from './CardPanel';
import {
  PROVINCES,
  MOCK_CHECKINS,
  CheckInRecord,
  Province,
  addCheckIn,
  updateCheckIn,
  deleteCheckIn,
  getCheckInsByProvince,
  getProvinceById
} from './data';

const App: React.FC = () => {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>(MOCK_CHECKINS);
  const [currentProvinceId, setCurrentProvinceId] = useState<string | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  const currentProvince: Province | null = useMemo(() => {
    if (!currentProvinceId) return null;
    return getProvinceById(currentProvinceId) || null;
  }, [currentProvinceId]);

  const provinceCheckIns = useMemo(() => {
    if (!currentProvinceId) return [];
    return getCheckInsByProvince(checkIns, currentProvinceId);
  }, [checkIns, currentProvinceId]);

  const displayCheckIns = useMemo(() => {
    if (currentProvinceId) {
      return provinceCheckIns;
    }
    return checkIns;
  }, [currentProvinceId, checkIns, provinceCheckIns]);

  const totalCheckInCount = checkIns.length;
  const totalProvinceCount = new Set(checkIns.map(c => c.provinceId)).size;

  const handleProvinceDoubleClick = (provinceId: string) => {
    setCurrentProvinceId(provinceId);
    setIsAddMode(false);
  };

  const handleBackToCountry = () => {
    setCurrentProvinceId(null);
    setIsAddMode(false);
  };

  const handleAddClick = () => {
    setIsAddMode(prev => !prev);
  };

  const handleFormClose = () => {
    setIsAddMode(false);
  };

  const handleAddCheckIn = (record: Omit<CheckInRecord, 'id' | 'createdAt'>) => {
    setCheckIns(prev => addCheckIn(prev, record));
    setIsAddMode(false);
  };

  const handleUpdateCheckIn = (id: string, updates: Partial<CheckInRecord>) => {
    setCheckIns(prev => updateCheckIn(prev, id, updates));
  };

  const handleDeleteCheckIn = (id: string) => {
    setCheckIns(prev => deleteCheckIn(prev, id));
  };

  return (
    <>
      <nav className="navbar">
        <h1 className="navbar-title">🍜 美食打卡地图</h1>
        <span className="navbar-subtitle">
          已打卡 {totalCheckInCount} 家餐厅 · {totalProvinceCount} 个省份
        </span>
      </nav>

      <div className="main-container">
        <MapView
          provinces={PROVINCES}
          checkIns={checkIns}
          currentProvinceId={currentProvinceId}
          onProvinceDoubleClick={handleProvinceDoubleClick}
          onBackToCountry={handleBackToCountry}
          onAddClick={handleAddClick}
          isAddMode={isAddMode}
        />

        <CardPanel
          checkIns={displayCheckIns}
          currentProvince={currentProvince}
          isAddMode={isAddMode}
          onAddCheckIn={handleAddCheckIn}
          onUpdateCheckIn={handleUpdateCheckIn}
          onDeleteCheckIn={handleDeleteCheckIn}
          onFormClose={handleFormClose}
        />
      </div>
    </>
  );
};

export default App;
