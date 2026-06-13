import { useState, useCallback, useRef } from 'react';
import { ShopInfo } from '@/types';
import FloorScene from '@/components/FloorScene';
import FloorSelector from '@/components/FloorSelector';
import ShopPopup from '@/components/ShopPopup';
import SearchBar from '@/components/SearchBar';

export default function App() {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [selectedShop, setSelectedShop] = useState<ShopInfo | null>(null);
  const [targetShopId, setTargetShopId] = useState<string | null>(null);
  const sceneContainerRef = useRef<HTMLDivElement>(null);

  const handleFloorChange = useCallback((floor: number) => {
    setCurrentFloor(floor);
    setSelectedShop(null);
    setTargetShopId(null);
  }, []);

  const handleSelectShop = useCallback((shop: ShopInfo | null) => {
    setSelectedShop(shop);
    if (shop) {
      setTargetShopId(shop.id);
      if (shop.floor !== currentFloor) {
        setCurrentFloor(shop.floor);
      }
    } else {
      setTargetShopId(null);
    }
  }, [currentFloor]);

  const handleSearchSelect = useCallback((shop: ShopInfo) => {
    setSelectedShop(shop);
    setTargetShopId(shop.id);
    if (shop.floor !== currentFloor) {
      setCurrentFloor(shop.floor);
    }
  }, [currentFloor]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={sceneContainerRef}
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
        }}
      >
        <FloorScene
          currentFloor={currentFloor}
          selectedShop={selectedShop}
          onSelectShop={handleSelectShop}
          targetShopId={targetShopId}
        />
        <SearchBar onSelectShop={handleSearchSelect} />
        {selectedShop && (
          <ShopPopup shop={selectedShop} onClose={() => handleSelectShop(null)} />
        )}
      </div>
      <FloorSelector currentFloor={currentFloor} onFloorChange={handleFloorChange} />
    </div>
  );
}
