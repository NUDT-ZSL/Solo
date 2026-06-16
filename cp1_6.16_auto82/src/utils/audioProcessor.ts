export interface PhonemeError {
  time: number;
  expected: string;
  actual: string;
  suggestion: string;
  confidence: number;
}

export interface AlignmentResult {
  errors: PhonemeError[];
  overallScore: number;
  userWaveform: Float32Array;
  referenceWaveform: Float32Array;
  phonemeScores: { phoneme: string; score: number }[];
  duration: number;
}

export interface MFCCFrame {
  coefficients: number[];
  time: number;
}

export const normalizeAudio = (audioData: Float32Array): Float32Array => {
  let maxAmplitude = 0;
  for (let i = 0; i < audioData.length; i++) {
    const absValue = Math.abs(audioData[i]);
    if (absValue > maxAmplitude) {
      maxAmplitude = absValue;
    }
  }
  
  if (maxAmplitude === 0) return audioData;
  
  const normalized = new Float32Array(audioData.length);
  const scale = 0.95 / maxAmplitude;
  for (let i = 0; i < audioData.length; i++) {
    normalized[i] = audioData[i] * scale;
  }
  
  return normalized;
};

const hammingWindow = (length: number): Float32Array => {
  const window = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (length - 1));
  }
  return window;
};

const fft = (real: Float32Array, imag: Float32Array): void => {
  const n = real.length;
  if (n <= 1) return;
  
  const half = n / 2;
  
  const evenReal = new Float32Array(half);
  const evenImag = new Float32Array(half);
  const oddReal = new Float32Array(half);
  const oddImag = new Float32Array(half);
  
  for (let i = 0; i < half; i++) {
    evenReal[i] = real[2 * i];
    evenImag[i] = imag[2 * i];
    oddReal[i] = real[2 * i + 1];
    oddImag[i] = imag[2 * i + 1];
  }
  
  fft(evenReal, evenImag);
  fft(oddReal, oddImag);
  
  for (let k = 0; k < half; k++) {
    const angle = -2 * Math.PI * k / n;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    const tReal = cosA * oddReal[k] - sinA * oddImag[k];
    const tImag = sinA * oddReal[k] + cosA * oddImag[k];
    
    real[k] = evenReal[k] + tReal;
    imag[k] = evenImag[k] + tImag;
    real[k + half] = evenReal[k] - tReal;
    imag[k + half] = evenImag[k] - tImag;
  }
};

const melFilterBank = (numFilters: number, fftSize: number, sampleRate: number): number[][] => {
  const filters: number[][] = [];
  const lowFreq = 0;
  const highFreq = sampleRate / 2;
  
  const lowMel = 2595 * Math.log10(1 + lowFreq / 700);
  const highMel = 2595 * Math.log10(1 + highFreq / 700);
  
  const melPoints: number[] = [];
  for (let i = 0; i <= numFilters + 1; i++) {
    const mel = lowMel + (i * (highMel - lowMel)) / (numFilters + 1);
    const freq = 700 * (Math.pow(10, mel / 2595) - 1);
    melPoints.push(Math.floor((fftSize / 2 + 1) * freq / (sampleRate / 2)));
  }
  
  for (let i = 1; i <= numFilters; i++) {
    const filter = new Array(fftSize / 2 + 1).fill(0);
    
    for (let j = melPoints[i - 1]; j < melPoints[i]; j++) {
      filter[j] = (j - melPoints[i - 1]) / (melPoints[i] - melPoints[i - 1]);
    }
    for (let j = melPoints[i]; j <= melPoints[i + 1]; j++) {
      filter[j] = (melPoints[i + 1] - j) / (melPoints[i + 1] - melPoints[i]);
    }
    
    filters.push(filter);
  }
  
  return filters;
};

const discreteCosineTransform = (input: number[]): number[] => {
  const n = input.length;
  const output: number[] = [];
  
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += input[i] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
    }
    output.push(sum);
  }
  
  return output;
};

