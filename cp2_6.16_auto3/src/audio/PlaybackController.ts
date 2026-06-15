import { AudioEngine } from './AudioEngine';
import { useMusicStore, Note, Chord } from '../store';

let initialized = false;

function ensureTickHandler() {
  if (initialized) return;
  initialized = true;
  AudioEngine.setTickHandler((noteIdx, chordIdx) => {
    const setCurrentPosition = useMusicStore.getState().setCurrentPosition;
    const setCurrentChordIndex = useMusicStore.getState().setCurrentChordIndex;
    const setIsPlaying = useMusicStore.getState().setIsPlaying;

    setCurrentPosition(noteIdx);
    setCurrentChordIndex(chordIdx);

    if (noteIdx === -1 && chordIdx === -1 && useMusicStore.getState().isPlaying) {
      setIsPlaying(false);
    }
  });
}

export function usePlaybackController() {
  const notes = useMusicStore((s) => s.notes);
  const chords = useMusicStore((s) => s.chords);
  const bpm = useMusicStore((s) => s.bpm);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isPaused = useMusicStore((s) => s.isPaused);

  const setIsPlaying = useMusicStore((s) => s.setIsPlaying);
  const setIsPaused = useMusicStore((s) => s.setIsPaused);
  const setCurrentPosition = useMusicStore((s) => s.setCurrentPosition);
  const setCurrentChordIndex = useMusicStore((s) => s.setCurrentChordIndex);

  const play = (customNotes?: Note[], customChords?: Chord[], customBpm?: number) => {
    ensureTickHandler();
    const n = customNotes ?? notes;
    const c = customChords ?? chords;
    const b = customBpm ?? bpm;

    if (n.length === 0) return;

    AudioEngine.ensureContext();
    AudioEngine.schedule(n, c, b);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const pause = () => {
    if (!isPlaying) return;
    AudioEngine.pause();
    setIsPaused(true);
  };

  const resume = () => {
    if (!isPaused) return;
    AudioEngine.resume();
    setIsPaused(false);
  };

  const stop = () => {
    AudioEngine.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentPosition(-1);
    setCurrentChordIndex(-1);
  };

  const toggle = () => {
    if (!isPlaying) {
      play();
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const playChord = (chord: Chord) => {
    ensureTickHandler();
    AudioEngine.playChordOnce(chord);
  };

  const getCurrentTime = () => AudioEngine.getCurrentTime();

  return { play, pause, resume, stop, toggle, playChord, getCurrentTime, isPlaying, isPaused };
}
