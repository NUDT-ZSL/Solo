import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

export interface ColorToken {
  name: string;
  value: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  tokens: ColorToken[];
}

interface ColorState {
  schemes: ColorScheme[];
  currentSchemeId: string;
  compareSchemeIds: string[];
  isCompareMode: boolean;
}

type ColorAction =
  | { type: 'ADD_SCHEME'; payload: ColorScheme }
  | { type: 'DELETE_SCHEME'; payload: string }
  | { type: 'EDIT_SCHEME_NAME'; payload: { id: string; name: string } }
  | { type: 'SET_CURRENT_SCHEME'; payload: string }
  | { type: 'UPDATE_TOKEN'; payload: { schemeId: string; tokenIndex: number; token: ColorToken } }
  | { type: 'ADD_TOKEN'; payload: { schemeId: string; token: ColorToken } }
  | { type: 'DELETE_TOKEN'; payload: { schemeId: string; tokenIndex: number } }
  | { type: 'TOGGLE_COMPARE_SCHEME'; payload: string }
  | { type: 'SET_COMPARE_MODE'; payload: boolean }
  | { type: 'LOAD_STATE'; payload: ColorState };

const STORAGE_KEY = 'colorplay_schemes';

const generateRandomColor = (): string => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const generateDefaultTokens = (): ColorToken[] => [
  { name: '--primary', value: generateRandomColor() },
  { name: '--secondary', value: generateRandomColor() },
  { name: '--accent', value: generateRandomColor() },
  { name: '--background', value: generateRandomColor() },
  { name: '--text', value: generateRandomColor() },
];

export const createNewScheme = (name: string): ColorScheme => ({
  id: generateId(),
  name,
  tokens: generateDefaultTokens(),
});

const getInitialState = (): ColorState => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state:', e);
      }
    }
  }
  const defaultScheme = createNewScheme('默认方案');
  return {
    schemes: [defaultScheme],
    currentSchemeId: defaultScheme.id,
    compareSchemeIds: [],
    isCompareMode: false,
  };
};

const colorReducer = (state: ColorState, action: ColorAction): ColorState => {
  switch (action.type) {
    case 'ADD_SCHEME':
      return {
        ...state,
        schemes: [...state.schemes, action.payload],
        currentSchemeId: action.payload.id,
      };
    case 'DELETE_SCHEME': {
      const newSchemes = state.schemes.filter(s => s.id !== action.payload);
      const newCurrentId = state.currentSchemeId === action.payload
        ? (newSchemes[0]?.id || '')
        : state.currentSchemeId;
      return {
        ...state,
        schemes: newSchemes,
        currentSchemeId: newCurrentId,
        compareSchemeIds: state.compareSchemeIds.filter(id => id !== action.payload),
      };
    }
    case 'EDIT_SCHEME_NAME':
      return {
        ...state,
        schemes: state.schemes.map(s =>
          s.id === action.payload.id ? { ...s, name: action.payload.name } : s
        ),
      };
    case 'SET_CURRENT_SCHEME':
      return {
        ...state,
        currentSchemeId: action.payload,
      };
    case 'UPDATE_TOKEN':
      return {
        ...state,
        schemes: state.schemes.map(s =>
          s.id === action.payload.schemeId
            ? {
                ...s,
                tokens: s.tokens.map((t, i) =>
                  i === action.payload.tokenIndex ? action.payload.token : t
                ),
              }
            : s
        ),
      };
    case 'ADD_TOKEN':
      return {
        ...state,
        schemes: state.schemes.map(s =>
          s.id === action.payload.schemeId
            ? { ...s, tokens: [...s.tokens, action.payload.token] }
            : s
        ),
      };
    case 'DELETE_TOKEN':
      return {
        ...state,
        schemes: state.schemes.map(s =>
          s.id === action.payload.schemeId
            ? { ...s, tokens: s.tokens.filter((_, i) => i !== action.payload.tokenIndex) }
            : s
        ),
      };
    case 'TOGGLE_COMPARE_SCHEME': {
      const isSelected = state.compareSchemeIds.includes(action.payload);
      const newCompareIds = isSelected
        ? state.compareSchemeIds.filter(id => id !== action.payload)
        : [...state.compareSchemeIds, action.payload];
      return {
        ...state,
        compareSchemeIds: newCompareIds,
        isCompareMode: newCompareIds.length >= 2 && newCompareIds.length <= 4,
      };
    }
    case 'SET_COMPARE_MODE':
      return {
        ...state,
        isCompareMode: action.payload,
        compareSchemeIds: action.payload ? state.compareSchemeIds : [],
      };
    case 'LOAD_STATE':
      return action.payload;
    default:
      return state;
  }
};

