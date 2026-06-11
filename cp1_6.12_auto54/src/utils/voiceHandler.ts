type SpeechRecognitionCtor = new () => any;

const STOP_WORDS_EN = new Set([
  'the','a','an','and','or','but','if','then','else','of','to','in','on','at','by','for','with','as','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','i','you','he','she','it',
  'we','they','me','him','her','us','them','my','your','his','its','our','their','what','which','who','whom','where','when','why','how','there',
  'here','not','no','so','than','too','very','just','also','now','from','up','out','about','into','over','after','before','between','through',
  'during','without','within','along','across','behind','beyond','among','around','because','while','although','though','until','unless','since',
  'however','therefore','thus','hence','moreover','furthermore','nevertheless','nonetheless','any','some','all','each','every','both','few','many',
  'most','other','such','only','own','same','than','too','very','s','t','don','now'
]);

const STOP_WORDS_ZH = new Set([
  '的','了','和','是','在','我','有','他','她','它','就','不','人','都','一','一个','上','也','很','到','说','要','去','你','会','着','没有','看',
  '好','自己','这','那','这个','那个','但是','而','与','或','及','等','把','被','让','给','向','从','对','以','因','为','所以','但','但是',
  '可','可是','却','并','并且','或','或者','如果','要是','只要','只有','无论','不管','即使','哪怕','虽然','尽管','不过','只是','而且',
  '不仅','不但','就是','还','又','再','才','然后','接着','最后','现在','以前','以后','当时','刚才','已经','正在','将要','马上','立刻',
  '些','什么','怎么','怎样','为什么','哪','哪里','谁','几','多少','多么','什么','能','能够','应该','必须','需要','可以','可能','也许',
  '大概','大约','几乎','差不多','完全','简直','根本','到底','究竟','其实','当然','的确','确实','实在','真的','嗯','啊','哦','哈','呀',
  '呢','吧','吗','啦','嘛','呗','哩','喽','哟','喂','唉','咦','嘿','哼','呵','嗬','呸','啐','嘘','呜','嗷','嘎','唰','嚯','嚓','吱',
  '我们','你们','他们','她们','它们','大家','咱们','彼此','互相','一起','一块儿','一同','共同','各自','分别','这个','那个','这些','那些',
  '这里','那里','哪儿','某个','某些','有的','有些','一切','所有','全部','任何','每','各','某','另','其他','其余','另外','之外','以外',
  '之','其','此','该','本','此','如','若','则','乃','即','亦','且','仍','故','既','於','诸','若','岂','是否','能否','有无','可否',
  '一下','一点','一些','一样','一般','一种','一面','一次','一阵','一番','一直','一向','一往','一一','非','没','别','是','也'
]);

function isStopWord(word: string): boolean {
  if (!word) return true;
  const w = word.trim().toLowerCase();
  if (w.length < 2 && /^[a-z]$/i.test(w)) return true;
  if (w.length === 0) return true;
  if (STOP_WORDS_EN.has(w)) return true;
  if (STOP_WORDS_ZH.has(word.trim())) return true;
  return false;
}

function splitKeywords(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const tokens = text.split(/[\s,，。.!！?？;；:："“”'‘’、()（）\[\]【】<>《》/\\\-—_=+\|`~@#$%^&*…·]+/);
  for (const raw of tokens) {
    if (!raw) continue;
    if (/^[\u4e00-\u9fa5]$/.test(raw)) {
      if (!isStopWord(raw)) results.push(raw);
      continue;
    }
    if (/^[\u4e00-\u9fa5]{2,}$/.test(raw)) {
      if (!isStopWord(raw)) results.push(raw);
      continue;
    }
    const enWords = raw.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    for (const ew of enWords) {
      if (!isStopWord(ew)) results.push(ew);
    }
  }
  return results;
}

export interface VoiceHandlerOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

type KeywordCallback = (keyword: string) => void;
type FullTextCallback = (text: string, isFinal: boolean) => void;
type ErrorCallback = (error: any) => void;

export class VoiceHandler {
  private recognition: any = null;
  private active = false;
  private keywordCbs: KeywordCallback[] = [];
  private fullTextCbs: FullTextCallback[] = [];
  private errorCbs: ErrorCallback[] = [];
  private options: Required<VoiceHandlerOptions>;
  private lastEmittedKeywords = new Set<string>();
  private lastClearTime = 0;

  constructor(options: VoiceHandlerOptions = {}) {
    this.options = {
      lang: options.lang || 'zh-CN',
      continuous: options.continuous ?? true,
      interimResults: options.interimResults ?? true,
    };
  }

  async start(lang?: string): Promise<void> {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      throw new Error('当前浏览器不支持 SpeechRecognition API，请使用 Chrome 或 Edge');
    }
    if (this.active) return;
    if (lang) this.options.lang = lang;

    this.recognition = new (SR as SpeechRecognitionCtor)();
    this.recognition.lang = this.options.lang;
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) {
          finalText += transcript + ' ';
          const keywords = splitKeywords(transcript);
          const now = Date.now();
          if (now - this.lastClearTime > 3000) {
            this.lastEmittedKeywords.clear();
            this.lastClearTime = now;
          }
          for (const kw of keywords) {
            const key = kw.toLowerCase();
            if (!this.lastEmittedKeywords.has(key)) {
              this.lastEmittedKeywords.add(key);
              this.emitKeyword(kw);
            }
          }
        } else {
          interim += transcript;
        }
      }
      if (finalText) this.emitFullText(finalText.trim(), true);
      if (interim) this.emitFullText(interim.trim(), false);
    };

    this.recognition.onerror = (e: any) => {
      this.emitError(e);
      if (e.error === 'no-speech' || e.error === 'audio-capture') {
        try { this.recognition?.stop(); } catch {}
        setTimeout(() => {
          if (this.active) {
            try { this.recognition?.start(); } catch {}
          }
        }, 300);
      }
    };

    this.recognition.onend = () => {
      if (this.active) {
        setTimeout(() => {
          if (this.active) {
            try { this.recognition?.start(); } catch {}
          }
        }, 150);
      }
    };

    this.active = true;
    try {
      this.recognition.start();
    } catch (e) {
      this.active = false;
      throw e;
    }
  }

  stop(): void {
    this.active = false;
    try { this.recognition?.stop(); } catch {}
    this.lastEmittedKeywords.clear();
  }

  onKeyword(cb: KeywordCallback): void {
    this.keywordCbs.push(cb);
  }
  onFullText(cb: FullTextCallback): void {
    this.fullTextCbs.push(cb);
  }
  onError(cb: ErrorCallback): void {
    this.errorCbs.push(cb);
  }

  isActive(): boolean {
    return this.active;
  }

  destroy(): void {
    this.stop();
    this.keywordCbs = [];
    this.fullTextCbs = [];
    this.errorCbs = [];
    this.recognition = null;
  }

  private emitKeyword(kw: string): void {
    for (const cb of this.keywordCbs) cb(kw);
  }
  private emitFullText(text: string, isFinal: boolean): void {
    for (const cb of this.fullTextCbs) cb(text, isFinal);
  }
  private emitError(e: any): void {
    for (const cb of this.errorCbs) cb(e);
  }
}

export function extractKeywords(text: string): string[] {
  return splitKeywords(text);
}
