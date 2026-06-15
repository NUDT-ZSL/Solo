export interface ParsedCommand {
  verb: string;
  noun: string;
  target: string;
  error?: string;
}

type VerbAliasEntry = {
  canonical: string;
  aliases: string[];
};

const VERB_ALIASES: VerbAliasEntry[] = [
  { canonical: 'north', aliases: ['north', 'n', 'go north', 'walk north', 'head north'] },
  { canonical: 'south', aliases: ['south', 's', 'go south', 'walk south', 'head south'] },
  { canonical: 'east', aliases: ['east', 'e', 'go east', 'walk east', 'head east'] },
  { canonical: 'west', aliases: ['west', 'w', 'go west', 'walk west', 'head west'] },
  { canonical: 'look', aliases: ['look', 'l', 'look around', 'examine room'] },
  { canonical: 'take', aliases: ['take', 'pick up', 'grab', 'get', 'pick'] },
  { canonical: 'drop', aliases: ['drop', 'put down', 'leave', 'discard'] },
  { canonical: 'inventory', aliases: ['inventory', 'i', 'inv', 'check inventory', 'items', 'show inventory'] },
  { canonical: 'help', aliases: ['help', 'h', '?', 'commands', 'list commands'] },
  { canonical: 'examine', aliases: ['examine', 'x', 'look at', 'inspect', 'check', 'read'] },
  { canonical: 'go', aliases: ['go', 'walk', 'move', 'travel', 'head'] },
  { canonical: 'use', aliases: ['use', 'utilize', 'apply', 'activate'] },
  { canonical: 'open', aliases: ['open', 'unlock'] },
  { canonical: 'close', aliases: ['close', 'shut', 'lock'] },
  { canonical: 'talk', aliases: ['talk', 'speak', 'say', 'ask'] }
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'to', 'on', 'in', 'at', 'with', 'and',
  'is', 'are', 'of', 'for', 'from', 'up', 'down', 'into',
  'onto', 'toward', 'towards', 'through', 'door', 'gate', 'passage'
]);

const DIRECTION_WORDS = new Set([
  'north', 'south', 'east', 'west', 'n', 's', 'e', 'w'
]);

export class ParseEngine {
  parse(input: string): ParsedCommand {
    const trimmed = input.trim().toLowerCase();

    if (!trimmed) {
      return { verb: '', noun: '', target: '', error: 'Please enter a command.' };
    }

    for (const entry of VERB_ALIASES) {
      for (const alias of entry.aliases) {
        if (trimmed === alias) {
          if (['north', 'south', 'east', 'west'].includes(entry.canonical)) {
            return { verb: entry.canonical, noun: '', target: '' };
          }
          return this.parseRest(entry.canonical, '');
        }
        if (trimmed.startsWith(alias + ' ')) {
          const rest = trimmed.substring(alias.length).trim();
          if (entry.canonical === 'go' && DIRECTION_WORDS.has(rest)) {
            const normalizedDir = rest.length === 1
              ? { n: 'north', s: 'south', e: 'east', w: 'west' }[rest as 'n' | 's' | 'e' | 'w']
              : rest;
            return { verb: normalizedDir!, noun: '', target: '' };
          }
          return this.parseRest(entry.canonical, rest);
        }
      }
    }

    const words = trimmed.split(/\s+/);
    const firstWord = words[0];

    for (const entry of VERB_ALIASES) {
      const firstWordsOfAliases = entry.aliases.map(a => a.split(' ')[0]);
      if (firstWordsOfAliases.includes(firstWord)) {
        const rest = words.slice(1).join(' ').trim();
        if (entry.canonical === 'go' && DIRECTION_WORDS.has(rest)) {
          const normalizedDir = rest.length === 1
            ? { n: 'north', s: 'south', e: 'east', w: 'west' }[rest as 'n' | 's' | 'e' | 'w']
            : rest;
          return { verb: normalizedDir!, noun: '', target: '' };
        }
        return this.parseRest(entry.canonical, rest);
      }
    }

    return {
      verb: '',
      noun: '',
      target: '',
      error: `I don't understand the command "${trimmed}". Type "help" for a list of commands.`
    };
  }

  private parseRest(verb: string, rest: string): ParsedCommand {
    if (!rest) {
      return { verb, noun: '', target: '' };
    }

    if (verb === 'use' || verb === 'open' || verb === 'talk') {
      const separatorMatch = rest.match(/\s+(?:on|with|to)\s+(.+)/);
      if (separatorMatch) {
        const nounPart = rest.substring(0, rest.indexOf(separatorMatch[0])).trim();
        const targetPart = separatorMatch[1].trim();
        return {
          verb,
          noun: this.filterStopWords(nounPart),
          target: this.filterStopWords(targetPart)
        };
      }

      return {
        verb,
        noun: this.filterStopWords(rest),
        target: ''
      };
    }

    if (verb === 'go') {
      const noun = this.filterStopWords(rest);
      if (DIRECTION_WORDS.has(noun)) {
        const normalizedDir = noun.length === 1
          ? { n: 'north', s: 'south', e: 'east', w: 'west' }[noun as 'n' | 's' | 'e' | 'w']
          : noun;
        return { verb: normalizedDir!, noun: '', target: '' };
      }
      return { verb, noun, target: '' };
    }

    const noun = this.filterStopWords(rest);

    if (DIRECTION_WORDS.has(noun) && verb === 'go') {
      const normalizedDir = noun.length === 1
        ? { n: 'north', s: 'south', e: 'east', w: 'west' }[noun as 'n' | 's' | 'e' | 'w']
        : noun;
      return { verb: normalizedDir!, noun: '', target: '' };
    }

    return { verb, noun, target: '' };
  }

  private filterStopWords(phrase: string): string {
    if (!phrase) return '';
    return phrase
      .split(/\s+/)
      .filter(word => !STOP_WORDS.has(word))
      .join(' ')
      .trim();
  }
}

export const parseEngine = new ParseEngine();