interface ColorContextType {
  state: ColorState;
  dispatch: React.Dispatch<ColorAction>;
  getCurrentScheme: () => ColorScheme | undefined;
  getCompareSchemes: () => ColorScheme[];
  addScheme: (name: string) => void;
  deleteScheme: (id: string) => void;
  updateToken: (schemeId: string, tokenIndex: number, token: ColorToken) => void;
  addToken: (schemeId: string) => void;
  deleteToken: (schemeId: string, tokenIndex: number) => void;
  toggleCompareScheme: (id: string) => void;
  setCurrentScheme: (id: string) => void;
  importScheme: (code: string, name: string) => boolean;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export const parseColorCode = (code: string): ColorToken[] | null => {
  const tokens: ColorToken[] = [];
  
  const cssVarPattern = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g;
  const scssVarPattern = /\$([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g;
  
  let match;
  let found = false;
  
  while ((match = cssVarPattern.exec(code)) !== null) {
    tokens.push({ name: `--${match[1]}`, value: match[2] });
    found = true;
  }
  
  if (!found) {
    while ((match = scssVarPattern.exec(code)) !== null) {
      tokens.push({ name: `--${match[1]}`, value: match[2] });
      found = true;
    }
  }
  
  return found && tokens.length > 0 ? tokens : null;
};

export const ColorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(colorReducer, undefined, getInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getCurrentScheme = () =>
    state.schemes.find(s => s.id === state.currentSchemeId);

  const getCompareSchemes = () =>
    state.schemes.filter(s => state.compareSchemeIds.includes(s.id));

  const addScheme = (name: string) => {
    dispatch({ type: 'ADD_SCHEME', payload: createNewScheme(name) });
  };

  const deleteScheme = (id: string) => {
    if (state.schemes.length > 1) {
      dispatch({ type: 'DELETE_SCHEME', payload: id });
    }
  };

  const updateToken = (schemeId: string, tokenIndex: number, token: ColorToken) => {
    dispatch({ type: 'UPDATE_TOKEN', payload: { schemeId, tokenIndex, token } });
  };

  const addToken = (schemeId: string) => {
    const newToken: ColorToken = {
      name: `--custom-${generateId().slice(0, 4)}`,
      value: generateRandomColor(),
    };
    dispatch({ type: 'ADD_TOKEN', payload: { schemeId, token: newToken } });
  };

  const deleteToken = (schemeId: string, tokenIndex: number) => {
    const scheme = state.schemes.find(s => s.id === schemeId);
    if (scheme && scheme.tokens.length > 1) {
      dispatch({ type: 'DELETE_TOKEN', payload: { schemeId, tokenIndex } });
    }
  };

  const toggleCompareScheme = (id: string) => {
    dispatch({ type: 'TOGGLE_COMPARE_SCHEME', payload: id });
  };

  const setCurrentScheme = (id: string) => {
    dispatch({ type: 'SET_CURRENT_SCHEME', payload: id });
  };

  const importScheme = (code: string, name: string): boolean => {
    const tokens = parseColorCode(code);
    if (tokens) {
      const newScheme: ColorScheme = {
        id: generateId(),
        name,
        tokens,
      };
      dispatch({ type: 'ADD_SCHEME', payload: newScheme });
      return true;
    }
    return false;
  };

  const value: ColorContextType = {
    state,
    dispatch,
    getCurrentScheme,
    getCompareSchemes,
    addScheme,
    deleteScheme,
    updateToken,
    addToken,
    deleteToken,
    toggleCompareScheme,
    setCurrentScheme,
    importScheme,
  };

  return <ColorContext.Provider value={value}>{children}</ColorContext.Provider>;
};

export const useColorContext = (): ColorContextType => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error('useColorContext must be used within a ColorProvider');
  }
  return context;
};
