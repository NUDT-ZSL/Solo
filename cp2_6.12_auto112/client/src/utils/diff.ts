export interface DiffPart {
  text: string;
  added: boolean;
  removed: boolean;
}

export function computeDiff(oldText: string, newText: string): DiffPart[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const result: DiffPart[] = [];
  const oldLen = oldWords.length;
  const newLen = newWords.length;

  const dp: number[][] = [];
  for (let i = 0; i <= oldLen; i++) {
    dp[i] = new Array(newLen + 1).fill(0);
  }

  for (let i = oldLen - 1; i >= 0; i--) {
    for (let j = newLen - 1; j >= 0; j--) {
      if (oldWords[i] === newWords[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = 0;
  let j = 0;

  while (i < oldLen && j < newLen) {
    if (oldWords[i] === newWords[j]) {
      result.push({ text: oldWords[i], added: false, removed: false });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ text: oldWords[i], added: false, removed: true });
      i++;
    } else {
      result.push({ text: newWords[j], added: true, removed: false });
      j++;
    }
  }

  while (i < oldLen) {
    result.push({ text: oldWords[i], added: false, removed: true });
    i++;
  }

  while (j < newLen) {
    result.push({ text: newWords[j], added: true, removed: false });
    j++;
  }

  return result;
}

export function htmlToText(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function renderDiffToHtml(diff: DiffPart[]): string {
  return diff.map(part => {
    const text = escapeHtml(part.text);
    if (part.added) {
      return `<span class="diff-add" style="background-color: rgba(46, 204, 113, 0.3); padding: 2px 4px; border-radius: 2px;">${text}</span>`;
    } else if (part.removed) {
      return `<span class="diff-remove" style="background-color: rgba(231, 76, 60, 0.3); padding: 2px 4px; border-radius: 2px; text-decoration: line-through;">${text}</span>`;
    } else {
      return text;
    }
  }).join('');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}
