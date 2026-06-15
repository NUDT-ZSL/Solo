import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

const MAX_RECORD_DURATION = 30;
const WAVEFORM_BAR_COUNT = 16;

export function useAudioRecorder() {
  const updateRecording = useAppStore(state => state.updateRecordingPartial);
  const recording = useAppStore(state => state.recording);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const step = Math.floor(dataArray.length / WAVEFORM_BAR_COUNT);
    const waveform: number[] = [];

    for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j];
      }
      const avg = sum / step;
      const normalized = Math.min(100, (avg / 255) * 150);
      waveform.push(Math.max(4, normalized));
    }

    updateRecording({ waveformData: waveform });
    rafIdRef.current = requestAnimationFrame(updateWaveform);
  }, [updateRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          updateRecording({
            audioBase64: base64data,
            audioMimeType: mimeType,
            waveformData: new Array(WAVEFORM_BAR_COUNT).fill(0),
          });
        };
        reader.readAsDataURL(blob);

        streamRef.current?.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close();
        streamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;

        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      mediaRecorder.start(100);
      startTimeRef.current = Date.now();

      updateRecording({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBase64: null,
        audioMimeType: mimeType || 'audio/webm',
        waveformData: new Array(WAVEFORM_BAR_COUNT).fill(20),
      });

      durationIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (elapsed >= MAX_RECORD_DURATION) {
          stopRecording();
        } else {
          updateRecording({ duration: elapsed });
        }
      }, 100);

      rafIdRef.current = requestAnimationFrame(updateWaveform);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  }, [updateRecording, updateWaveform]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      updateRecording({
        isRecording: false,
        isPaused: false,
      });
    }
  }, [updateRecording]);

  const clearRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    updateRecording({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBase64: null,
      audioMimeType: 'audio/webm',
      waveformData: new Array(WAVEFORM_BAR_COUNT).fill(0),
    });
  }, [updateRecording]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return {
    isRecording: recording.isRecording,
    duration: recording.duration,
    audioBase64: recording.audioBase64,
    audioMimeType: recording.audioMimeType,
    waveformData: recording.waveformData,
    startRecording,
    stopRecording,
    clearRecording,
    MAX_RECORD_DURATION,
  };
}
