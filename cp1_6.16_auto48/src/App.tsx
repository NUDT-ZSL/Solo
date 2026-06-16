import React, { useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Material, Recipe, BrewingState, FinishedPotion, generateRecipe, calcQuality, mixColorWithHeat } from './gameLogic';
import { AppState, AppAction, SplashParticle, VortexParticle, SmokeParticle, GlowFlash } from './types';
import IngredientShelf from './components/IngredientShelf';
import Cauldron from './components/Cauldron';
import RecipeScroll from './components/RecipeScroll';
import PotionShelf from './components/PotionShelf';
import './App.css';

const initialState: AppState = {
  materials: [],
  recipeTemplates: [],
  currentRecipe: null,
  brewingState: {
    addedMaterials: [],
    currentHeat: 0,
    stirCount: 0
  },
  inventory: {},
  finishedPotions: [],
  draggingMaterial: null,
  dragPosition: { x: 0, y: 0 },
  isBrewing: false,
  showResult: false,
  lastResult: null,
  splashParticles: [],
  vortexParticles: [],
  smokeParticles: [],
  glowFlashes: [],
  bottleFlash: false,
  potionGlow: false
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MATERIALS':
      return {
        ...state,
        materials: action.payload,
        inventory: action.payload.reduce((acc, m) => ({ ...acc, [m.id]: 10 }), {})
      };
    case 'SET_RECIPES':
      return { ...state, recipeTemplates: action.payload };
    case 'SET_CURRENT_RECIPE':
      return { ...state, currentRecipe: action.payload };
    case 'GENERATE_NEW_RECIPE': {
      if (state.recipeTemplates.length === 0) return state;
      const newRecipe = generateRecipe(state.recipeTemplates, state.materials);
      return {
        ...state,
        currentRecipe: newRecipe,
        brewingState: {
          addedMaterials: [],
          currentHeat: 0,
          stirCount: 0
        },
        isBrewing: true,
        showResult: false,
        lastResult: null,
        splashParticles: [],
        vortexParticles: [],
        smokeParticles: [],
        glowFlashes: [],
        potionGlow: false
      };
    }
    case 'ADD_MATERIAL': {
      const existing = state.brewingState.addedMaterials.find(
        m => m.materialId === action.payload.materialId
      );
      let newAddedMaterials;
      if (existing) {
        newAddedMaterials = state.brewingState.addedMaterials.map(m =>
          m.materialId === action.payload.materialId
            ? { ...m, amount: m.amount + action.payload.amount }
            : m
        );
      } else {
        const newMat = {
          materialId: action.payload.materialId,
          amount: action.payload.amount
        };
        newAddedMaterials = state.brewingState.addedMaterials.concat(newMat);
      }
      return {
        ...state,
        brewingState: {
          ...state.brewingState,
          addedMaterials: newAddedMaterials
        }
      };
    }
    case 'SET_HEAT':
      return {
        ...state,
        brewingState: {
          ...state.brewingState,
          currentHeat: action.payload
        }
      };
    case 'INCREMENT_STIR':
      return {
        ...state,
        brewingState: {
          ...state.brewingState,
          stirCount: state.brewingState.stirCount + 1
        }
      };
    case 'RESET_BREWING': {
      const returnedInventory = { ...state.inventory };
      state.brewingState.addedMaterials.forEach(({ materialId, amount }) => {
        returnedInventory[materialId] = (returnedInventory[materialId] || 0) + amount;
      });
      return {
        ...state,
        brewingState: {
          addedMaterials: [],
          currentHeat: 0,
          stirCount: 0
        },
        inventory: returnedInventory,
        isBrewing: false,
        showResult: false,
        lastResult: null,
        splashParticles: [],
        vortexParticles: [],
        smokeParticles: [],
        glowFlashes: [],
        potionGlow: false
      };
    }
    case 'START_DRAGGING':
      return { ...state, draggingMaterial: action.payload };
    case 'UPDATE_DRAG_POSITION':
      return { ...state, dragPosition: action.payload };
    case 'STOP_DRAGGING':
      return { ...state, draggingMaterial: null };
    case 'DROP_MATERIAL': {
      const currentStock = state.inventory[action.payload.materialId] || 0;
      if (currentStock <= 0) return { ...state, draggingMaterial: null };
      const existing2 = state.brewingState.addedMaterials.find(
        m => m.materialId === action.payload.materialId
      );
      let newAddedMaterials2;
      if (existing2) {
        newAddedMaterials2 = state.brewingState.addedMaterials.map(m =>
          m.materialId === action.payload.materialId
            ? { ...m, amount: m.amount + 1 }
            : m
        );
      } else {
        const newMat2 = {
          materialId: action.payload.materialId,
          amount: 1
        };
        newAddedMaterials2 = state.brewingState.addedMaterials.concat(newMat2);
      }
      const splashParticles: SplashParticle[] = [];
      const material = state.materials.find(m => m.id === action.payload.materialId);
      for (let i = 0; i < 8; i++) {
        splashParticles.push({
          id: Date.now() + i,
          x: action.payload.x,
          y: action.payload.y,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 6 - 2,
          color: material?.color || '#FFFFFF',
          life: 30,
          maxLife: 30
        });
      }
      const glowFlash: GlowFlash = {
        id: Date.now(),
        x: action.payload.x,
        y: action.payload.y,
        color: material?.color || '#FFFFFF',
        life: 12,
        maxLife: 12,
        maxRadius: 80
      };
      return {
        ...state,
        draggingMaterial: null,
        brewingState: {
          ...state.brewingState,
          addedMaterials: newAddedMaterials2
        },
        inventory: {
          ...state.inventory,
          [action.payload.materialId]: currentStock - 1
        },
        splashParticles: state.splashParticles.concat(splashParticles),
        glowFlashes: state.glowFlashes.concat(glowFlash)
      };
    }
    case 'ADD_SPLASH_PARTICLES':
      return {
        ...state,
        splashParticles: state.splashParticles.concat(action.payload)
      };
    case 'ADD_VORTEX_PARTICLE':
      return {
        ...state,
        vortexParticles: state.vortexParticles.concat(action.payload)
      };
    case 'ADD_GLOW_FLASH':
      return {
        ...state,
        glowFlashes: state.glowFlashes.concat(action.payload)
      };
    case 'REMOVE_PARTICLES': {
      const updatedSplash = state.splashParticles
        .map(p => ({ ...p, life: p.life - 1, y: p.y + p.vy, vy: p.vy + 0.3, x: p.x + p.vx }))
        .filter(p => p.life > 0);
      const updatedVortex = state.vortexParticles
        .map(p => ({
          ...p,
          angle: p.angle + p.speed,
          radius: p.radius * 0.98,
          life: p.life - 1
        }))
        .filter(p => p.life > 0);
      const updatedSmoke = state.smokeParticles
        .map(p => ({
          ...p,
          y: p.y + p.vy,
          alpha: p.alpha * 0.98,
          size: p.size * 1.02,
          life: p.life - 1
        }))
        .filter(p => p.life > 0);
      const updatedGlow = state.glowFlashes
        .map(p => ({ ...p, life: p.life - 1 }))
        .filter(p => p.life > 0);
      return {
        ...state,
        splashParticles: updatedSplash,
        vortexParticles: updatedVortex,
        smokeParticles: updatedSmoke,
        glowFlashes: updatedGlow
      };
    }
    case 'BOTTLE_POTION':
      return state;
    case 'SET_RESULT': {
      const success = action.payload.success;
      let smokeParticles2: SmokeParticle[] = [];
      if (!success) {
        for (let i = 0; i < 15; i++) {
          smokeParticles2.push({
            id: Date.now() + i,
            x: Math.random() * 100,
            y: Math.random() * 50,
            size: 20 + Math.random() * 30,
            alpha: 0.8,
            vy: -1 - Math.random() * 2,
            life: 60
          });
        }
      }
      return {
        ...state,
        showResult: true,
        lastResult: action.payload,
        bottleFlash: success,
        smokeParticles: smokeParticles2,
        isBrewing: false,
        potionGlow: false
      };
    }
    case 'HIDE_RESULT':
      return { ...state, showResult: false, bottleFlash: false };
    case 'ADD_SMOKE_PARTICLES':
      return {
        ...state,
        smokeParticles: state.smokeParticles.concat(action.payload)
      };
    case 'TRIGGER_BOTTLE_FLASH': {
      if (state.lastResult?.success && state.currentRecipe) {
        const color = mixColorWithHeat(
          state.brewingState.addedMaterials,
          state.brewingState.currentHeat,
          state.materials
        );
        const newPotion: FinishedPotion = {
          id: uuidv4(),
          name: state.currentRecipe.name,
          color,
          quality: state.lastResult.quality,
          materials: state.brewingState.addedMaterials.map(m => m.materialId),
          timestamp: Date.now()
        };
        const newPotions = state.finishedPotions.concat(newPotion).slice(-9);
        return {
          ...state,
          finishedPotions: newPotions,
          bottleFlash: false,
          brewingState: {
            addedMaterials: [],
            currentHeat: 0,
            stirCount: 0
          },
          isBrewing: false
        };
      }
      return { ...state, bottleFlash: false };
    }
    case 'SET_POTION_GLOW':
      return { ...state, potionGlow: action.payload };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    fetch('/api/materials')
      .then(res => res.json())
      .then((data: Material[]) => dispatch({ type: 'SET_MATERIALS', payload: data }));
    
    fetch('/api/recipes')
      .then(res => res.json())
      .then((data: Recipe[]) => {
        dispatch({ type: 'SET_RECIPES', payload: data });
      });
  }, []);

  useEffect(() => {
    if (state.splashParticles.length > 0 || 
        state.vortexParticles.length > 0 || 
        state.smokeParticles.length > 0 ||
        state.glowFlashes.length > 0) {
      const timer = setInterval(() => {
        dispatch({ type: 'REMOVE_PARTICLES' });
      }, 16);
      return () => clearInterval(timer);
    }
  }, [state.splashParticles.length, state.vortexParticles.length, state.smokeParticles.length, state.glowFlashes.length]);

  useEffect(() => {
    if (state.bottleFlash && state.lastResult?.success) {
      const timer = setTimeout(() => {
        dispatch({ type: 'TRIGGER_BOTTLE_FLASH' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.bottleFlash, state.lastResult]);

  useEffect(() => {
    if (state.currentRecipe && state.isBrewing) {
      const result = calcQuality(
        state.brewingState,
        state.currentRecipe,
        state.materials
      );
      const shouldGlow = result.stars >= state.currentRecipe.minQuality && 
                        state.brewingState.addedMaterials.length > 0;
      dispatch({ type: 'SET_POTION_GLOW', payload: shouldGlow });
    }
  }, [state.brewingState.addedMaterials, state.brewingState.currentHeat, state.brewingState.stirCount, state.currentRecipe, state.isBrewing, state.materials]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (state.draggingMaterial) {
      dispatch({
        type: 'UPDATE_DRAG_POSITION',
        payload: { x: e.clientX, y: e.clientY }
      });
    }
  }, [state.draggingMaterial]);

  const handleMouseUp = useCallback(() => {
    if (state.draggingMaterial) {
      dispatch({ type: 'STOP_DRAGGING' });
    }
  }, [state.draggingMaterial]);

  const handleBottle = useCallback(() => {
    if (!state.currentRecipe || !state.isBrewing) return;
    
    const result = calcQuality(
      state.brewingState,
      state.currentRecipe,
      state.materials
    );
    
    const success = result.stars >= state.currentRecipe.minQuality;
    
    dispatch({
      type: 'SET_RESULT',
      payload: {
        success,
        quality: result.stars,
        feedback: result.feedback
      }
    });

    fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeName: state.currentRecipe.name,
        quality: result.stars,
        success,
        materialsUsed: state.brewingState.addedMaterials.map(m => m.materialId),
        heat: state.brewingState.currentHeat
      })
    });
  }, [state.currentRecipe, state.brewingState, state.isBrewing, state.materials]);

  const handleNewRecipe = useCallback(() => {
    if (!state.isBrewing || state.showResult) {
      dispatch({ type: 'GENERATE_NEW_RECIPE' });
    }
  }, [state.isBrewing, state.showResult]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET_BREWING' });
  }, []);

  const handleDropInCauldron = useCallback((materialId: string, x: number, y: number) => {
    dispatch({
      type: 'DROP_MATERIAL',
      payload: { materialId, x, y }
    });
  }, []);

  const handleStir = useCallback(() => {
    dispatch({ type: 'INCREMENT_STIR' });
    
    const color = mixColorWithHeat(
      state.brewingState.addedMaterials,
      state.brewingState.currentHeat,
      state.materials
    );
    
    const particle: VortexParticle = {
      id: Date.now(),
      angle: Math.random() * Math.PI * 2,
      radius: 60 + Math.random() * 40,
      speed: 0.15 + Math.random() * 0.1,
      color,
      life: 60
    };
    dispatch({ type: 'ADD_VORTEX_PARTICLE', payload: particle });
  }, [state.brewingState, state.materials]);

  const handleHeatChange = useCallback((heat: number) => {
    dispatch({ type: 'SET_HEAT', payload: heat });
  }, []);

  const handleDragStart = useCallback((material: Material) => {
    dispatch({ type: 'START_DRAGGING', payload: material });
  }, []);

  return (
    <div 
      className="app-container"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <header className="app-header">
        <h1>🧪 魔法药水工坊 🧙‍♂️</h1>
        <p className="subtitle">初级炼金术师的修炼之路</p>
      </header>

      <div className="main-layout">
        <aside className="left-panel">
          <IngredientShelf
            materials={state.materials}
            inventory={state.inventory}
            onDragStart={handleDragStart}
          />
        </aside>

        <main className="center-panel">
          <Cauldron
            brewingState={state.brewingState}
            materials={state.materials}
            onDrop={handleDropInCauldron}
            onStir={handleStir}
            onHeatChange={handleHeatChange}
            onBottle={handleBottle}
            onReset={handleReset}
            onNewRecipe={handleNewRecipe}
            splashParticles={state.splashParticles}
            vortexParticles={state.vortexParticles}
            smokeParticles={state.smokeParticles}
            glowFlashes={state.glowFlashes}
            isBrewing={state.isBrewing}
            showResult={state.showResult}
            lastResult={state.lastResult}
            bottleFlash={state.bottleFlash}
            potionGlow={state.potionGlow}
            canStart={!state.isBrewing || state.showResult}
          />

          {state.showResult && state.lastResult && (() => {
            const result = state.lastResult;
            return (
              <div className="result-overlay" onClick={() => dispatch({ type: 'HIDE_RESULT' })}>
                <div className="result-modal" onClick={e => e.stopPropagation()}>
                  <h2>{result.success ? '✨ 酿造成功！✨' : '💨 酿造失败... 💨'}</h2>
                  <div className="quality-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`star ${i < result.quality ? 'filled' : ''}`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                  <p className="result-feedback">{result.feedback}</p>
                  <button 
                    className="magic-btn"
                    onClick={() => {
                      dispatch({ type: 'HIDE_RESULT' });
                      if (!result.success) {
                        dispatch({ type: 'TRIGGER_BOTTLE_FLASH' });
                      }
                    }}
                  >
                    {result.success ? '装瓶存放' : '重新开始'}
                  </button>
                </div>
              </div>
            );
          })()}
        </main>

        <aside className="right-panel">
          <RecipeScroll
            recipe={state.currentRecipe}
            materials={state.materials}
            isAnimating={!state.currentRecipe}
          />
          <PotionShelf potions={state.finishedPotions} materials={state.materials} />
        </aside>
      </div>

      {state.draggingMaterial && (
        <div
          className="dragging-material"
          style={{
            left: state.dragPosition.x,
            top: state.dragPosition.y,
            backgroundColor: state.draggingMaterial.color,
          }}
        >
          <span className="material-icon">{state.draggingMaterial.icon}</span>
          <span className="material-name">{state.draggingMaterial.name}</span>
        </div>
      )}
    </div>
  );
};

export default App;
