import { getThemeById, getRandomGradient, getRandomFilterTag } from '../styles/themes';
import type { Theme } from '../styles/themes';
import type { ParsedLyrics, ParsedLyricLine } from './LyricsParser';

export interface PosterLayout {
  width: number;
  height: number;
  padding: number;
  titlePosition: { x: number; y: number };
  artistPosition: { x: number; y: number };
  lyricsArea: { x: number; y: number; width: number; height: number };
}

export interface PosterStyle {
  background: string;
  texture: string;
  titleStyle: React.CSSProperties;
  artistStyle: React.CSSProperties;
  lyricLineStyle: React.CSSProperties;
  containerStyle: React.CSSProperties;
}

export interface PosterRenderData {
  layout: PosterLayout;
  style: PosterStyle;
  displayLyrics: ParsedLyricLine[];
}

export interface CardStyleData {
  id: string;
  gradient: string;
  texture: string;
  filterTag: string;
  shadow: string;
  borderRadius: number;
  fontFamily: string;
}

export const POSTER_WIDTH = 594;
export const POSTER_HEIGHT = 841;
export const POSTER_PADDING = 120;

export const CARD_WIDTH = 240;
export const CARD_HEIGHT = 320;

export function generatePosterLayout(): PosterLayout {
  const width = POSTER_WIDTH;
  const height = POSTER_HEIGHT;
  const padding = POSTER_PADDING;

  return {
    width,
    height,
    padding,
    titlePosition: { x: padding, y: padding + 40 },
    artistPosition: { x: padding, y: padding + 110 },
    lyricsArea: {
      x: padding,
      y: height - padding - 280,
      width: width - padding * 2,
      height: 280
    }
  };
}

export function generatePosterStyle(themeId: string): PosterStyle {
  const theme = getThemeById(themeId);

  return {
    background: theme.posterBackground,
    texture: theme.texturePattern,
    titleStyle: {
      fontFamily: theme.fontFamily,
      fontSize: '48px',
      fontWeight: 800,
      color: '#FFFFFF',
      letterSpacing: '2px',
      lineHeight: 1.2,
      margin: 0,
      textShadow: '0 4px 20px rgba(0,0,0,0.3)'
    },
    artistStyle: {
      fontFamily: theme.fontFamily,
      fontSize: '20px',
      fontWeight: 400,
      color: '#CFD8DC',
      letterSpacing: '4px',
      margin: 0,
      marginTop: '16px'
    },
    lyricLineStyle: {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.85)',
      lineHeight: 1.9,
      marginBottom: '8px',
      letterSpacing: '1px'
    },
    containerStyle: {
      position: 'relative' as const,
      width: `${POSTER_WIDTH}px`,
      height: `${POSTER_HEIGHT}px`,
      overflow: 'hidden' as const,
      fontFamily: theme.fontFamily
    }
  };
}

export function selectPosterLyrics(parsedLyrics: ParsedLyrics, maxLines: number = 8): ParsedLyricLine[] {
  if (parsedLyrics.lines.length <= maxLines) {
    return parsedLyrics.lines;
  }

  const preferred: ParsedLyricLine[] = [];
  const emotions = ['nostalgic', 'passionate', 'calm', 'sad', 'happy'];

  for (const emotion of emotions) {
    const emotionLines = parsedLyrics.lines.filter(l => l.emotion === emotion);
    emotionLines.sort((a, b) => b.length - a.length);
    preferred.push(...emotionLines.slice(0, 2));
  }

  if (preferred.length < maxLines) {
    const remaining = parsedLyrics.lines
      .filter(l => !preferred.includes(l))
      .sort((a, b) => b.length - a.length);
    preferred.push(...remaining.slice(0, maxLines - preferred.length));
  }

  const result = preferred.slice(0, maxLines);
  const orderMap = new Map(parsedLyrics.lines.map((l, i) => [l.id, i]));
  result.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return result;
}

export function generatePoster(
  songName: string,
  artistName: string,
  parsedLyrics: ParsedLyrics,
  themeId: string
): PosterRenderData {
  return {
    layout: generatePosterLayout(),
    style: generatePosterStyle(themeId),
    displayLyrics: selectPosterLyrics(parsedLyrics)
  };
}

export function generateCardStyles(
  lines: ParsedLyricLine[],
  themeId: string
): CardStyleData[] {
  const theme = getThemeById(themeId);

  return lines.map(line => ({
    id: line.id,
    gradient: getRandomGradient(theme),
    texture: theme.texturePattern,
    filterTag: getRandomFilterTag(),
    shadow: theme.cardShadow,
    borderRadius: theme.cardBorderRadius,
    fontFamily: theme.fontFamily
  }));
}
