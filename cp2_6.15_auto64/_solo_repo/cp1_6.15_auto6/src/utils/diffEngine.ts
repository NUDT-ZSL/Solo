import * as Diff from 'diff';
import { v4 as uuidv4 } from 'uuid';
import { DiffLine, CharDiff } from '../types';

const cleanText = (text: string): string => {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const computeCharDiffs = (oldContent: string, newContent: string): CharDiff[] => {
  const charDiffResult = Diff.diffChars(oldContent, newContent);
  const charDiffs: CharDiff[] = [];

  for (const part of charDiffResult) {
    const type: CharDiff['type'] = part.added ? 'added' : part.removed ? 'removed' : 'unchanged';
    charDiffs.push({
      type,
      value: part.value
    });
  }

  return charDiffs;
};

export const computeDiff = (oldText: string, newText: string): DiffLine[] => {
  const cleanedOld = cleanText(oldText);
  const cleanedNew = cleanText(newText);

  const oldLines = cleanedOld.split('\n');
  const newLines = cleanedNew.split('\n');

  const diffResult = Diff.diffLines(cleanedOld, cleanedNew, {
    ignoreWhitespace: false,
    newlineIsToken: false
  });

  const diffLines: DiffLine[] = [];
  let oldLineNum = 0;
  let newLineNum = 0;
  let i = 0;

  while (i < diffResult.length) {
    const current = diffResult[i];
    const next = diffResult[i + 1];

    if (current.removed && next && next.added) {
      const removedLines = current.value.replace(/\n$/, '').split('\n');
      const addedLines = next.value.replace(/\n$/, '').split('\n');

      const maxLines = Math.max(removedLines.length, addedLines.length);

      for (let j = 0; j < maxLines; j++) {
        const oldLine = removedLines[j] || '';
        const newLine = addedLines[j] || '';

        const hasOldContent = j < removedLines.length;
        const hasNewContent = j < addedLines.length;

        let type: DiffLine['type'];
        if (hasOldContent && hasNewContent) {
          type = 'modified';
        } else if (hasOldContent) {
          type = 'removed';
        } else {
          type = 'added';
        }

        diffLines.push({
          id: uuidv4(),
          type,
          oldLineNumber: hasOldContent ? ++oldLineNum : null,
          newLineNumber: hasNewContent ? ++newLineNum : null,
          oldContent: oldLine,
          newContent: newLine,
          charDiffs: hasOldContent && hasNewContent ? computeCharDiffs(oldLine, newLine) : undefined
        });
      }
      i += 2;
    } else if (current.added) {
      const lines = current.value.replace(/\n$/, '').split('\n');
      for (const line of lines) {
        diffLines.push({
          id: uuidv4(),
          type: 'added',
          oldLineNumber: null,
          newLineNumber: ++newLineNum,
          oldContent: '',
          newContent: line
        });
      }
      i++;
    } else if (current.removed) {
      const lines = current.value.replace(/\n$/, '').split('\n');
      for (const line of lines) {
        diffLines.push({
          id: uuidv4(),
          type: 'removed',
          oldLineNumber: ++oldLineNum,
          newLineNumber: null,
          oldContent: line,
          newContent: ''
        });
      }
      i++;
    } else {
      const lines = current.value.replace(/\n$/, '').split('\n');
      for (const line of lines) {
        diffLines.push({
          id: uuidv4(),
          type: 'unchanged',
          oldLineNumber: ++oldLineNum,
          newLineNumber: ++newLineNum,
          oldContent: line,
          newContent: line
        });
      }
      i++;
    }
  }

  while (oldLineNum < oldLines.length) {
    const line = oldLines[oldLineNum];
    diffLines.push({
      id: uuidv4(),
      type: 'removed',
      oldLineNumber: ++oldLineNum,
      newLineNumber: null,
      oldContent: line,
      newContent: ''
    });
  }

  while (newLineNum < newLines.length) {
    const line = newLines[newLineNum];
    diffLines.push({
      id: uuidv4(),
      type: 'added',
      oldLineNumber: null,
      newLineNumber: ++newLineNum,
      oldContent: '',
      newContent: line
    });
  }

  return diffLines;
};
