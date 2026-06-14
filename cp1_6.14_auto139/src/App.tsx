import React, { useState, useEffect, useRef, useCallback } from 'react';
import TitleScreen from './ui/TitleScreen';
import SceneRenderer from './ui/SceneRenderer';
import EndingScreen from './ui/EndingScreen';
import FloatingIcons from './ui/FloatingIcons';
import SettingsModal from './ui/SettingsModal';
import { storyEngine } from './engine/StoryEngine';
import { audioManager } from './engine/AudioManager';
import { eventBus } from './engine/EventBus';
import { SceneData, GameEvent, GameState } from './types';
import { saveGame, loadGame, hasSaveGame, clearSave } from './utils/storage';
import './styles/App.css';

type GamePhase = 'loading' | 'title' | 'playing' | 'ending';

const App: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('loading');
  const [sceneData, setSceneData] = useState<SceneData | null>(null);
  const [prevBackground, setPrevBackground] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [textSpeed, setTextSpeed] = useState(30);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const background2Ref = useRef<HTMLDivElement>(null);
  const [activeBgLayer, setActiveBgLayer] = useState(1);

  useEffect(() => {
    const init = async () => {
      try {
        await storyEngine.loadStory('/story.json');
        setHasSave(hasSaveGame());
        setGamePhase('title');
      } catch (error) {
        console.error('Failed to load story:', error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleSave = (state: GameState) => {
      saveGame(state);
      setHasSave(true);
    };

    eventBus.on(GameEvent.SAVE_GAME, handleSave);

    return () => {
      eventBus.off(GameEvent.SAVE_GAME, handleSave);
    };
  }, []);

  const startNewGame = useCallback(async () => {
    try {
      await audioManager.init();
      audioManager.resume();
      const scene = storyEngine.startNewGame();
      setSceneData(scene);
      setPrevBackground(scene.background);
      setActiveBgLayer(1);
      setGamePhase('playing');
      saveGame(storyEngine.getState());
    } catch (error) {
      console.error('Failed to start new game:', error);
    }
  }, []);

  const continueGame = useCallback(async () => {
    try {
      const savedState = loadGame();
      if (!savedState) return;

      if (!savedState.visitedNodes || !Array.isArray(savedState.visitedNodes) || savedState.visitedNodes.length === 0) {
        console.warn('[App] Save has no visitedNodes, reconstructing from history');
        savedState.visitedNodes = savedState.history
          ? savedState.history.map((h) => h.nodeId).filter(Boolean)
          : [savedState.currentNodeId];
        if (!savedState.visitedNodes.includes(savedState.currentNodeId)) {
          savedState.visitedNodes.push(savedState.currentNodeId);
        }
      }

      if (!savedState.history || !Array.isArray(savedState.history) || savedState.history.length === 0) {
        savedState.history = [{ nodeId: savedState.currentNodeId, timestamp: Date.now() }];
      }

      await audioManager.init();
      audioManager.resume();
      const scene = storyEngine.loadGame(savedState);
      const restoredState = storyEngine.getState();

      if (!restoredState.visitedNodes || restoredState.visitedNodes.length === 0) {
        console.error('[App] visitedNodes not restored after loadGame!');
      }

      setSceneData(scene);
      setPrevBackground(scene.background);
      setActiveBgLayer(1);
      if (scene.isEnding) {
        setGamePhase('ending');
      } else {
        setGamePhase('playing');
      }
    } catch (error) {
      console.error('Failed to continue game:', error);
    }
  }, []);

  const handleChoiceSelect = useCallback(
    (choiceId: string) => {
      if (isTransitioning) return;

      setIsTransitioning(true);

      setTimeout(() => {
        const newScene = storyEngine.makeChoice(choiceId);
        if (newScene) {
          setSceneData(newScene);

          if (newScene.background !== prevBackground) {
            const newLayer = activeBgLayer === 1 ? 2 : 1;
            setActiveBgLayer(newLayer);
            setPrevBackground(newScene.background);
          }

          if (newScene.isEnding) {
            setTimeout(() => {
              setGamePhase('ending');
              setIsTransitioning(false);
            }, 800);
          } else {
            setTimeout(() => {
              setIsTransitioning(false);
            }, 800);
          }
        } else {
          setIsTransitioning(false);
        }
      }, 300);
    },
    [isTransitioning, prevBackground, activeBgLayer]
  );

  const handleRestart = useCallback(() => {
    clearSave();
    setHasSave(false);
    setSceneData(null);
    setGamePhase('title');
    audioManager.stopCurrentAmbient();
  }, []);

  const handleSave = useCallback(() => {
    if (gamePhase === 'playing' && sceneData) {
      saveGame(storyEngine.getState());
      setHasSave(true);
    }
  }, [gamePhase, sceneData]);

  const handleVolumeChange = useCallback((volume: number) => {
    setMasterVolume(volume);
    audioManager.setMasterVolume(volume);
  }, []);

  const handleResetGame = useCallback(() => {
    clearSave();
    setHasSave(false);
  }, []);

  const getBackgroundStyle = (bg: string) => {
    const bgUrl = `/backgrounds/${bg}`;
    return {
      backgroundImage: `url(${bgUrl}), linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)`,
    };
  };

  const bg1Visible = activeBgLayer === 1;
  const bg2Visible = activeBgLayer === 2;

  return (
    <div className="app">
      {/* Background layers for crossfade */}
      <div
        ref={backgroundRef}
        className={`background-layer ${bg1Visible ? 'fade-in' : 'fade-out'}`}
        style={getBackgroundStyle(sceneData?.background || '')}
      />
      <div
        ref={background2Ref}
        className={`background-layer ${bg2Visible ? 'fade-in' : 'fade-out'}`}
        style={getBackgroundStyle(prevBackground)}
      />
      <div className="background-overlay" />

      {gamePhase === 'loading' && (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
        </div>
      )}

      {gamePhase === 'title' && (
        <TitleScreen
          hasSave={hasSave}
          onStartNew={startNewGame}
          onContinue={continueGame}
        />
      )}

      {gamePhase === 'playing' && sceneData && (
        <>
          <SceneRenderer
            sceneData={sceneData}
            onChoiceSelect={handleChoiceSelect}
            isTransitioning={isTransitioning}
          />
          <FloatingIcons onSave={handleSave} onSettings={() => setShowSettings(true)} />
        </>
      )}

      {gamePhase === 'ending' && sceneData && sceneData.isEnding && (
        <EndingScreen
          endingType={sceneData.endingType || 'normal'}
          endingTitle={sceneData.endingTitle || '结局'}
          text={sceneData.text}
          onRestart={handleRestart}
        />
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        masterVolume={masterVolume}
        onVolumeChange={handleVolumeChange}
        textSpeed={textSpeed}
        onTextSpeedChange={setTextSpeed}
        onResetGame={handleResetGame}
      />
    </div>
  );
};

export default App;
