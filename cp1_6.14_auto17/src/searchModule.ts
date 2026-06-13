import { DataLoader, Artifact } from './dataLoader';

type SearchResultCallback = (artifacts: Artifact[]) => void;
type ArtifactFocusCallback = (artifactId: string) => void;

class ModelManager {
  private static instance: ModelManager;
  private sttPipeline: any = null;
  private ttsPipeline: any = null;
  private sttLoading: Promise<any> | null = null;
  private ttsLoading: Promise<any> | null = null;
  private transformersAvailable: boolean = true;

  private constructor() {}

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  private async loadTransformers(): Promise<any> {
    if (!this.transformersAvailable) return null;
    try {
      const transformers = await import('@xenova/transformers');
      return transformers;
    } catch (err) {
      console.warn('[Transformers.js] Dynamic import failed, disabling:', (err as Error).message);
      this.transformersAvailable = false;
      return null;
    }
  }

  async getSTTPipeline(): Promise<any> {
    if (this.sttPipeline) return this.sttPipeline;
    if (!this.transformersAvailable) return null;
    if (this.sttLoading) return this.sttLoading;

    this.sttLoading = (async () => {
      try {
        const transformers = await this.loadTransformers();
        if (!transformers) return null;
        const p = await transformers.pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
          dtype: 'q8',
          progress_callback: (progress: any) => {
            console.log('[STT Model Loading]', progress?.status || progress);
          }
        });
        this.sttPipeline = p;
        return p;
      } catch (err) {
        console.warn('[STT] Model load failed, using Web Speech API fallback:', (err as Error).message);
        this.sttLoading = null;
        return null;
      }
    })();
    return this.sttLoading;
  }

  async getTTSPipeline(): Promise<any> {
    if (this.ttsPipeline) return this.ttsPipeline;
    if (!this.transformersAvailable) return null;
    if (this.ttsLoading) return this.ttsLoading;

    this.ttsLoading = (async () => {
      try {
        const transformers = await this.loadTransformers();
        if (!transformers) return null;
        const p = await transformers.pipeline('text-to-speech', 'Xenova/speecht5_tts', {
          progress_callback: (progress: any) => {
            console.log('[TTS Model Loading]', progress?.status || progress);
          }
        });
        this.ttsPipeline = p;
        return p;
      } catch (err) {
        console.warn('[TTS] Model load failed, using Web SpeechSynthesis fallback:', (err as Error).message);
        this.ttsLoading = null;
        return null;
      }
    })();
    return this.ttsLoading;
  }
}

