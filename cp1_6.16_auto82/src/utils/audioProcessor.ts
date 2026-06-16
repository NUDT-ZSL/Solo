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

export interface VADResult {
  startSample: number;
  endSample: number;
  startFrame: number;
  endFrame: number;
  voicedFrames: boolean[];
}

export const computeEnergy = (audioData: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  return Math.sqrt(sum / audioData.length);
};

export const computeZeroCrossingRate = (audioData: Float32Array): number => {
  let crossings = 0;
  for (let i = 1; i < audioData.length; i++) {
    if ((audioData[i] >= 0 && audioData[i - 1] < 0) || 
        (audioData[i] < 0 && audioData[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / audioData.length;
};

export const voiceActivityDetection = (
  audioData: Float32Array,
  sampleRate: number,
  frameSizeMs: number = 25,
  hopSizeMs: number = 10
): VADResult => {
  const frameSize = Math.floor(sampleRate * frameSizeMs / 1000);
  const hopSize = Math.floor(sampleRate * hopSizeMs / 1000);
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize);
  
  const energies: number[] = [];
  const zcrs: number[] = [];
  
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    const frame = audioData.slice(start, start + frameSize);
    energies.push(computeEnergy(frame));
    zcrs.push(computeZeroCrossingRate(frame));
  }
  
  if (numFrames === 0) {
    return {
      startSample: 0,
      endSample: audioData.length,
      startFrame: 0,
      endFrame: 0,
      voicedFrames: []
    };
  }
  
  const sortedEnergies = [...energies].sort((a, b) => a - b);
  const noiseFloor = sortedEnergies[Math.floor(sortedEnergies.length * 0.1)];
  const energyThreshold = noiseFloor + Math.max(0.01, (sortedEnergies[Math.floor(sortedEnergies.length * 0.9)] - noiseFloor) * 0.3);
  
  const avgZcr = zcrs.reduce((a, b) => a + b, 0) / zcrs.length;
  const zcrThreshold = avgZcr * 1.5;
  
  const voicedFrames: boolean[] = [];
  for (let i = 0; i < numFrames; i++) {
    const isVoiced = energies[i] > energyThreshold && zcrs[i] < zcrThreshold;
    voicedFrames.push(isVoiced);
  }
  
  const minVoicedRun = 5;
  for (let i = 0; i < numFrames; i++) {
    if (voicedFrames[i]) {
      let runLength = 1;
      while (i + runLength < numFrames && voicedFrames[i + runLength]) {
        runLength++;
      }
      if (runLength < minVoicedRun) {
        for (let j = i; j < i + runLength; j++) {
          voicedFrames[j] = false;
        }
      }
      i += runLength;
    }
  }
  
  for (let i = 1; i < numFrames - 1; i++) {
    if (!voicedFrames[i] && voicedFrames[i - 1] && voicedFrames[i + 1]) {
      voicedFrames[i] = true;
    }
  }
  
  let startFrame = 0;
  while (startFrame < numFrames && !voicedFrames[startFrame]) {
    startFrame++;
  }
  
  let endFrame = numFrames - 1;
  while (endFrame >= 0 && !voicedFrames[endFrame]) {
    endFrame--;
  }
  
  if (startFrame >= endFrame) {
    startFrame = 0;
    endFrame = numFrames - 1;
  }
  
  startFrame = Math.max(0, startFrame - 3);
  endFrame = Math.min(numFrames - 1, endFrame + 3);
  
  const startSample = startFrame * hopSize;
  const endSample = Math.min(audioData.length, endFrame * hopSize + frameSize);
  
  return {
    startSample,
    endSample,
    startFrame,
    endFrame,
    voicedFrames
  };
};

export const sliceAudio = (
  audioData: Float32Array,
  startSample: number,
  endSample: number
): Float32Array => {
  const start = Math.max(0, Math.floor(startSample));
  const end = Math.min(audioData.length, Math.ceil(endSample));
  return audioData.slice(start, end);
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
  
  const userVAD = voiceActivityDetection(normalizedUser, sampleRate, 25, 10);
  
  const voicedUserAudio = sliceAudio(normalizedUser, userVAD.startSample, userVAD.endSample);
  
  const userMFCCAll = extractMFCC(normalizedUser, sampleRate, 13);
  const userMFCC = extractMFCC(voicedUserAudio, sampleRate, 13);
  
  const referenceMFCC: MFCCFrame[] = referenceFeatures.map((coeffs, i) => ({
    coefficients: coeffs,
    time: i * 0.01
  }));
  
  if (userMFCC.length === 0 || referenceMFCC.length === 0 || userMFCCAll.length === 0) {
    return {
      errors: [],
      overallScore: 50,
      userWaveform: normalizedUser,
      referenceWaveform: normalizedUser,
      phonemeScores: phonemes.map(p => ({ phoneme: p, score: 50 })),
      duration: normalizedUser.length / sampleRate
    };
  }
  
  const { path, distance } = dtwAlign(userMFCC, referenceMFCC);
  
  const vadStartOffset = userVAD.startSample / sampleRate;
  const globalFrameConfidence: number[] = new Array(userMFCCAll.length).fill(0);
  
  for (let i = 0; i < userMFCCAll.length; i++) {
    globalFrameConfidence[i] = 0.3;
  }
  
  for (const [userIdx, refIdx] of path) {
    if (userIdx < userMFCC.length && refIdx < referenceMFCC.length) {
      const dist = euclideanDistance(
        userMFCC[userIdx].coefficients,
        referenceMFCC[refIdx].coefficients
      );
      const maxDist = 8;
      const confidence = Math.max(0, Math.min(1, 1 - dist / maxDist));
      
      const userTimeInVoiced = userMFCC[userIdx].time;
      const globalTime = vadStartOffset + userTimeInVoiced;
      const globalFrameIdx = Math.floor(globalTime / 0.01);
      
      if (globalFrameIdx >= 0 && globalFrameIdx < globalFrameConfidence.length) {
        if (confidence > globalFrameConfidence[globalFrameIdx]) {
          globalFrameConfidence[globalFrameIdx] = confidence;
        }
      }
    }
  }
  
  for (let i = 0; i < globalFrameConfidence.length; i++) {
    if (globalFrameConfidence[i] < 0.3) {
      let left = i - 1;
      let right = i + 1;
      while (left >= 0 && globalFrameConfidence[left] < 0.35) left--;
      while (right < globalFrameConfidence.length && globalFrameConfidence[right] < 0.35) right++;
      
      const leftVal = left >= 0 ? globalFrameConfidence[left] : 0.3;
      const rightVal = right < globalFrameConfidence.length ? globalFrameConfidence[right] : 0.3;
      const leftDist = i - left;
      const rightDist = right - i;
      const interpolated = (rightVal * leftDist + leftVal * rightDist) / Math.max(1, leftDist + rightDist);
      globalFrameConfidence[i] = Math.max(globalFrameConfidence[i], interpolated * 0.8);
    }
  }
  
  const userToRefMap: number[] = new Array(userMFCCAll.length).fill(-1);
  const refToUserMap: number[] = new Array(referenceMFCC.length).fill(-1);
  
  for (const [userIdx, refIdx] of path) {
    if (userIdx < userMFCC.length && refIdx < referenceMFCC.length) {
      const userTimeInVoiced = userMFCC[userIdx].time;
      const globalTime = vadStartOffset + userTimeInVoiced;
      const globalFrameIdx = Math.floor(globalTime / 0.01);
      
      if (globalFrameIdx >= 0 && globalFrameIdx < userMFCCAll.length) {
        if (userToRefMap[globalFrameIdx] === -1) {
          userToRefMap[globalFrameIdx] = refIdx;
        }
      }
      if (refToUserMap[refIdx] === -1) {
        refToUserMap[refIdx] = globalFrameIdx;
      }
    }
  }
  
  const errors: PhonemeError[] = [];
  const phonemeScores: { phoneme: string; score: number }[] = [];
  
  const totalDuration = userMFCCAll[userMFCCAll.length - 1].time - userMFCCAll[0].time;
  const startTimeOffset = userMFCCAll[0].time;
  const phonemeDuration = totalDuration / phonemes.length;
  
  const refTotalDuration = referenceMFCC.length > 0
    ? referenceMFCC[referenceMFCC.length - 1].time - referenceMFCC[0].time
    : 0.1;
  const refStartTimeOffset = referenceMFCC.length > 0 ? referenceMFCC[0].time : 0;
  const refPhonemeDuration = refTotalDuration / phonemes.length;
  
  const userVoicedRatio = (userVAD.endSample - userVAD.startSample) / normalizedUser.length;
  const durationPenalty = userVoicedRatio < 0.3 ? 15 : userVoicedRatio < 0.5 ? 5 : 0;
  
  phonemes.forEach((phoneme, phonemeIndex) => {
    const phonemeStartTime = startTimeOffset + phonemeIndex * phonemeDuration;
    const phonemeEndTime = startTimeOffset + (phonemeIndex + 1) * phonemeDuration;
    
    const refPhonemeStartFrame = Math.floor(phonemeIndex * (referenceMFCC.length / phonemes.length));
    const refPhonemeEndFrame = Math.ceil((phonemeIndex + 1) * (referenceMFCC.length / phonemes.length));
    
    const startFrame = Math.floor((phonemeStartTime - startTimeOffset) / 0.01);
    const endFrame = Math.ceil((phonemeEndTime - startTimeOffset) / 0.01);
    
    let totalConfidence = 0;
    let frameCount = 0;
    let worstFrame = -1;
    let worstConfidence = 1;
    let alignedRefFrames = 0;
    
    for (let i = startFrame; i < endFrame && i < globalFrameConfidence.length; i++) {
      if (i >= 0) {
        const conf = globalFrameConfidence[i];
        totalConfidence += conf;
        frameCount++;
        
        if (conf < worstConfidence) {
          worstConfidence = conf;
          worstFrame = i;
        }
        
        if (userToRefMap[i] >= refPhonemeStartFrame && userToRefMap[i] < refPhonemeEndFrame) {
          alignedRefFrames++;
        }
      }
    }
    
    const avgConfidence = frameCount > 0 ? totalConfidence / frameCount : 0.3;
    const expectedRefFrames = refPhonemeEndFrame - refPhonemeStartFrame;
    const alignmentRatio = expectedRefFrames > 0 ? alignedRefFrames / expectedRefFrames : 0;
    
    const coverageScore = Math.min(1, alignmentRatio * 1.5);
    const phonemeScore = Math.max(0, Math.min(100, Math.round(
      avgConfidence * 70 + coverageScore * 30
    )));
    
    phonemeScores.push({ phoneme, score: phonemeScore });
    
    if (phonemeScore < 70) {
      let actualPhoneme = phoneme;
      let errorType = 'vowel';
      
      if (alignmentRatio < 0.2 && frameCount > 0) {
        errorType = 'consonant';
        actualPhoneme = phoneme.slice(0, Math.max(1, Math.floor(phoneme.length * 0.4)));
      } else if (alignmentRatio < 0.5) {
        errorType = phoneme.length <= 2 ? 'vowel' : 'consonant';
        actualPhoneme = phoneme.slice(0, Math.max(1, Math.floor(phoneme.length * 0.65)));
      } else if (avgConfidence < 0.4) {
        errorType = 'stress';
        const vowelIndices = [];
        for (let ci = 0; ci < phoneme.length; ci++) {
          if ('aeiouAEIOU'.includes(phoneme[ci])) vowelIndices.push(ci);
        }
        if (vowelIndices.length > 0) {
          const midVowel = vowelIndices[Math.floor(vowelIndices.length / 2)];
          actualPhoneme = phoneme.slice(0, midVowel + 1);
        } else {
          actualPhoneme = phoneme.slice(0, Math.max(1, Math.floor(phoneme.length * 0.75)));
        }
      } else if (avgConfidence < 0.55) {
        errorType = 'length';
        actualPhoneme = phoneme.slice(0, Math.max(1, Math.floor(phoneme.length * 0.85)));
      }
      
      const errorTime = worstFrame >= 0 && worstFrame < userMFCCAll.length
        ? userMFCCAll[worstFrame].time
        : phonemeStartTime + phonemeDuration / 2;
      
      errors.push({
        time: errorTime,
        expected: phoneme,
        actual: actualPhoneme,
        suggestion: generateSuggestion(phoneme, actualPhoneme, language),
        confidence: avgConfidence
      });
    }
  });
  
  const avgFrameConfidence = globalFrameConfidence.reduce((a, b) => a + b, 0) / globalFrameConfidence.length;
  const lengthRatio = Math.min(
    (userVAD.endSample - userVAD.startSample) / (referenceMFCC.length * 0.01 * sampleRate),
    (referenceMFCC.length * 0.01 * sampleRate) / (userVAD.endSample - userVAD.startSample)
  );
  const pathEfficiency = path.length / Math.max(userMFCC.length, referenceMFCC.length);
  const alignmentScore = Math.max(0, Math.min(1, 1 - Math.abs(1 - pathEfficiency) * 0.5));
  const avgPhonemeScore = phonemeScores.reduce((a, b) => a + b.score, 0) / Math.max(1, phonemeScores.length);
  
  const baseScore = avgFrameConfidence * 30 + lengthRatio * 15 + alignmentScore * 15 + (avgPhonemeScore / 100) * 40;
  const overallScore = Math.max(0, Math.min(100, Math.round(baseScore - durationPenalty)));
  
  const referenceWaveform = new Float32Array(normalizedUser.length);
  const refSamplesPerUserSample = referenceMFCC.length / Math.max(1, userMFCCAll.length);
  
  for (let i = 0; i < normalizedUser.length; i++) {
    const userFrameIdx = Math.floor((i / normalizedUser.length) * userMFCCAll.length);
    const refFrameIdx = userToRefMap[userFrameIdx] >= 0 
      ? userToRefMap[userFrameIdx] 
      : Math.floor(userFrameIdx * refSamplesPerUserSample);
    
    const t = i / sampleRate;
    const amplitudeModulation = refFrameIdx >= 0 && refFrameIdx < referenceFeatures.length
      ? Math.abs(referenceFeatures[refFrameIdx][0]) * 0.5 + 0.2
      : 0.3;
    
    referenceWaveform[i] = Math.sin(2 * Math.PI * 180 * t) * amplitudeModulation *
      (0.7 + 0.3 * Math.sin(t * 2.5));
  }
  
  const duration = totalDuration;
  
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
