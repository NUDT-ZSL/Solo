import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction, Piece } from '@/types';
import { generateInitialData, updateProgress } from '@/utils/dataGenerator';

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_INITIAL_DATA':
      return {
        pieces: action.payload.pieces,
        historyData: action.payload.historyData,
      };

    case 'ADD_PIECE': {
      const newPiece: Piece = {
        ...action.payload,
        id: Math.random().toString(36).substring(2, 11),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        pieces: [...state.pieces, newPiece],
      };
    }

    case 'UPDATE_PIECE':
      return {
        ...state,
        pieces: state.pieces.map((p) =>
          p.id === action.payload.id
            ? { ...action.payload, updatedAt: new Date().toISOString() }
            : p
        ),
      };

    case 'DELETE_PIECE':
      return {
        ...state,
        pieces: state.pieces.filter((p) => p.id !== action.payload),
        historyData: state.historyData.filter((d) => d.pieceId !== action.payload),
      };

    case 'UPDATE_VOICE_PROGRESS': {
      const { pieceId, voicePartId, increment } = action.payload;
      const newHistoryData = updateProgress(state.historyData, pieceId, voicePartId, increment);

      const updatedPieces = state.pieces.map((piece) => {
        if (piece.id !== pieceId) return piece;
        return {
          ...piece,
          updatedAt: new Date().toISOString(),
          voiceParts: piece.voiceParts.map((part) => {
            if (part.id !== voicePartId) return part;
            const newProgress = Math.min(100, Math.max(0, part.progress + increment));
            return { ...part, progress: newProgress };
          }),
        };
      });

      return {
        ...state,
        pieces: updatedPieces,
        historyData: newHistoryData,
      };
    }

    case 'UPDATE_TARGET_RANGE': {
      const { pieceId, voicePartId, targetRange } = action.payload;
      return {
        ...state,
        pieces: state.pieces.map((piece) => {
          if (piece.id !== pieceId) return piece;
          return {
            ...piece,
            updatedAt: new Date().toISOString(),
            voiceParts: piece.voiceParts.map((part) =>
              part.id === voicePartId ? { ...part, targetRange } : part
            ),
          };
        }),
      };
    }

    default:
      return state;
  }
}

const initialState: AppState = {
  pieces: [],
  historyData: [],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const { pieces, historyData } = generateInitialData();
    dispatch({ type: 'LOAD_INITIAL_DATA', payload: { pieces, historyData } });
  }, []);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
