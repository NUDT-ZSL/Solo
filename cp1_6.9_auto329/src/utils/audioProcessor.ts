export interface AudioFeatures {
  stft: number[][];
  mfcc: number[][];
  volume: number[];
  duration: number;
  timeSteps: number;
  freqBins: number;
  sampleRate: number;
  frequencies: number[];
  freqMax: number;
  width: number;
  height: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

export async function uploadAudio(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent,
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('响应解析失败'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || `上传失败 (${xhr.status})`));
        } catch {
          reject(new Error(`上传失败 (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('网络错误，请检查连接'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      window.URL.revokeObjectURL(audio.src);
      reject(new Error('无法读取音频时长'));
    };
    audio.src = URL.createObjectURL(file);
  });
}

export async function extractAudioFeaturesLocal(
  file: File,
  targetTimeSteps: number = 300,
  targetFreqBins: number = 128
): Promise<AudioFeatures> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;

  const channelData = audioBuffer.getChannelData(0);
  const frameSize = 2048;
  const hopLength = Math.floor(channelData.length / targetTimeSteps);

  const stft: number[][] = [];
  const volume: number[] = [];
  let globalMin = Infinity;
  let globalMax = -Infinity;

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = frameSize;
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);

  for (let t = 0; t < targetTimeSteps; t++) {
    const start = t * hopLength;
    const end = Math.min(start + frameSize, channelData.length);
    const frame = new Float32Array(frameSize);
    for (let i = start; i < end; i++) {
      frame[i - start] = channelData[i];
    }

    const offlineContext = new OfflineAudioContext(1, frameSize, sampleRate);
    const offlineSource = offlineContext.createBufferSource();
    const offlineBuffer = offlineContext.createBuffer(1, frameSize, sampleRate);
    offlineBuffer.copyToChannel(frame, 0);
    offlineSource.buffer = offlineBuffer;
    const offlineAnalyser = offlineContext.createAnalyser();
    offlineAnalyser.fftSize = frameSize;
    offlineSource.connect(offlineAnalyser);
    offlineAnalyser.connect(offlineContext.destination);
    offlineSource.start();

    const freqDataArray = new Uint8Array(offlineAnalyser.frequencyBinCount);
    offlineAnalyser.getByteFrequencyData(freqDataArray);

    const downsampled = downsampleArray(
      Array.from(freqDataArray).map(v => v / 255),
      targetFreqBins
    );

    for (const v of downsampled) {
      globalMin = Math.min(globalMin, v);
      globalMax = Math.max(globalMax, v);
    }

    stft.push(downsampled);

    let sumSq = 0;
    for (let i = 0; i < end - start; i++) {
      sumSq += frame[i] * frame[i];
    }
    const rms = Math.sqrt(sumSq / (end - start));
    volume.push(rms);
  }

  const range = globalMax - globalMin || 1;
  const normalizedStft = stft.map(row =>
    row.map(v => (v - globalMin) / range)
  );

  const volMin = Math.min(...volume);
  const volMax = Math.max(...volume);
  const volRange = volMax - volMin || 1;
  const normalizedVolume = volume.map(v => (v - volMin) / volRange);

  const mfcc: number[][] = stft.map(row => {
    const coeffs = new Array(13).fill(0);
    for (let m = 0; m < 13; m++) {
      let sum = 0;
      for (let k = 0; k < row.length; k++) {
        sum += row[k] * Math.cos((Math.PI * m / row.length) * (k + 0.5));
      }
      coeffs[m] = sum / row.length;
    }
    return coeffs;
  });

  const freqMax = sampleRate / 2;
  const frequencies = Array.from({ length: targetFreqBins }, (_, i) =>
    (i / targetFreqBins) * freqMax
  );

  audioContext.close();

  return {
    stft: normalizedStft,
    mfcc,
    volume: normalizedVolume,
    duration,
    timeSteps: targetTimeSteps,
    freqBins: targetFreqBins,
    sampleRate,
    frequencies,
    freqMax,
    width: 512,
    height: 128,
  };
}

function downsampleArray(arr: number[], targetSize: number): number[] {
  if (arr.length === targetSize) return arr.slice();
  if (arr.length < targetSize) {
    const result = new Array(targetSize);
    for (let i = 0; i < targetSize; i++) {
      const idx = (i / targetSize) * arr.length;
      const low = Math.floor(idx);
      const high = Math.min(low + 1, arr.length - 1);
      const frac = idx - low;
      result[i] = arr[low] * (1 - frac) + arr[high] * frac;
    }
    return result;
  }
  const result = new Array(targetSize);
  const blockSize = arr.length / targetSize;
  for (let i = 0; i < targetSize; i++) {
    const start = Math.floor(i * blockSize);
    const end = Math.floor((i + 1) * blockSize);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < arr.length; j++) {
      sum += arr[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}

export function drawWaveform(
  canvas: HTMLCanvasElement,
  file: File,
  color: string = '#6cb5ff'
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取Canvas上下文'));
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;

      const samplesPerPixel = Math.floor(channelData.length / width);
      const centerY = height / 2;

      for (let x = 0; x < width; x++) {
        let min = 1.0;
        let max = -1.0;
        const start = x * samplesPerPixel;
        const end = Math.min(start + samplesPerPixel, channelData.length);
        for (let i = start; i < end; i++) {
          const v = channelData[i];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const yMin = (1 - (max + 1) / 2) * height;
        const yMax = (1 - (min + 1) / 2) * height;
        ctx.fillRect(x, yMin, 1, Math.max(1, yMax - yMin));
      }

      audioContext.close();
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['mp3', 'wav'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !validExtensions.includes(ext)) {
    return { valid: false, error: '不支持的文件格式，仅支持MP3和WAV' };
  }
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: '文件过大，最大支持50MB' };
  }
  return { valid: true };
}