export class SearchModule {
  private dataLoader: DataLoader;
  private searchInput: HTMLInputElement;
  private micBtn: HTMLButtonElement;
  private dropdown: HTMLDivElement;
  private onSearchResult: SearchResultCallback | null = null;
  private onArtifactFocus: ArtifactFocusCallback | null = null;
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private webSpeechRecognition: any = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    searchInput: HTMLInputElement,
    micBtn: HTMLButtonElement,
    dropdown: HTMLDivElement,
    dataLoader: DataLoader
  ) {
    this.dataLoader = dataLoader;
    this.searchInput = searchInput;
    this.micBtn = micBtn;
    this.dropdown = dropdown;

    this.setupTextInput();
    this.setupMicButton();
    this.setupWebSpeechFallback();
  }

  private setupTextInput(): void {
    this.searchInput.addEventListener('input', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.performTextSearch(this.searchInput.value);
      }, 150);
    });

    this.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hideDropdown();
        this.searchInput.blur();
      }
    });

    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.dropdown.contains(e.target as Node) && e.target !== this.searchInput) {
        this.hideDropdown();
      }
    });
  }

  private setupMicButton(): void {
    this.micBtn.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });
  }

  private setupWebSpeechFallback(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.webSpeechRecognition = new SpeechRecognition();
      this.webSpeechRecognition.lang = 'zh-CN';
      this.webSpeechRecognition.continuous = false;
      this.webSpeechRecognition.interimResults = false;
      this.webSpeechRecognition.maxAlternatives = 1;

      this.webSpeechRecognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.searchInput.value = transcript;
        this.performTextSearch(transcript);
      };

      this.webSpeechRecognition.onend = () => {
        this.setRecordingState(false);
      };

      this.webSpeechRecognition.onerror = () => {
        this.setRecordingState(false);
      };
    }
  }

  private async startRecording(): Promise<void> {
    this.setRecordingState(true);
    this.audioChunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await this.processVoiceInput(audioBlob);
        }
        this.setRecordingState(false);
      };

      this.mediaRecorder.start();

      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.stopRecording();
        }
      }, 5000);
    } catch (err) {
      console.warn('[Mic] getUserMedia failed, trying Web Speech API:', err);
      if (this.webSpeechRecognition) {
        this.webSpeechRecognition.start();
      } else {
        this.setRecordingState(false);
      }
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  private setRecordingState(recording: boolean): void {
    this.isRecording = recording;
    this.micBtn.classList.toggle('active', recording);
  }

  private async processVoiceInput(audioBlob: Blob): Promise<void> {
    const sttPipeline = await ModelManager.getInstance().getSTTPipeline();

    if (sttPipeline) {
      try {
        const startTime = performance.now();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0);
        audioContext.close();

        const result = await sttPipeline(audioData, {
          language: 'chinese',
          task: 'transcribe'
        });

        const elapsed = performance.now() - startTime;
        console.log(`[STT] Recognition took ${elapsed.toFixed(0)}ms`);

        const text = result?.text || '';
        if (text) {
          this.searchInput.value = text;
          this.performTextSearch(text);
        }
        return;
      } catch (err) {
        console.warn('[STT] Transformers.js failed, trying Web Speech API:', err);
      }
    }

    if (this.webSpeechRecognition) {
      this.webSpeechRecognition.start();
    }
  }

  private performTextSearch(query: string): void {
    const results = this.dataLoader.searchArtifacts(query, 8);
    this.showDropdown(results);
    if (this.onSearchResult) {
      this.onSearchResult(results);
    }
  }

  private showDropdown(artifacts: Artifact[]): void {
    this.dropdown.innerHTML = '';
    if (artifacts.length === 0) {
      this.dropdown.classList.remove('visible');
      return;
    }

    artifacts.forEach((a: Artifact) => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `<span>${a.name}</span><span class="year">距今${a.year}年</span>`;
      item.addEventListener('click', () => {
        this.searchInput.value = a.name;
        this.hideDropdown();
        if (this.onArtifactFocus) {
          this.onArtifactFocus(a.id);
        }
      });
      this.dropdown.appendChild(item);
    });

    this.dropdown.classList.add('visible');
  }

  private hideDropdown(): void {
    this.dropdown.classList.remove('visible');
  }

  public async speakText(text: string): Promise<void> {
    const ttsPipeline = await ModelManager.getInstance().getTTSPipeline();

    if (ttsPipeline) {
      try {
        const result = await ttsPipeline(text);
        if (result?.audio) {
          const audioData = result.audio instanceof Float32Array ? result.audio : new Float32Array(result.audio);
          const sampleRate = result.sampling_rate || 16000;
          const audioContext = new AudioContext({ sampleRate });
          const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
          audioBuffer.getChannelData(0).set(audioData);
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          source.start(0);
          return;
        }
      } catch (err) {
        console.warn('[TTS] Transformers.js failed, using Web SpeechSynthesis:', err);
      }
    }

    this.webSpeechSynthesis(text);
  }

  private webSpeechSynthesis(text: string): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.startsWith('zh'));
      if (zhVoice) utterance.voice = zhVoice;
      window.speechSynthesis.speak(utterance);
    }
  }

  public setOnSearchResult(cb: SearchResultCallback): void {
    this.onSearchResult = cb;
  }

  public setOnArtifactFocus(cb: ArtifactFocusCallback): void {
    this.onArtifactFocus = cb;
  }
}
