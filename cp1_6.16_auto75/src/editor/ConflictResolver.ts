export interface ParagraphVersion {
  id: string;
  content: string;
  timestamp: number;
  authorId: string;
  authorName: string;
}

export interface ConflictResult {
  resolved: boolean;
  mergedContent: string | null;
  conflict: {
    versionA: ParagraphVersion;
    versionB: ParagraphVersion;
  } | null;
}

function computeDifference(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0 || b.length === 0) return 1;

  const lenA = a.length;
  const lenB = b.length;
  const maxLen = Math.max(lenA, lenB);

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    Array(lenB + 1).fill(0)
  );

  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[lenA][lenB] / maxLen;
}

function mergeContents(base: string, versionA: string, versionB: string): string {
  const linesA = versionA.split('\n');
  const linesB = versionB.split('\n');
  const baseLines = base.split('\n');

  const result: string[] = [];
  const maxLen = Math.max(linesA.length, linesB.length, baseLines.length);

  for (let i = 0; i < maxLen; i++) {
    const lineA = i < linesA.length ? linesA[i] : null;
    const lineB = i < linesB.length ? linesB[i] : null;
    const lineBase = i < baseLines.length ? baseLines[i] : null;

    if (lineA === lineB) {
      result.push(lineA!);
    } else if (lineA === lineBase && lineB !== lineBase) {
      result.push(lineB!);
    } else if (lineB === lineBase && lineA !== lineBase) {
      result.push(lineA!);
    } else {
      if (lineA !== null) result.push(lineA);
      if (lineB !== null && lineB !== lineA) result.push(lineB);
    }
  }

  return result.join('\n');
}

export function resolveConflict(
  baseContent: string,
  versionA: ParagraphVersion,
  versionB: ParagraphVersion
): ConflictResult {
  const diff = computeDifference(versionA.content, versionB.content);

  if (diff < 0.2) {
    const merged = mergeContents(baseContent, versionA.content, versionB.content);
    return {
      resolved: true,
      mergedContent: merged,
      conflict: null,
    };
  }

  return {
    resolved: false,
    mergedContent: null,
    conflict: {
      versionA,
      versionB,
    },
  };
}

export function chooseVersion(
  chosen: ParagraphVersion,
  discarded: ParagraphVersion
): ConflictResult {
  return {
    resolved: true,
    mergedContent: chosen.content,
    conflict: {
      versionA: chosen,
      versionB: discarded,
    },
  };
}

export function validateParagraph(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (content.length > 50000) {
    errors.push('段落内容不能超过50000个字符');
  }

  return { valid: errors.length === 0, errors };
}
