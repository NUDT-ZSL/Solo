import { analyzeSpectrum } from './api/services/spectrumAnalyzer.js';

async function main() {
  const r = await analyzeSpectrum('test-audio.wav');
  console.log('WAV result:', JSON.stringify(r, null, 2));
}

main().catch(console.error);
