import express from 'express';
import cors from 'cors';
import { SourceMapConsumer } from 'source-map';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

export interface StackFrame {
  id: string;
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  isError: boolean;
  children: StackFrame[];
  variables: Record<string, string>;
  sourceCode?: string;
  originalLineNumber?: number;
  originalColumnNumber?: number;
}

export interface ParseResult {
  callTree: StackFrame[];
  errorFrameId?: string;
  variables: Record<string, Record<string, string>>;
  sourceCode?: string;
}

const stackLineRegex = /at\s+(?:(?:new\s+)?([^(\s]+)\s+)?\(?([^:]+):(\d+):(\d+)\)?/;
const errorMessageRegex = /^([^:]+):\s*(.+)$/;

function extractVariablesFromContext(frame: StackFrame, code: string): Record<string, string> {
  const variables: Record<string, string> = {};
  const lines = code.split('\n');
  const lineIdx = frame.lineNumber - 1;
  
  if (lineIdx >= 0 && lineIdx < lines.length) {
    const line = lines[lineIdx];
    
    const varDeclarations = line.match(/(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*([^;]+)/g);
    if (varDeclarations) {
      varDeclarations.forEach(decl => {
        const match = decl.match(/(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*([^;]+)/);
        if (match) {
          variables[match[1]] = match[2].trim();
        }
      });
    }
    
    const funcParams = line.match(/function\s+[a-zA-Z_$][\w$]*\s*\(([^)]*)\)/);
    if (funcParams && funcParams[1]) {
      funcParams[1].split(',').forEach(param => {
        const paramName = param.trim().match(/^[a-zA-Z_$][\w$]*/);
        if (paramName) {
          variables[paramName[0]] = '"<parameter>"';
        }
      });
    }
    
    const arrowParams = line.match(/\(([^)]*)\)\s*=>/);
    if (arrowParams && arrowParams[1]) {
      arrowParams[1].split(',').forEach(param => {
        const paramName = param.trim().match(/^[a-zA-Z_$][\w$]*/);
        if (paramName) {
          variables[paramName[0]] = '"<parameter>"';
        }
      });
    }
  }
  
  if (Object.keys(variables).length === 0) {
    variables['this'] = '{}';
    variables['arguments'] = '[]';
  }
  
  return variables;
}

function parseStackTrace(stackText: string): ParseResult {
  const lines = stackText.trim().split('\n');
  const frames: StackFrame[] = [];
  const frameMap = new Map<string, StackFrame>();
  const variables: Record<string, Record<string, string>> = {};
  let errorFrameId: string | undefined;
  let sourceCode = '';
  
  let errorMessage = '';
  let stackStartIdx = 0;
  
  if (errorMessageRegex.test(lines[0])) {
    errorMessage = lines[0];
    stackStartIdx = 1;
  }
  
  const codeLines: string[] = [];
  const stackLines: string[] = [];
  
  for (let i = stackStartIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('at ') || line.startsWith('    at ')) {
      stackLines.push(line);
    } else if (line && !line.startsWith('Error') && !line.match(/^\w+Error:/)) {
      codeLines.push(line);
    }
  }
  
  if (codeLines.length > 0) {
    sourceCode = codeLines.join('\n');
  }
  
  for (let i = 0; i < stackLines.length; i++) {
    const match = stackLines[i].match(stackLineRegex);
    if (match) {
      const frame: StackFrame = {
        id: `frame-${i}`,
        functionName: match[1] || '<anonymous>',
        fileName: match[2] || 'unknown',
        lineNumber: parseInt(match[3], 10),
        columnNumber: parseInt(match[4], 10),
        isError: i === 0,
        children: [],
        variables: {},
      };
      
      if (sourceCode) {
        frame.variables = extractVariablesFromContext(frame, sourceCode);
        variables[frame.id] = frame.variables;
      } else {
        frame.variables = {
          this: '{}',
          arguments: '[]',
          returnValue: 'undefined',
        };
        variables[frame.id] = frame.variables;
      }
      
      if (i === 0) {
        errorFrameId = frame.id;
      }
      
      frameMap.set(frame.id, frame);
      frames.push(frame);
    }
  }
  
  for (let i = 0; i < frames.length - 1; i++) {
    frames[i + 1].children.push(frames[i]);
  }
  
  const callTree = frames.length > 0 ? [frames[frames.length - 1]] : [];
  
  return {
    callTree,
    errorFrameId,
    variables,
    sourceCode: sourceCode || undefined,
  };
}

async function resolveSourceMap(
  parseResult: ParseResult,
  sourceMapUrl?: string,
  minifiedCode?: string
): Promise<ParseResult> {
  if (!sourceMapUrl) {
    return parseResult;
  }
  
  try {
    let rawSourceMap: string;
    
    if (sourceMapUrl.startsWith('data:application/json;base64,')) {
      const base64 = sourceMapUrl.replace('data:application/json;base64,', '');
      rawSourceMap = Buffer.from(base64, 'base64').toString('utf-8');
    } else if (sourceMapUrl.startsWith('http://') || sourceMapUrl.startsWith('https://')) {
      const response = await fetch(sourceMapUrl);
      rawSourceMap = await response.text();
    } else {
      rawSourceMap = sourceMapUrl;
    }
    
    const consumer = await new SourceMapConsumer(JSON.parse(rawSourceMap));
    
    const resolveFrame = (frame: StackFrame): StackFrame => {
      const original = consumer.originalPositionFor({
        line: frame.lineNumber,
        column: frame.columnNumber,
      });
      
      const resolvedFrame: StackFrame = {
        ...frame,
        originalLineNumber: frame.lineNumber,
        originalColumnNumber: frame.columnNumber,
        lineNumber: original.line || frame.lineNumber,
        columnNumber: original.column || frame.columnNumber,
        fileName: original.source || frame.fileName,
        functionName: original.name || frame.functionName,
        children: frame.children.map(resolveFrame),
      };
      
      return resolvedFrame;
    };
    
    const resolvedTree = parseResult.callTree.map(resolveFrame);
    consumer.destroy();
    
    return {
      ...parseResult,
      callTree: resolvedTree,
    };
  } catch (error) {
    console.error('Source map resolution failed:', error);
    return parseResult;
  }
}

app.post('/api/parse', async (req, res) => {
  try {
    const { stackText, sourceMapUrl, sourceCode } = req.body;
    
    if (!stackText || typeof stackText !== 'string') {
      return res.status(400).json({ error: 'stackText is required' });
    }
    
    let parseResult = parseStackTrace(stackText);
    
    if (sourceCode && !parseResult.sourceCode) {
      parseResult.sourceCode = sourceCode;
    }
    
    if (sourceMapUrl) {
      parseResult = await resolveSourceMap(parseResult, sourceMapUrl, sourceCode);
    }
    
    res.json(parseResult);
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: 'Failed to parse stack trace' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`StackParser server running on http://localhost:${PORT}`);
});
