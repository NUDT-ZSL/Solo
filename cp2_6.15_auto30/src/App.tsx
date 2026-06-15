import { Scene } from './scene';
import { SkylinePreview } from './skyline';
import { Controls } from './controls';
import { useVoxelStore } from './store';

function App() {
  const addVoxel = useVoxelStore((state) => state.addVoxel);
  const isDay = useVoxelStore((state) => state.isDay);

  const bgColor = isDay ? '#1a1a2e' : '#0d0d1a';

  return (
    <div
      className="w-screen h-screen flex overflow-hidden transition-colors duration-1000"
      style={{ backgroundColor: bgColor }}
    >
      <div className="relative" style={{ width: '70%', height: '100%' }}>
        <div className="absolute top-4 left-4 z-10">
          <h1 className="text-2xl font-bold text-white tracking-wide">
            体素城市天际线生成器
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            点击和拖拽网格创建你的城市
          </p>
        </div>
        <Scene onAddVoxel={addVoxel} />
      </div>

      <div
        className="flex flex-col items-center p-6 gap-8 border-l border-gray-700 overflow-y-auto"
        style={{
          width: '30%',
          height: '100%',
          backgroundColor: 'rgba(13, 13, 26, 0.95)',
        }}
      >
        <SkylinePreview />
        <Controls />
      </div>
    </div>
  );
}

export default App;
