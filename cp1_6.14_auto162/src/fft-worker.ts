const FFT_SIZE = 1024;
const NUM_BANDS = 32;

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n <= 1) return;

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const tRe = curRe * re[i + j + halfLen] - curIm * im[i + j + halfLen];
        const tIm = curRe * im[i + j + halfLen] + curIm * re[i + j + halfLen];
        re[i + j + halfLen] = re[i + j] - tRe;
        im[i + j + halfLen] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

function computePowerSpectrum(timeDomainData: Uint8Array): Float64Array {
  const n = FFT_SIZE;
  const re = new Float64Array(n);
  const im = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    re[i] = ((timeDomainData[i] ?? 128) - 128) / 128;
    im[i] = 0;
  }

  const windowSum = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
    re[i] *= w;
    windowSum[i] = w;
  }

  fft(re, im);

  const powerSpectrum = new Float64Array(n / 2);
  const windowPower = windowSum.reduce((s, v) => s + v * v, 0);
  const normFactor = 2 / (windowPower * n);

  for (let i = 0; i < n / 2; i++) {
    powerSpectrum[i] = (re[i] * re[i] + im[i] * im[i]) * normFactor;
  }

  return powerSpectrum;
}

function averageIntoBands(powerSpectrum: Float64Array, numBands: number, sampleRate: number, range: string): Uint8Array {
  const maxBin = powerSpectrum.length;
  const nyquist = sampleRate / 2;
  let startBin = 0;
  let endBin = maxBin;

  if (range === 'low') {
    endBin = Math.min(maxBin, Math.ceil(1000 / nyquist * maxBin));
  } else if (range === 'mid') {
    startBin = Math.floor(1000 / nyquist * maxBin);
    endBin = Math.min(maxBin, Math.ceil(5000 / nyquist * maxBin));
  } else if (range === 'high') {
    startBin = Math.floor(5000 / nyquist * maxBin);
  }

  const usableBins = endBin - startBin;
  const binsPerBand = Math.floor(usableBins / numBands);
  const bands = new Uint8Array(numBands);

  for (let i = 0; i < numBands; i++) {
    let sum = 0;
    const bandStart = startBin + i * binsPerBand;
    const bandEnd = bandStart + binsPerBand;
    for (let j = bandStart; j < bandEnd; j++) {
      sum += powerSpectrum[j] ?? 0;
    }
    const avg = sum / binsPerBand;
    const db = 10 * Math.log10(avg + 1e-10);
    const normalized = Math.max(0, Math.min(255, (db + 80) * (255 / 80)));
    bands[i] = Math.round(normalized);
  }

  return bands;
}

self.onmessage = (e: MessageEvent) => {
  const { timeDomainData, sampleRate, range } = e.data as {
    timeDomainData: Uint8Array;
    sampleRate: number;
    range: string;
  };

  const powerSpectrum = computePowerSpectrum(timeDomainData);
  const bands = averageIntoBands(powerSpectrum, NUM_BANDS, sampleRate, range);

  (self as unknown as Worker).postMessage({ bands }, [bands.buffer]);
};