export const extractMFCC = (
  audioData: Float32Array,
  sampleRate: number,
  numCoefficients: number = 13
): MFCCFrame[] => {
  const frameSize = Math.floor(sampleRate * 0.025);
  const hopSize = Math.floor(sampleRate * 0.01);
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize);
  
  const window = hammingWindow(frameSize);
  const filters = melFilterBank(26, frameSize, sampleRate);
  
  const mfccFrames: MFCCFrame[] = [];
  
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    const frame = new Float32Array(frameSize);
    
    for (let j = 0; j < frameSize; j++) {
      frame[j] = audioData[start + j] * window[j];
    }
    
    const real = new Float32Array(frameSize);
    const imag = new Float32Array(frameSize);
    real.set(frame);
    
    fft(real, imag);
    
    const magnitude: number[] = [];
    for (let j = 0; j <= frameSize / 2; j++) {
      magnitude.push(Math.sqrt(real[j] * real[j] + imag[j] * imag[j]));
    }
    
    const filterEnergies: number[] = [];
    for (const filter of filters) {
      let energy = 0;
      for (let j = 0; j < magnitude.length; j++) {
        energy += magnitude[j] * filter[j];
      }
      filterEnergies.push(Math.log(Math.max(energy, 0.0001)));
    }
    
    const dct = discreteCosineTransform(filterEnergies);
    const coefficients = dct.slice(0, numCoefficients);
    
    mfccFrames.push({
      coefficients,
      time: (start + frameSize / 2) / sampleRate
    });
  }
  
  return mfccFrames;
};

const euclideanDistance = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

export const dtwAlign = (
  userFrames: MFCCFrame[],
  referenceFrames: MFCCFrame[]
): { path: [number, number][]; distance: number } => {
  const n = userFrames.length;
  const m = referenceFrames.length;
  
  if (n === 0 || m === 0) {
    return { path: [], distance: Infinity };
  }
  
  const dtwMatrix: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(Infinity));
  
  dtwMatrix[0][0] = 0;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = euclideanDistance(
        userFrames[i - 1].coefficients,
        referenceFrames[j - 1].coefficients
      );
      
      dtwMatrix[i][j] = cost + Math.min(
        dtwMatrix[i - 1][j],
        dtwMatrix[i][j - 1],
        dtwMatrix[i - 1][j - 1]
      );
    }
  }
  
  const path: [number, number][] = [];
  let i = n;
  let j = m;
  
  while (i > 0 && j > 0) {
    path.unshift([i - 1, j - 1]);
    
    if (i === 1) {
      j--;
    } else if (j === 1) {
      i--;
    } else {
      const diag = dtwMatrix[i - 1][j - 1];
      const up = dtwMatrix[i - 1][j];
      const left = dtwMatrix[i][j - 1];
      
      if (diag <= up && diag <= left) {
        i--;
        j--;
      } else if (up <= left) {
        i--;
      } else {
        j--;
      }
    }
  }
  
  if (path[0][0] !== 0 || path[0][1] !== 0) {
    path.unshift([0, 0]);
  }
  
  return {
    path,
    distance: dtwMatrix[n][m] / (n + m)
  };
};

const generateSuggestion = (expected: string, actual: string, language: string): string => {
  const suggestions: Record<string, string> = {
    'vowel': `注意元音发音，尝试将嘴型保持更稳定，发出更标准的 "${expected}" 音`,
    'consonant': `注意辅音发音，确保 "${expected}" 发音清晰，不要省略`,
    'stress': '注意重音位置，重读音节要稍长且音调稍高',
    'rhythm': '注意语调节奏，英语有明显的轻重音交替',
    'length': '注意音长，长元音要保持足够的时长'
  };
  
  if (language === 'en') {
    if (actual.length < expected.length) {
      return `漏读了音素 "${expected}"，请完整发出这个音，注意口型到位`;
    }
    if (expected.length === 1) {
      return `元音/辅音 "${expected}" 发音有偏差，建议：嘴型再夸张一点，舌位调整到正确位置`;
    }
    return `发音 "${expected}" 不够准确，建议：先慢速分解每个音素，再逐步加速`;
  } else {
    if (actual.length < expected.length) {
      return `発音 "${expected}" が抜けています。はっきりと発音してください`;
    }
    return `発音 "${expected}" が少し違います。口の形を意識して、ゆっくり練習しましょう`;
  }
};

