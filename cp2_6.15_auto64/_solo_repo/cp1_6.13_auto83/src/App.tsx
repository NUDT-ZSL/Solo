import { useReducer, useCallback, useEffect, useRef } from 'react';
import { fontList, loadGoogleFont, type FontItem } from './fontData';
import FontList from './FontList';
import PreviewCanvas from './PreviewCanvas';
import SavePanel from './SavePanel';

export interface FontScheme {
  id: string;
  name: string;
  fonts: string[];
  fontSizes: number[];
  lineHeights: number[];
  columnCount: number;
  createdAt: number;
}

export interface AppState {
  selectedFont: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  textType: 'english' | 'chinese' | 'symbols';
  compareMode: boolean;
  compareFonts: string[];
  compareFontSizes: number[];
  compareLineHeights: number[];
  schemes: FontScheme[];
  drawerOpen: boolean;
  opacity: number;
}

type Action =
  | { type: 'SELECT_FONT'; font: string }
  | { type: 'SET_FONT_WEIGHT'; weight: number }
  | { type: 'SET_FONT_SIZE'; size: number }
  | { type: 'SET_LINE_HEIGHT'; height: number }
  | { type: 'SET_TEXT_TYPE'; textType: 'english' | 'chinese' | 'symbols' }
  | { type: 'TOGGLE_COMPARE_MODE' }
  | { type: 'TOGGLE_COMPARE_FONT'; font: string }
  | { type: 'SET_COMPARE_FONT_SIZE'; index: number; size: number }
  | { type: 'SET_COMPARE_LINE_HEIGHT'; index: number; height: number }
  | { type: 'SAVE_SCHEME'; scheme: FontScheme }
  | { type: 'LOAD_SCHEME'; scheme: FontScheme }
  | { type: 'DELETE_SCHEME'; id: string }
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'SET_OPACITY'; opacity: number };

const initialState: AppState = {
  selectedFont: 'Inter',
  fontWeight: 400,
  fontSize: 16,
  lineHeight: 1.6,
  textType: 'english',
  compareMode: false,
  compareFonts: [],
  compareFontSizes: [],
  compareLineHeights: [],
  schemes: [],
  drawerOpen: false,
  opacity: 1,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_FONT':
      return { ...state, selectedFont: action.font };
    case 'SET_FONT_WEIGHT':
      return { ...state, fontWeight: action.weight };
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.size };
    case 'SET_LINE_HEIGHT':
      return { ...state, lineHeight: action.height };
    case 'SET_TEXT_TYPE':
      return { ...state, textType: action.textType };
    case 'TOGGLE_COMPARE_MODE':
      return { ...state, compareMode: !state.compareMode };
    case 'TOGGLE_COMPARE_FONT': {
      const exists = state.compareFonts.includes(action.font);
      if (exists) {
        const idx = state.compareFonts.indexOf(action.font);
        const newFonts = state.compareFonts.filter((f) => f !== action.font);
        const newSizes = state.compareFontSizes.filter((_, i) => i !== idx);
        const newHeights = state.compareLineHeights.filter((_, i) => i !== idx);
        return {
          ...state,
          compareFonts: newFonts,
          compareFontSizes: newSizes,
          compareLineHeights: newHeights,
        };
      }
      if (state.compareFonts.length >= 4) return state;
      return {
        ...state,
        compareFonts: [...state.compareFonts, action.font],
        compareFontSizes: [...state.compareFontSizes, state.fontSize],
        compareLineHeights: [...state.compareLineHeights, state.lineHeight],
      };
    }
    case 'SET_COMPARE_FONT_SIZE': {
      const sizes = [...state.compareFontSizes];
      sizes[action.index] = action.size;
      return { ...state, compareFontSizes: sizes };
    }
    case 'SET_COMPARE_LINE_HEIGHT': {
      const heights = [...state.compareLineHeights];
      heights[action.index] = action.height;
      return { ...state, compareLineHeights: heights };
    }
    case 'SAVE_SCHEME':
      return { ...state, schemes: [...state.schemes, action.scheme] };
    case 'LOAD_SCHEME':
      return {
        ...state,
        selectedFont: action.scheme.fonts[0],
        fontSize: action.scheme.fontSizes[0],
        lineHeight: action.scheme.lineHeights[0],
        compareMode: action.scheme.columnCount > 1,
        compareFonts: action.scheme.fonts.slice(1),
        compareFontSizes: action.scheme.fontSizes.slice(1),
        compareLineHeights: action.scheme.lineHeights.slice(1),
      };
    case 'DELETE_SCHEME':
      return { ...state, schemes: state.schemes.filter((s) => s.id !== action.id) };
    case 'TOGGLE_DRAWER':
      return { ...state, drawerOpen: !state.drawerOpen };
    case 'SET_OPACITY':
      return { ...state, opacity: action.opacity };
    default:
      return state;
  }
}

