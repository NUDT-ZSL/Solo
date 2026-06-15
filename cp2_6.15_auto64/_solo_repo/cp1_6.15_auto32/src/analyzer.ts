import type { TextAnalysis, SimplifiedResult, SimplifiedSentence, SimplifiedWord } from './types';
import { getSimplifiedWord } from './words';

function countSyllables(word: string): number {
  const lowerWord = word.toLowerCase();
  
  if (lowerWord.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let count = 0;
  let isPrevVowel = false;
  
  for (let i = 0; i < lowerWord.length; i++) {
    const isVowel = vowels.includes(lowerWord[i]);
    if (isVowel && !isPrevVowel) {
      count++;
    }
    isPrevVowel = isVowel;
  }
  
  if (lowerWord.endsWith('e') && count > 1) {
    count--;
  }
  
  if (lowerWord.endsWith('le') && 
      lowerWord.length > 2 && 
      !vowels.includes(lowerWord[lowerWord.length - 3])) {
    count++;
  }
  
  return Math.max(1, count);
}

function splitSentences(text: string): string[] {
  const abbreviations = new Set([
    'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'jr.',
    'vs.', 'etc.', 'e.g.', 'i.e.', 'cf.',
    'jan.', 'feb.', 'mar.', 'apr.', 'jun.', 'jul.',
    'aug.', 'sep.', 'oct.', 'nov.', 'dec.'
  ]);
  
  const rawSentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*/g) || [text];
  
  const sentences: string[] = [];
  let buffer = '';
  
  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    
    const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase() || '';
    const lastWord = trimmed.split(/\s+/).pop()?.toLowerCase() || '';
    
    if (abbreviations.has(lastWord) && !trimmed.match(/[.!?]\s*$/)) {
      buffer += trimmed + ' ';
      continue;
    }
    
    if (buffer) {
      sentences.push(buffer + trimmed);
      buffer = '';
    } else {
      sentences.push(trimmed);
    }
  }
  
  if (buffer) {
    sentences.push(buffer.trim());
  }
  
  return sentences.filter(s => s.length > 0);
}

function countWords(text: string): number {
  const words = text.match(/[a-zA-Z]+/g) || [];
  return words.length;
}

function countUniqueWords(text: string): number {
  const words = text.match(/[a-zA-Z]+/g) || [];
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  return uniqueWords.size;
}

function countTotalSyllables(text: string): number {
  const words = text.match(/[a-zA-Z]+/g) || [];
  return words.reduce((total, word) => total + countSyllables(word), 0);
}

function calculateFleschKincaid(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalSentences === 0 || totalWords === 0) return 0;
  const score = (
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59
  );
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

export function analyzeText(text: string): TextAnalysis {
  const startTime = performance.now();
  
  const sentences = splitSentences(text);
  const totalWords = countWords(text);
  const uniqueWords = countUniqueWords(text);
  const totalSyllables = countTotalSyllables(text);
  const avgSentenceLength = sentences.length > 0 
    ? Math.round((totalWords / sentences.length) * 10) / 10 
    : 0;
  const fleschKincaid = calculateFleschKincaid(totalWords, sentences.length, totalSyllables);
  
  const endTime = performance.now();
  console.log(`Analysis completed in ${(endTime - startTime).toFixed(2)}ms`);
  
  return {
    totalWords,
    uniqueWords,
    avgSentenceLength,
    fleschKincaid,
    sentences
  };
}

function simplifySentence(
  sentence: string,
  level: number
): { simplified: string; words: SimplifiedWord[] } {
  const replacedWords: SimplifiedWord[] = [];
  
  const wordRegex = /[a-zA-Z]+/g;
  let match;
  let simplified = sentence;
  let offset = 0;
  
  const matches: Array<{ word: string; index: number }> = [];
  while ((match = wordRegex.exec(sentence)) !== null) {
    matches.push({ word: match[0], index: match.index });
  }
  
  for (const { word, index } of matches) {
    const entry = getSimplifiedWord(word, level);
    if (entry) {
      const simplifiedWord = entry.simplified;
      const startIndex = index + offset;
      const endIndex = startIndex + word.length;
      
      simplified = simplified.slice(0, startIndex) + simplifiedWord + simplified.slice(endIndex);
      offset += simplifiedWord.length - word.length;
      
      replacedWords.push({
        original: entry.word,
        simplified: entry.simplified,
        definition: entry.definition,
        level: entry.level
      });
    }
  }
  
  return { simplified, words: replacedWords };
}

export function simplifyText(text: string, level: number): SimplifiedResult {
  const sentences = splitSentences(text);
  
  const simplifiedSentences: SimplifiedSentence[] = sentences.map(original => {
    const { simplified, words } = simplifySentence(original, level);
    return {
      original,
      simplified,
      words
    };
  });
  
  return {
    sentences: simplifiedSentences
  };
}
