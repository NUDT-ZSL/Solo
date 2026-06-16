import React, { useReducer, useEffect, useCallback } from 'react';
import type { WorkshopState, AlchemyAction } from './types';
import {
  getInitialState,
  runAlchemy,
  generateRandomEvent,
  applyWorkshopEvent,
  logEvent,
  listForSale,
  executeTrade
} from './gameLoop';
import { AlchemyWorkspace } from './AlchemyWorkspace';
import { Inventory } from './Inventory';

function reducer(state: WorkshopState, action: AlchemyAction): WorkshopState {
  switch (action.type) {
    case 'SELECT_RECIPE':
      return {
        ...state,
        selectedRecipeId: action.recipeId,
        cauldron: []
      };

    case 'ADD_MATERIAL': {
      const existing = state.cauldron.find(c => c.materialId === action.materialId);
      let newCauldron;
      if (existing) {
        newCauldron = state.cauldron.map(c =>
          c.materialId === action.materialId
            ? { ...c, quantity: c.quantity + action.quantity }
            : c
        );
      } else {
        newCauldron = [...state.cauldron, { materialId: action.materialId, quantity: action.quantity }];
      }
      return { ...state, cauldron: newCauldron };
    }

    case 'REMOVE_MATERIAL': {
      const existing = state.cauldron.find(c => c.materialId === action.materialId);
      if (!existing) return state;
      
      if (existing.quantity <= action.quantity) {
        return {
          ...state,
          cauldron: state.cauldron.filter(c => c.materialId !== action.materialId)
        };
      }
      return {
        ...state,
        cauldron: state.cauldron.map(c =>
          c.materialId === action.materialId
            ? { ...c, quantity: c.quantity - action.quantity }
            : c
        )
      };
    }

    case 'CLEAR_CAULDRON':
      return { ...state, cauldron: [] };

    case 'START_ALCHEMY':
      return {
        ...state,
        isAlchemizing: true,
        alchemyStartTime: Date.now(),
        alchemyProgress: 0,
        isBrewFailed: false
      };

    case 'UPDATE_PROGRESS': {
      const newState = { ...state, alchemyProgress: action.progress };
      
      if (action.progress >= 1) {
        const selectedRecipe = state.recipes.find(r => r.id === state.selectedRecipeId);
        if (selectedRecipe) {
          const result = runAlchemy(
            selectedRecipe,
            state.cauldron,
            state.qualityPenalty,
            state.materialLossMultiplier,
            state.isBrewFailed
          );

          const newMaterials = state.materials.map(m => {
            const inCauldron = state.cauldron.find(c => c.materialId === m.id);
            if (inCauldron) {
              const lost = result.waste
                ? result.waste.find(w => w.materialId === m.id)?.quantity || 0
                : inCauldron.quantity;
              return { ...m, quantity: Math.max(0, m.quantity - lost) };
            }
            return m;
          });

          let newInventory = [...state.inventory];
          if (result.success && result.potion) {
            const existingPotion = newInventory.find(
              p => p.name === result.potion!.name && p.quality === result.potion!.quality
            );
            if (existingPotion) {
              newInventory = newInventory.map(p =>
                p.id === existingPotion.id
                  ? { ...p, quantity: p.quantity + 1 }
                  : p
              );
            } else {
              newInventory = [...newInventory, result.potion];
            }
          }

          const newSuccessCount = result.success ? state.successfulAlchemies + 1 : state.successfulAlchemies;

          return {
            ...newState,
            isAlchemizing: false,
            alchemyStartTime: null,
            alchemyProgress: 0,
            activeEvent: null,
            materials: newMaterials,
            cauldron: [],
            inventory: newInventory,
            successfulAlchemies: newSuccessCount,
            qualityPenalty: 0,
            isBrewFailed: false
          };
        }
        return {
          ...newState,
          isAlchemizing: false,
          alchemyStartTime: null,
          alchemyProgress: 0,
          activeEvent: null,
          cauldron: []
        };
      }
      
      return newState;
    }

    case 'TRIGGER_EVENT':
      return { ...state, activeEvent: action.event };

    case 'RESOLVE_EVENT': {
      if (!state.activeEvent) return state;
      
      let newState = { ...state, activeEvent: null };
      
      const loggedEvent = logEvent(state.activeEvent);
      newState.eventLog = [loggedEvent, ...newState.eventLog];

      if (!action.success) {
        if (state.activeEvent.type === 'cauldron_smoke') {
          newState.isBrewFailed = true;
          newState.materialLossMultiplier = Math.min(1.5, state.materialLossMultiplier + 0.2);
        } else if (state.activeEvent.type === 'spark_splash') {
          newState.qualityPenalty = Math.min(0.5, state.qualityPenalty + 0.2);
        }
      }

      return newState;
    }

    case 'FINISH_ALCHEMY':
      return state;

    case 'LOG_EVENT':
      return {
        ...state,
        eventLog: [action.event, ...state.eventLog]
      };

    case 'LIST_FOR_SALE': {
      const result = listForSale(state.inventory, action.potionId, action.price, state.shopItems);
      if (result.success) {
        return {
          ...state,
          inventory: result.newInventory,
          shopItems: result.newShopItems
        };
      }
      return state;
    }

    case 'BUY_ITEM': {
      const result = executeTrade(state.shopItems, state.inventory, action.itemId, state.gold);
      if (result.success) {
        return {
          ...state,
          shopItems: result.newShopItems,
          inventory: result.newInventory,
          gold: state.gold + result.goldChange
        };
      }
      return state;
    }

    case 'UPDATE_MATERIALS':
      return { ...state, materials: action.materials };

    case 'UPDATE_PRICE_MULTIPLIER':
      return { ...state, priceMultiplier: action.multiplier };

    case 'UPDATE_QUALITY_PENALTY':
      return { ...state, qualityPenalty: action.penalty };

    case 'INCREMENT_SUCCESS_COUNT':
      return { ...state, successfulAlchemies: state.successfulAlchemies + 1 };

    case 'TOGGLE_RECIPE_PANEL':
      return { ...state, showRecipePanel: !state.showRecipePanel };

    case 'SET_PAGE':
      return { ...state, currentPage: action.page };

    case 'ADD_GOLD':
      return { ...state, gold: Math.max(0, state.gold + action.amount) };

    case 'ADD_MATERIAL_BONUS': {
      return {
        ...state,
        materials: state.materials.map(m =>
          m.id === action.materialId
            ? { ...m, quantity: m.quantity + action.quantity }
            : m
        )
      };
    }

    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, getInitialState());

  useEffect(() => {
    if (state.successfulAlchemies > 0 && state.successfulAlchemies % 3 === 0 && !state.isAlchemizing) {
      const event = generateRandomEvent('workshop');
      if (event) {
        dispatch({ type: 'TRIGGER_EVENT', event });
        
        const updates = applyWorkshopEvent(event, state);
        Object.entries(updates).forEach(([key, value]) => {
          switch (key) {
            case 'priceMultiplier':
              dispatch({ type: 'UPDATE_PRICE_MULTIPLIER', multiplier: value as number });
              break;
            case 'materials':
              dispatch({ type: 'UPDATE_MATERIALS', materials: value as typeof state.materials });
              break;
            case 'qualityPenalty':
              dispatch({ type: 'UPDATE_QUALITY_PENALTY', penalty: value as number });
              break;
            case 'materialLossMultiplier':
              break;
          }
        });
      }
    }
  }, [state.successfulAlchemies, state.isAlchemizing, state]);

  const handleResolveWorkshopEvent = useCallback(() => {
    if (state.activeEvent) {
      const loggedEvent = logEvent(state.activeEvent);
      dispatch({ type: 'LOG_EVENT', event: loggedEvent });
      dispatch({ type: 'RESOLVE_EVENT', success: true });
    }
  }, [state.activeEvent]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1A1A2E',
      fontFamily: "'Josefin Sans', sans-serif",
      color: '#fff'
    }}>
      <header style={{
        padding: '16px 24px',
        backgroundColor: '#16213E',
        borderBottom: '2px solid #E94560',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: '32px',
          color: '#E94560',
          margin: 0,
          textShadow: '0 0 20px rgba(233, 69, 96, 0.5)'
        }}>
          ⚗️ 炼金工坊模拟器 ⚗️
        </h1>
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '14px',
          color: '#888'
        }}>
          成功炼金次数: {state.successfulAlchemies} | 价格系数: {(state.priceMultiplier * 100).toFixed(0)}%
        </p>
      </header>

      <main style={{
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: '16px',
        padding: '16px',
        height: 'calc(100vh - 100px)',
        maxWidth: '1800px',
        margin: '0 auto'
      }}>
        <div style={{ minWidth: 0 }}>
          <AlchemyWorkspace state={state} dispatch={dispatch} />
        </div>
        <div style={{ minWidth: 0 }}>
          <Inventory state={state} dispatch={dispatch} />
        </div>
      </main>

      {state.activeEvent && state.activeEvent.type !== 'cauldron_smoke' && state.activeEvent.type !== 'spark_splash' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            backgroundColor: '#1F1B2E',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            animation: 'scaleIn 0.3s ease-out',
            border: '1px solid rgba(233, 69, 96, 0.4)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>
              {state.activeEvent.type === 'price_fluctuation' ? '📈' :
               state.activeEvent.type === 'apprentice_gift' ? '🎁' :
               state.activeEvent.type === 'quality_mutation' ? '✨' : '💥'}
            </div>
            <h2 style={{
              fontFamily: "'Cinzel Decorative', serif",
              fontSize: '22px',
              color: '#E94560',
              margin: '0 0 16px 0'
            }}>
              工坊事件！
            </h2>
            <p style={{
              fontSize: '16px',
              lineHeight: 1.6,
              margin: '0 0 24px 0',
              color: '#ddd'
            }}>
              {state.activeEvent.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleResolveWorkshopEvent}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#E94560',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.1s ease'
                }}
                className="interactive-element"
              >
                确定
              </button>
              <button
                onClick={() => {
                  if (state.activeEvent) {
                    dispatch({
                      type: 'LOG_EVENT',
                      event: {
                        id: state.activeEvent.id,
                        type: state.activeEvent.type,
                        message: state.activeEvent.message,
                        timestamp: Date.now()
                      }
                    });
                    dispatch({ type: 'RESOLVE_EVENT', success: true });
                  }
                }}
                style={{
                  padding: '12px 32px',
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease'
                }}
                className="interactive-element"
              >
                记录
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .interactive-element:hover {
          background-color: rgba(233, 69, 96, 0.2) !important;
        }
        .interactive-element:active {
          transform: scale(0.95);
        }
        @media (max-width: 1024px) {
          main {
            grid-template-columns: 1fr !important;
          }
          main > div:last-child {
            display: none;
          }
        }
        @media (max-width: 768px) {
          h1 {
            font-size: 24px !important;
          }
          header p {
            font-size: 12px !important;
          }
          main {
            padding: 8px !important;
            height: calc(100vh - 80px) !important;
          }
        }
        @media (max-width: 480px) {
          main {
            grid-template-columns: 1fr !important;
          }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(233, 69, 96, 0.5);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default App;