export default function App() {
  const initialFontLoadedRef = useRef(false);

  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    let schemes: FontScheme[] = [];
    try {
      const saved = localStorage.getItem('font-schemes');
      if (saved) {
        schemes = JSON.parse(saved) as FontScheme[];
      }
    } catch {
      /* ignore */
    }
    return { ...init, schemes };
  });

  useEffect(() => {
    localStorage.setItem('font-schemes', JSON.stringify(state.schemes));
  }, [state.schemes]);

  useEffect(() => {
    if (!initialFontLoadedRef.current) {
      initialFontLoadedRef.current = true;
      const initialFont = fontList.find((f) => f.name === state.selectedFont);
      if (initialFont) {
        loadGoogleFont(initialFont);
      }
    }
  }, [state.selectedFont]);

  const handleSelectFont = useCallback((font: string) => {
    const fontItem = fontList.find((f) => f.name === font);
    if (fontItem) {
      loadGoogleFont(fontItem);
    }
    dispatch({ type: 'SET_OPACITY', opacity: 0 });
    window.setTimeout(() => {
      dispatch({ type: 'SELECT_FONT', font });
      window.setTimeout(() => {
        dispatch({ type: 'SET_OPACITY', opacity: 1 });
      }, 0);
    }, 200);
  }, []);

  const handleToggleCompareFont = useCallback((font: string) => {
    const fontItem = fontList.find((f) => f.name === font);
    if (fontItem) {
      loadGoogleFont(fontItem);
    }
    dispatch({ type: 'TOGGLE_COMPARE_FONT', font });
  }, []);

  const handleSaveScheme = useCallback(
    (name: string) => {
      const allFonts = [state.selectedFont, ...state.compareFonts];
      const allSizes = [state.fontSize, ...state.compareFontSizes];
      const allHeights = [state.lineHeight, ...state.compareLineHeights];
      const scheme: FontScheme = {
        id: Date.now().toString(),
        name,
        fonts: allFonts,
        fontSizes: allSizes,
        lineHeights: allHeights,
        columnCount: state.compareMode ? allFonts.length : 1,
        createdAt: Date.now(),
      };
      dispatch({ type: 'SAVE_SCHEME', scheme });
    },
    [state.selectedFont, state.compareFonts, state.fontSize, state.compareFontSizes, state.lineHeight, state.compareLineHeights, state.compareMode]
  );

  const handleLoadScheme = useCallback((scheme: FontScheme) => {
    scheme.fonts.forEach((fName) => {
      const fi = fontList.find((f) => f.name === fName);
      if (fi) loadGoogleFont(fi);
    });
    dispatch({ type: 'SET_OPACITY', opacity: 0 });
    window.setTimeout(() => {
      dispatch({ type: 'LOAD_SCHEME', scheme });
      window.setTimeout(() => {
        dispatch({ type: 'SET_OPACITY', opacity: 1 });
      }, 0);
    }, 200);
  }, []);

  const selectedFontItem: FontItem | undefined = fontList.find((f) => f.name === state.selectedFont);

  return (
    <div className="app-container">
      <SavePanel
        schemes={state.schemes}
        drawerOpen={state.drawerOpen}
        onToggleDrawer={() => dispatch({ type: 'TOGGLE_DRAWER' })}
        onSave={handleSaveScheme}
        onLoad={handleLoadScheme}
        onDelete={(id) => dispatch({ type: 'DELETE_SCHEME', id })}
      />
      <div className="app-body">
        <FontList
          fonts={fontList}
          selectedFont={state.selectedFont}
          compareMode={state.compareMode}
          compareFonts={state.compareFonts}
          onSelectFont={handleSelectFont}
          onToggleCompareMode={() => dispatch({ type: 'TOGGLE_COMPARE_MODE' })}
          onToggleCompareFont={handleToggleCompareFont}
        />
        <div className="preview-area">
          <PreviewCanvas
            selectedFont={state.selectedFont}
            fontWeight={state.fontWeight}
            fontSize={state.fontSize}
            lineHeight={state.lineHeight}
            textType={state.textType}
            compareMode={state.compareMode}
            compareFonts={state.compareFonts}
            compareFontSizes={state.compareFontSizes}
            compareLineHeights={state.compareLineHeights}
            opacity={state.opacity}
            fontItem={selectedFontItem}
            onFontWeightChange={(w) => dispatch({ type: 'SET_FONT_WEIGHT', weight: w })}
            onFontSizeChange={(s) => dispatch({ type: 'SET_FONT_SIZE', size: s })}
            onLineHeightChange={(h) => dispatch({ type: 'SET_LINE_HEIGHT', height: h })}
            onTextTypeChange={(t) => dispatch({ type: 'SET_TEXT_TYPE', textType: t })}
            onCompareFontSizeChange={(i, s) => dispatch({ type: 'SET_COMPARE_FONT_SIZE', index: i, size: s })}
            onCompareLineHeightChange={(i, h) => dispatch({ type: 'SET_COMPARE_LINE_HEIGHT', index: i, height: h })}
          />
        </div>
      </div>
    </div>
  );
}
