export interface ParsedCommand {
  verb: string;
  noun: string;
  target: string;
  error?: string;
}

const VERBS: Record<string, string[]> = {
  north: ['north', 'n', 'go north', 'walk north'],
  south: ['south', 's', 'go south', 'walk south'],
  east: ['east', 'e', 'go east', 'walk east'],
  west: ['west', 'w', 'go west', 'walk west'],
  look: ['look', 'l', 'look around', 'examine room'],
  take: ['take', 'pick up', 'grab', 'get', 'pick'],
  use: ['use', 'utilize', 'apply'],
  inventory: ['inventory', 'i', 'inv', 'check inventory', 'items'],
  help: ['help', 'h', '?', 'commands'],
  examine: ['examine', 'x', 'look at', 'inspect', 'check'],
  go: ['go', 'walk', 'move', 'travel'],
  open: ['open', 'unlock'],
  close: ['close', 'shut'],
  drop: ['drop', 'put down', 'leave'],
  talk: ['talk', 'speak', 'say']
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'to', 'on', 'in', 'at', 'with', 'and',
  'is', 'are', 'of', 'for', 'from', 'up', 'down'
]);

export class ParseEngine {
  parse(input: string): ParsedCommand {
    const trimmed = input.trim().toLowerCase();

    if (!trimmed) {
      return { verb: '', noun: '', target: '', error: 'Please enter a command.' };
    }

    for (const [canonicalVerb, aliases] of Object.entries(VERBS)) {
      for (const alias of aliases) {
        if (trimmed === alias || trimmed.startsWith(alias + ' ')) {
          const rest = trimmed.substring(alias.length).trim();
          return this.parseRest(canonicalVerb, rest);
        }
      }
    }

    const words = trimmed.split(/\s+/);
    const firstWord = words[0];

    for (const [canonicalVerb, aliases] of Object.entries(VERBS)) {
      if (aliases.some(a => a === firstWord || a.split(' ')[0] === firstWord)) {
        const rest = words.slice(1).join(' ');
        return this.parseRest(canonicalVerb, rest);
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

    const onMatch = rest.match(/\s+(?:on|with|to)\s+(.+)/);
    if (onMatch && (verb === 'use' || verb === 'open' || verb === 'talk')) {
      const nounPart = rest.substring(0, rest.indexOf(onMatch[0])).trim();
      const targetPart = onMatch[1].trim();
      return {
        verb,
        noun: this.filterStopWords(nounPart),
        target: this.filterStopWords(targetPart)
      };
    }

    const noun = this.filterStopWords(rest);

    if (['north', 'south', 'east', 'west'].includes(noun) && verb === 'go') {
      return { verb: noun, noun: '', target: '' };
    }

    return { verb, noun, target: '' };
  }

  private filterStopWords(phrase: string): string {
    return phrase
      .split(/\s+/)
      .filter(word => !STOP_WORDS.has(word))
      .join(' ');
  }
}

export const parseEngine = new ParseEngine();
