type SpeechRecognitionCtor = new () => any;

const STOP_WORDS_EN = new Set([
  'the','a','an','and','or','but','if','then','else','of','to','in','on','at','by','for','with','as','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may','might','can','shall','this','that','these','those','i','you','he',
  'she','it','we','they','me','him','her','us','them','my','your','his','its','our','their','what','which','who','whom','where','when','why','how',
  'there','here','not','no','so','than','too','very','just','also','now','from','up','out','about','into','over','after','before','between',
  'through','during','without','within','along','across','behind','beyond','among','around','because','while','although','though','until','unless',
  'since','however','therefore','thus','hence','moreover','furthermore','nevertheless','nonetheless','any','some','all','each','every','both','few',
  'many','most','other','such','only','own','same','s','t','don','doesn','didn','won','wouldn','couldn','shouldn','isn','aren','wasn','weren',
  'hasn','haven','hadn','mustn','needn','let','going','got','get','gets','getting','make','made','much','well','really','still','even','back',
  'way','thing','things','something','anything','nothing','everything','one','two','three','first','second','last','new','old','big','small',
  'good','bad','right','left','long','short','high','low','great','little','just','like','know','think','see','come','take','want','give','use',
  'find','tell','say','said','go','went','gone','look','make','made','put','keep','let','begin','seem','help','show','turn','start','might',
  'still','end','run','try','ask','need','feel','become','leave','mean','call','work','play','move','live','believe','happen','bring','become',
  'again','off','never','always','often','sometimes','already','yet','ever','once','together','away','another','more','less','most','least',
  'quite','rather','enough','almost','perhaps','maybe','probably','certainly','definitely','usually','actually','simply','nearly','exactly',
  'please','yes','yeah','yep','nope','nah','hey','hi','hello','ok','okay','well','um','uh','oh','wow','oops','like','basically','literally',
  'actually','honestly','seriously','obviously','apparently','supposedly','typically','generally','specifically','particularly','especially',
  'importantly','surprisingly','interestingly','fortunately','unfortunately','naturally','normally','commonly','frequently','rarely','seldom'
]);

const STOP_WORDS_ZH = new Set([
  '的','了','和','是','在','我','有','他','她','它','就','不','人','都','一','上','也','很','到','说','要','去','你','会','着','没有','看',
  '好','这','那','要','能','将','与','而','或','但','从','被','把','让','给','向','对','以','为','因','所','之','其','此','该','本','如',
  '若','则','乃','即','亦','且','仍','故','既','於','诸','岂','吗','呢','吧','啊','呀','哦','嗯','哈','啦','嘛','呗','哩','喽','哟',
  '喂','唉','咦','嘿','哼','呵','嗬','呸','啐','嘘','呜','嗷','嘎','唰','嚯','嚓','吱','么','了','个','来','去','过','起','出','下',
  '中','大','小','多','少','前','后','左','右','里','外','间','内','旁','上','下','底','顶','高','低','长','短','远','近','深','浅',
  '这个','那个','这些','那些','这里','那里','哪个','哪儿','哪里','这么','那么','这样','那样','什么','怎么','怎样','为什么','哪',
  '谁','几','多少','多么','能','能够','应该','必须','需要','可以','可能','也许','大概','大约','几乎','差不多','完全','简直','根本',
  '到底','究竟','其实','当然','的确','确实','实在','真的','比较','相当','非常','特别','十分','极其','格外','分外','越发','更加',
  '更','最','太','极','顶','透','越','稍','微','略','颇','甚','殊','异常','非凡','超常','出奇','惊人','极度','万分','极度',
  '但是','可是','却','不过','然而','只是','而且','不仅','不但','就是','还','又','再','才','然后','接着','最后','所以','因此','因为',
  '由于','虽然','尽管','如果','假如','要是','只要','只有','无论','不管','即使','哪怕','既然','除非','等到','一旦','但凡','纵然',
  '并且','或者','以及','还是','不是','就是','而是','不如','除了','除非','相对于','关于','至于','根据','按照','通过','经过','沿着',
  '我们','你们','他们','她们','它们','大家','咱们','自己','彼此','互相','一起','一同','共同','各自','分别','某','每','各','另','其他',
  '其余','另外','之外','以外','以下','以上','以内','以外','之间','之一','的时候','的话','来说','起来','下来','出来','过来','回去',
  '上去','下去','出去','进来','过来','回来','过来','起来','下来','出来','回去','一点','一些','一样','一般','一种','一面','一次',
  '一直','一向','一一','非','没','别','是','也','还','又','再','才','已','曾','正','将','要','会','能','可','得','地','着','过',
  '来','去','起','开','出','上','下','中','里','外','前','后','左','右','间','内','旁','底','顶',
  '时候','地方','东西','样子','办法','问题','情况','方面','部分','关系','原因','结果','目的','意义','内容','特点','条件','环境',
  '角度','层次','阶段','过程','状态','水平','程度','范围','领域','方向','趋势','效果','作用','影响','价值','基础','依据','背景',
  '现在','以前','以后','当时','刚才','已经','正在','将要','马上','立刻','立即','瞬间','突然','忽然','偶尔','渐渐','慢慢','逐渐',
  '终于','始终','一直','永远','暂时','临时','长期','短期','永久','永恒','常常','经常','往往','通常','偶尔','有时','从不','极少',
  '事实上','实际上','基本上','一般来说','换句话说','总而言之','一方面','另一方面','与此同时','不仅如此','除此之外','相反',
  '同样','此外','另外','总之','综上','由此可见','显而易见','毋庸置疑','不言而喻','众所周知','一般来说','通常来说','严格来说',
  '的话','一下','一点','一些','一样','一般','一种','一直','一向','一路','一来','一再','一齐','一并','一刀切','一体化','一站式'
]);

