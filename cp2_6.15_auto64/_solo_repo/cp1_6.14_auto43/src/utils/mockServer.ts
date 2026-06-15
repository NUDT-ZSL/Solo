import type { Rule, MockRequest, MockResponse, RequestLog, HttpMethod } from '../types';

function matchSingleCondition(
  condition: Rule['conditions'][number],
  req: MockRequest
): boolean {
  let actualValue: string | undefined;

  switch (condition.type) {
    case 'url':
      actualValue = req.url;
      break;
    case 'query':
      actualValue = req.query[condition.key];
      break;
    case 'header':
      actualValue = req.headers[condition.key.toLowerCase()] || req.headers[condition.key];
      break;
    case 'body':
      actualValue = req.body?.[condition.key];
      break;
  }

  if (actualValue === undefined) return false;

  switch (condition.operator) {
    case 'equals':
      return String(actualValue) === condition.value;
    case 'contains':
      return String(actualValue).includes(condition.value);
    case 'regex':
      try {
        return new RegExp(condition.value).test(String(actualValue));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function matchRule(rule: Rule, req: MockRequest): boolean {
  if (!rule.enabled) return false;

  if (rule.method !== req.method) return false;

  const urlRegex = new RegExp(
    '^' + rule.urlPattern.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*') + '$'
  );
  if (!urlRegex.test(req.url)) return false;

  if (rule.conditions.length > 0) {
    return rule.conditions.every((cond) => matchSingleCondition(cond, req));
  }

  return true;
}

export function requestHandler(rules: Rule[], req: MockRequest): MockResponse {
  const matchedRule = rules.find((rule) => matchRule(rule, req));

  if (matchedRule) {
    return {
      statusCode: matchedRule.statusCode,
      body: matchedRule.responseBody,
      headers: matchedRule.responseHeaders,
      matchedRuleId: matchedRule.id,
      matchedRuleName: matchedRule.name,
      delay: matchedRule.delay
    };
  }

  return {
    statusCode: 404,
    body: { error: 'No matching mock rule found' },
    headers: { 'Content-Type': 'application/json' },
    delay: 10
  };
}

export function generateLog(
  req: MockRequest,
  response: MockResponse
): RequestLog {
  const isError = response.statusCode >= 400;
  const isWarning = !response.matchedRuleId || response.delay > 2000;

  return {
    id: `${req.timestamp}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: req.timestamp,
    method: req.method,
    url: req.url,
    matchedRuleName: response.matchedRuleName || null,
    statusCode: response.statusCode,
    delay: response.delay,
    isError,
    isWarning: isWarning && !isError
  };
}

const sampleRequests: { url: string; method: HttpMethod; query: Record<string, string>; headers: Record<string, string> }[] = [
  { url: '/api/users', method: 'GET', query: { page: '1' }, headers: { 'accept': 'application/json' } },
  { url: '/api/users/123', method: 'GET', query: {}, headers: { 'accept': 'application/json' } },
  { url: '/api/posts', method: 'GET', query: { category: 'tech' }, headers: {} },
  { url: '/api/login', method: 'POST', query: {}, headers: { 'content-type': 'application/json' } },
  { url: '/api/not-found', method: 'GET', query: {}, headers: {} }
];

let simulationTimer: number | null = null;

export function startSimulation(
  rules: Rule[],
  onLog: (log: RequestLog) => void,
  interval: number = 4000
): () => void {
  if (simulationTimer !== null) {
    window.clearInterval(simulationTimer);
  }

  const runSimulation = () => {
    const sample = sampleRequests[Math.floor(Math.random() * sampleRequests.length)];
    const req: MockRequest = {
      url: sample.url,
      method: sample.method,
      query: sample.query,
      headers: sample.headers,
      timestamp: Date.now()
    };
    const response = requestHandler(rules, req);
    const log = generateLog(req, response);
    onLog(log);
  };

  runSimulation();
  simulationTimer = window.setInterval(runSimulation, interval);

  return () => {
    if (simulationTimer !== null) {
      window.clearInterval(simulationTimer);
      simulationTimer = null;
    }
  };
}
