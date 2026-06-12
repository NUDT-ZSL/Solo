import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAssignmentById, getTestCases } from '../data/assignments.js';
import { executeCode } from '../services/sandbox.js';
import type { Language, TestCaseResult, SubmitResponse } from '../../src/shared/types.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { code, language, assignmentId } = req.body as {
    code: string;
    language: Language;
    assignmentId: string;
  };

  if (!code || !language || !assignmentId) {
    res.status(400).json({ error: 'Missing required fields: code, language, assignmentId' });
    return;
  }

  const assignment = getAssignmentById(assignmentId);
  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }

  const testCases = getTestCases(assignmentId);
  const results: TestCaseResult[] = [];

  for (const testCase of testCases) {
    try {
      const execution = await executeCode(language, code, testCase.input);

      const actualOutput = execution.stdout.trim();
      const expectedOutput = testCase.expectedOutput.trim();
      const isMatch = actualOutput === expectedOutput;

      let status: TestCaseResult['status'];
      if (execution.timedOut) {
        status = 'timeout';
      } else if (execution.exitCode !== 0 && execution.exitCode !== null) {
        status = 'error';
      } else if (isMatch) {
        status = 'passed';
      } else {
        status = 'failed';
      }

      results.push({
        caseId: testCase.id,
        status,
        input: testCase.input,
        expectedOutput,
        actualOutput,
        executionTime: execution.executionTime,
        errorMessage: execution.stderr || undefined,
      });
    } catch (err) {
      results.push({
        caseId: testCase.id,
        status: 'error',
        input: testCase.input,
        expectedOutput: testCase.expectedOutput.trim(),
        actualOutput: '',
        executionTime: 0,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const passedCount = results.filter(r => r.status === 'passed').length;
  const maxScore = results.length * 10;
  const totalScore = passedCount * 10;

  const response: SubmitResponse = {
    submissionId: uuidv4(),
    assignmentId,
    results,
    totalScore,
    maxScore,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

export default router;
