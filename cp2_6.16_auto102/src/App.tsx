import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import PlateScene from '@scene/PlateScene';
import ControlPanel from '@components/ControlPanel';
import { useCameraController } from '@scene/CameraController';
import { useEventEngine } from '@data/eventEngine';
import type { PlateData, EventData } from '@data/plateConfig';

function App() {
  const [plates, setPlates] = useState<PlateData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const cameraController = useCameraController();
  const eventEngine = useEventEngine();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [platesRes, eventsRes] = await Promise.all([
          fetch('/api/plates'),
          fetch('/api/events'),
        ]);
        const platesData = await platesRes.json();
        const eventsData = await eventsRes.json();
        setPlates(platesData.plates || platesData);
        setEvents(eventsData.events || eventsData);
      } catch (error) {
        console.error('Failed to load data:', error);
        setPlates(defaultPlates as unknown as PlateData[]);
        setEvents(defaultEvents as unknown as EventData[]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleTimeChange = useCallback((time: number) => {
    eventEngine.setCurrentTime(time);
  }, [eventEngine]);

  const handleEventSelect = useCallback((eventId: string) => {
    eventEngine.playEvent(eventId, events);
  }, [eventEngine, events]);

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">加载地质数据中...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 0, cameraController.zoom], fov: 60 }}
          onPointerDown={cameraController.onPointerDown}
          onPointerMove={cameraController.onPointerMove}
          onPointerUp={cameraController.onPointerUp}
          onPointerLeave={cameraController.onPointerUp}
          onWheel={cameraController.onWheel}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-10, -5, 5]} intensity={0.3} />
          <PlateScene
            plates={plates}
            currentTime={eventEngine.currentTime}
            mountains={eventEngine.mountains}
            separations={eventEngine.separations}
            highlightedPlates={eventEngine.highlightedPlates}
            collisions={eventEngine.collisionCount}
          />
        </Canvas>
      </div>

      <ControlPanel
        className={mobilePanelOpen ? 'mobile-open' : ''}
        currentTime={eventEngine.currentTime}
        maxTime={300}
        onTimeChange={handleTimeChange}
        events={events}
        activeEventId={eventEngine.activeEventId}
        currentNote={eventEngine.currentNote}
        onEventSelect={handleEventSelect}
        stats={eventEngine.stats}
      />

      <button
        className="mobile-panel-toggle"
        onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
      >
        {mobilePanelOpen ? '×' : '☰'}
      </button>

      <div className="mobile-panel-bar">
        <button
          className={`mobile-btn ${eventEngine.activeEventId === 'pangaea' ? 'active' : ''}`}
          onClick={() => handleEventSelect('pangaea')}
        >
          <span className="icon">🌍</span>
          <span>泛大陆</span>
        </button>
        <button
          className={`mobile-btn ${eventEngine.activeEventId === 'himalaya' ? 'active' : ''}`}
          onClick={() => handleEventSelect('himalaya')}
        >
          <span className="icon">🏔️</span>
          <span>喜马拉雅</span>
        </button>
        <button
          className={`mobile-btn ${eventEngine.activeEventId === 'atlantic' ? 'active' : ''}`}
          onClick={() => handleEventSelect('atlantic')}
        >
          <span className="icon">🌊</span>
          <span>大西洋</span>
        </button>
        <button
          className={`mobile-btn ${eventEngine.activeEventId === 'pegmatite' ? 'active' : ''}`}
          onClick={() => handleEventSelect('pegmatite')}
        >
          <span className="icon">💎</span>
          <span>班岩</span>
        </button>
        <input
          type="range"
          className="slider mobile-slider"
          min={0}
          max={300}
          step={1}
          value={eventEngine.currentTime}
          onChange={(e) => handleTimeChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

const defaultPlates = [
  {
    id: 'plate-1', name: '太平洋板块', color: '#ff6b6b',
    vertices: [[0.8,0.3,0.5],[0.7,0.5,0.5],[0.5,0.7,0.5],[0.3,0.8,0.5],[0.1,0.7,0.7],[0.0,0.5,0.85],[-0.1,0.3,0.9],[-0.3,0.1,0.9],[-0.5,0.0,0.8],[-0.6,-0.2,0.7],[-0.5,-0.4,0.65],[-0.3,-0.5,0.7],[-0.1,-0.4,0.85],[0.1,-0.3,0.9],[0.3,-0.4,0.85],[0.5,-0.5,0.7],[0.65,-0.4,0.6],[0.75,-0.2,0.55],[0.8,0.0,0.55],[0.8,0.15,0.5]],
    path: [{time:0,rotation:[0,0,0]},{time:75,rotation:[0.1,-0.3,0.05]},{time:150,rotation:[0.15,-0.6,0.1]},{time:225,rotation:[0.1,-0.9,0.15]},{time:300,rotation:[0.05,-1.2,0.2]}]
  },
  {
    id: 'plate-2', name: '亚欧板块', color: '#48dbfb',
    vertices: [[0.2,0.8,0.5],[0.0,0.9,0.3],[-0.3,0.85,0.35],[-0.5,0.75,0.3],[-0.7,0.6,0.2],[-0.85,0.4,0.15],[-0.9,0.2,0.2],[-0.85,0.0,0.4],[-0.75,-0.15,0.5],[-0.6,-0.25,0.6],[-0.5,-0.1,0.7],[-0.3,0.0,0.8],[-0.1,0.15,0.85],[0.1,0.3,0.9],[0.3,0.45,0.8],[0.5,0.55,0.65],[0.65,0.55,0.5],[0.55,0.65,0.4],[0.4,0.75,0.45],[0.3,0.8,0.5]],
    path: [{time:0,rotation:[0,0,0]},{time:75,rotation:[-0.05,0.2,-0.1]},{time:150,rotation:[-0.1,0.4,-0.15]},{time:225,rotation:[-0.15,0.55,-0.2]},{time:300,rotation:[-0.2,0.7,-0.25]}]
  },
  {
    id: 'plate-3', name: '非洲板块', color: '#feca57',
    vertices: [[0.3,0.1,0.85],[0.1,0.0,0.9],[-0.1,-0.1,0.9],[-0.3,-0.25,0.85],[-0.45,-0.45,0.75],[-0.5,-0.7,0.5],[-0.4,-0.85,0.3],[-0.2,-0.9,0.25],[0.0,-0.85,0.45],[0.2,-0.7,0.6],[0.35,-0.5,0.7],[0.45,-0.3,0.8],[0.4,-0.1,0.85],[0.35,0.05,0.85]],
    path: [{time:0,rotation:[0,0,0]},{time:75,rotation:[0.05,0.1,0.08]},{time:150,rotation:[0.1,0.25,0.12]},{time:225,rotation:[0.15,0.4,0.18]},{time:300,rotation:[0.2,0.55,0.25]}]
  },
  {
    id: 'plate-4', name: '美洲板块', color: '#a29bfe',
    vertices: [[-0.6,0.4,0.6],[-0.75,0.25,0.55],[-0.85,0.05,0.45],[-0.9,-0.15,0.35],[-0.85,-0.35,0.35],[-0.75,-0.55,0.3],[-0.6,-0.7,0.35],[-0.45,-0.8,0.35],[-0.3,-0.7,0.5],[-0.2,-0.5,0.65],[-0.25,-0.3,0.8],[-0.35,-0.1,0.85],[-0.5,0.1,0.8],[-0.55,0.25,0.7],[-0.55,0.3,0.65]],
    path: [{time:0,rotation:[0,0,0]},{time:75,rotation:[-0.08,-0.2,-0.05]},{time:150,rotation:[-0.15,-0.4,-0.1]},{time:225,rotation:[-0.2,-0.6,-0.15]},{time:300,rotation:[-0.25,-0.8,-0.2]}]
  },
  {
    id: 'plate-5', name: '南极洲板块', color: '#55efc4',
    vertices: [[0.5,-0.6,0.5],[0.3,-0.75,0.5],[0.1,-0.85,0.4],[-0.1,-0.9,0.3],[-0.3,-0.9,0.2],[-0.5,-0.85,0.1],[-0.7,-0.75,0.1],[-0.85,-0.6,0.1],[-0.85,-0.45,0.2],[-0.7,-0.35,0.4],[-0.5,-0.35,0.6],[-0.3,-0.45,0.75],[-0.1,-0.55,0.8],[0.1,-0.6,0.75],[0.3,-0.55,0.7]],
    path: [{time:0,rotation:[0,0,0]},{time:75,rotation:[0.02,0.15,0.03]},{time:150,rotation:[0.04,0.3,0.06]},{time:225,rotation:[0.06,0.45,0.09]},{time:300,rotation:[0.08,0.6,0.12]}]
  },
  {
    id: 'plate-6', name: '印度洋板块', color: '#fd79a8',
    vertices: [[0.7,0.1,0.6],[0.6,-0.1,0.7],[0.5,-0.3,0.75],[0.45,-0.5,0.65],[0.55,-0.45,0.55],[0.65,-0.3,0.5],[0.75,-0.1,0.5],[0.8,0.0,0.5],[0.75,0.05,0.55]],
    path: [{time:0,rotation:[0,0,0]},{time:75,rotation:[0.05,0.4,0.02]},{time:150,rotation:[0.1,0.8,0.05]},{time:225,rotation:[0.15,1.1,0.08]},{time:300,rotation:[0.2,1.4,0.12]}]
  }
];

const defaultEvents = [
  {id:'pangaea',name:'泛大陆形成',description:'3亿年前所有大陆汇聚形成超级大陆',duration:8000,timeStamps:[{time:0,note:'各板块分散状态'},{time:50,note:'板块开始汇聚'},{time:100,note:'主要碰撞发生'},{time:150,note:'乌拉尔山脉形成'},{time:200,note:'盘古大陆基本成型'},{time:250,note:'泛大陆完整形成'},{time:300,note:'超级大陆稳定期'}],highlightedPlates:['plate-1','plate-2','plate-3','plate-4','plate-5','plate-6']},
  {id:'himalaya',name:'喜马拉雅造山',description:'印度洋板块撞击亚欧板块形成世界屋脊',duration:10000,timeStamps:[{time:0,note:'两板块分离'},{time:100,note:'印度洋板块北移'},{time:175,note:'特提斯洋开始闭合'},{time:220,note:'初始碰撞发生'},{time:250,note:'山脉快速隆起'},{time:275,note:'青藏高原抬升'},{time:300,note:'喜马拉雅形成'}],highlightedPlates:['plate-2','plate-6'],collisionPairs:[['plate-2','plate-6']]},
  {id:'atlantic',name:'大西洋裂开',description:'美洲板块与亚欧非洲板块分离',duration:9000,timeStamps:[{time:0,note:'泛大陆完整状态'},{time:50,note:'初始张裂开始'},{time:100,note:'中大西洋海岭形成'},{time:150,note:'海水涌入裂谷'},{time:200,note:'大西洋雏形出现'},{time:250,note:'洋盆持续扩张'},{time:300,note:'现代大西洋形成'}],highlightedPlates:['plate-2','plate-3','plate-4'],separationPairs:[['plate-2','plate-4'],['plate-3','plate-4']]},
  {id:'pegmatite',name:'班岩巨晶形成',description:'板块俯冲带岩浆活动形成巨型晶体',duration:6000,timeStamps:[{time:0,note:'板块稳定状态'},{time:80,note:'俯冲作用开始'},{time:140,note:'洋壳熔融形成岩浆'},{time:180,note:'岩浆房缓慢冷却'},{time:220,note:'矿物结晶生长'},{time:260,note:'巨晶矿物形成'},{time:300,note:'班岩矿床成型'}],highlightedPlates:['plate-1','plate-2'],subductionPairs:[['plate-1','plate-2']]}
];

export default App;