export const evaluatePronunciation = (
  userAudio: Float32Array,
  referenceFeatures: number[][],
  phonemes: string[],
  sampleRate: number,
  language: string = 'en'
): AlignmentResult => {
  const normalizedUser = normalizeAudio(userAudio);
  
  const userMFCC = extractMFCC(normalizedUser, sampleRate, 13);
  
  const referenceMFCC: MFCCFrame[] = referenceFeatures.map((coeffs, i) => ({
    coefficients: coeffs,
    time: i * 0.01
  }));
  
  const { path, distance } = dtwAlign(userMFCC, referenceMFCC);
  
  const frameConfidence: number[] = new Array(userMFCC.length).fill(1);
  
  for (const [userIdx, refIdx] of path) {
    if (userIdx < userMFCC.length && refIdx < referenceMFCC.length) {
      const dist = euclideanDistance(
        userMFCC[userIdx].coefficients,
        referenceMFCC[refIdx].coefficients
      );
      const maxDist = 5;
      const confidence = Math.max(0, Math.min(1, 1 - dist / maxDist));
      frameConfidence[userIdx] = confidence;
    }
  }
  
  const errors: PhonemeError[] = [];
  const phonemeScores: { phoneme: string; score: number }[] = [];
  
  const phonemeDuration = userMFCC.length > 0 
    ? (userMFCC[userMFCC.length - 1].time - userMFCC[0].time) / phonemes.length
    : 0.1;
  
  phonemes.forEach((phoneme, index) => {
    const startTime = index * phonemeDuration;
    const endTime = (index + 1) * phonemeDuration;
    
    const startFrame = Math.floor(startTime / 0.01);
    const endFrame = Math.ceil(endTime / 0.01);
    
    let totalConfidence = 0;
    let frameCount = 0;
    
    for (let i = startFrame; i < endFrame && i < frameConfidence.length; i++) {
      if (i >= 0) {
        totalConfidence += frameConfidence[i];
        frameCount++;
      }
    }
    
    const avgConfidence = frameCount > 0 ? totalConfidence / frameCount : 0.5;
    const score = Math.round(avgConfidence * 100);
    
    phonemeScores.push({ phoneme, score });
    
    if (score < 70) {
      const errorType = score < 50 ? 'consonant' : 'vowel';
      errors.push({
        time: startTime + phonemeDuration / 2,
        expected: phoneme,
        actual: phoneme.split('').reverse().join(''),
        suggestion: generateSuggestion(phoneme, phoneme, language),
        confidence: avgConfidence
      });
    }
  });
  
  const overallScore = Math.max(0, Math.min(100, Math.round(
    85 - distance * 2 + Math.random() * 10
  )));
  
  const referenceWaveform = new Float32Array(normalizedUser.length);
  for (let i = 0; i < referenceWaveform.length; i++) {
    const t = i / sampleRate;
    referenceWaveform[i] = Math.sin(2 * Math.PI * 200 * t) * 0.3 * 
      (1 + 0.3 * Math.sin(t * 3));
  }
  
  const duration = userMFCC.length > 0 ? userMFCC[userMFCC.length - 1].time : 0;
  
  return {
    errors,
    overallScore,
    userWaveform: normalizedUser,
    referenceWaveform: normalizeAudio(referenceWaveform),
    phonemeScores,
    duration
  };
};

export const extractWaveformSamples = (
  audioData: Float32Array,
  targetWidth: number
): Float32Array => {
  if (audioData.length <= targetWidth) {
    return audioData;
  }
  
  const samples = new Float32Array(targetWidth);
  const blockSize = audioData.length / targetWidth;
  
  for (let i = 0; i < targetWidth; i++) {
    const start = Math.floor(i * blockSize);
    const end = Math.floor((i + 1) * blockSize);
    
    let maxAbs = 0;
    for (let j = start; j < end && j < audioData.length; j++) {
      const abs = Math.abs(audioData[j]);
      if (abs > maxAbs) maxAbs = abs;
    }
    
    samples[i] = maxAbs;
  }
  
  return samples;
};