function isStopWord(word: string): boolean {
  if (!word) return true;
  const trimmed = word.trim();
  if (trimmed.length === 0) return true;
  const lower = trimmed.toLowerCase();
  if (lower.length < 2 && /^[a-z]$/i.test(lower)) return true;
  if (STOP_WORDS_EN.has(lower)) return true;
  if (STOP_WORDS_ZH.has(trimmed)) return true;
  if (/^[\u4e00-\u9fa5]$/.test(trimmed) && STOP_WORDS_ZH.has(trimmed)) return true;
  return false;
}

function tokenizeChinese(text: string): string[] {
  const results: string[] = [];
  const ZH = /[\u4e00-\u9fa5]+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ZH.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const between = text.slice(lastIndex, match.index);
      extractEnglishTokens(between, results);
    }
    const zhChunk = match[0];
    const words = segmentChinese(zhChunk);
    for (const w of words) {
      if (!isStopWord(w)) results.push(w);
    }
    lastIndex = ZH.lastIndex;
  }
  if (lastIndex < text.length) {
    extractEnglishTokens(text.slice(lastIndex), results);
  }
  return results;
}

function segmentChinese(text: string): string[] {
  if (text.length <= 1) return [text];
  if (text.length === 2) return [text];
  if (text.length === 3) {
    if (STOP_WORDS_ZH.has(text[0]) && STOP_WORDS_ZH.has(text[1])) {
      const last = text[2];
      return isStopWord(last) ? [] : [last];
    }
    if (STOP_WORDS_ZH.has(text[0])) {
      const rest = text.slice(1);
      return isStopWord(rest) ? [] : [rest];
    }
    if (STOP_WORDS_ZH.has(text[2])) {
      const first = text.slice(0, 2);
      return isStopWord(first) ? [] : [first];
    }
    return [text.slice(0, 2), text[2]].filter(w => !isStopWord(w));
  }
  if (text.length === 4) {
    if (STOP_WORDS_ZH.has(text[0])) {
      return segmentChinese(text.slice(1));
    }
    return [text.slice(0, 2), text.slice(2)].filter(w => !isStopWord(w));
  }
  const results: string[] = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (let len = Math.min(4, text.length - i); len >= 2; len--) {
      const candidate = text.slice(i, i + len);
      if (!isStopWord(candidate)) {
        results.push(candidate);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!isStopWord(text[i])) {
        results.push(text[i]);
      }
      i++;
    }
  }
  return results;
}

function extractEnglishTokens(text: string, results: string[]): void {
  const words = text.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  for (const w of words) {
    if (!isStopWord(w)) results.push(w);
  }
}

function splitKeywords(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/[，。！？；：""''、（）【】《》…—\-.!?,;:'"()\[\]{}<>\/\\@#$%^&*+=~`|]/g, ' ');
  return tokenizeChinese(cleaned);
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
  private lastEmittedKeywords: string[] = [];
  private lastEmitTime = 0;

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
          if (now - this.lastEmitTime > 3000) {
            this.lastEmittedKeywords = [];
            this.lastEmitTime = now;
          }
          for (const kw of keywords) {
            const key = kw.toLowerCase();
            if (!this.lastEmittedKeywords.includes(key)) {
              this.lastEmittedKeywords.push(key);
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
        try { this.recognition && this.recognition.stop(); } catch {}
        setTimeout(() => {
          if (this.active) {
            try { this.recognition && this.recognition.start(); } catch {}
          }
        }, 300);
      }
    };

    this.recognition.onend = () => {
      if (this.active) {
        setTimeout(() => {
          if (this.active) {
            try { this.recognition && this.recognition.start(); } catch {}
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
    try { this.recognition && this.recognition.stop(); } catch {}
    this.lastEmittedKeywords = [];
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
