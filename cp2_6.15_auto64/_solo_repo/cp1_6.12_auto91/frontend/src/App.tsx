import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import SentimentTimeline from './components/SentimentTimeline';
import EmotionRadar from './components/EmotionRadar';
import MediaWall from './components/MediaWall';
import { fetchInitialData } from './services/api';
import {
  EMOTION_COLORS,
  EMOTION_LABELS_CN,
  EMOTION_EMOJI,
} from './types';
import type {
  InitialData,
  EmotionType,
  TimelinePoint,
  Comment,
  MediaItem,
  EmotionSummary,
} from './types';

type EmotionKey = Exclude<EmotionType, 'all'>;

export default function App() {
  const [data, setData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTimePoint, setSelectedTimePoint] = useState<TimelinePoint | null>(null);
  const [contentVisible, setContentVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const perfStartRef = useRef(0);

