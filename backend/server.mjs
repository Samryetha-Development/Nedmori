import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problems } from '../src/data.js';
import { renderProblem } from './markdown.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultStore = resolve(root, 'backend/data/submissions.json');

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createApiServer({ storePath = defaultStore } = {}) {
  let memory = [];
  let writeQueue = Promise.resolve();
  const load = async () => {
    if (!storePath) return memory;
    try { return JSON.parse(await readFile(storePath, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  };
  const save = async submissions => {
    memory = submissions;
    if (!storePath) return;
    await mkdir(dirname(storePath), { recursive: true });
    writeQueue = writeQueue.then(() => writeFile(storePath, `${JSON.stringify(submissions, null, 2)}\n`, 'utf8'));
    await writeQueue;
  };

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true, service: 'nedmori-api' });
      if (request.method === 'GET' && url.pathname === '/api/problems') return json(response, 200, problems);
      if (request.method === 'GET' && /^\/api\/problems\/\d+\/rendered$/.test(url.pathname)) {
        const problem = problems.find(item => item.id === Number(url.pathname.split('/').at(-2)));
        return problem ? json(response, 200, { id: problem.id, ...renderProblem(problem) }) : json(response, 404, { error: 'Problem not found' });
      }
      if (request.method === 'GET' && /^\/api\/problems\/\d+$/.test(url.pathname)) {
        const problem = problems.find(item => item.id === Number(url.pathname.split('/').at(-1)));
        return problem ? json(response, 200, problem) : json(response, 404, { error: 'Problem not found' });
      }
      if (request.method === 'GET' && url.pathname === '/api/submissions') {
        const pid = Number(url.searchParams.get('problemId'));
        const submissions = await load();
        return json(response, 200, Number.isFinite(pid) && pid > 0 ? submissions.filter(item => item.pid === pid) : submissions);
      }
      if (request.method === 'POST' && url.pathname === '/api/submissions') {
        const input = await body(request);
        if (!problems.some(item => item.id === input.pid)) return json(response, 400, { error: 'Unknown problem' });
        if (!['C++ 17', 'Python 3', 'Java 17'].includes(input.language)) return json(response, 400, { error: 'Unsupported language' });
        if (typeof input.code !== 'string' || !input.code.trim() || input.code.length > 200_000) return json(response, 400, { error: 'Code must contain 1-200000 characters' });
        const record = {
          id: `N${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pid: input.pid,
          code: input.code,
          status: 'Pending',
          language: input.language,
          time: '—',
          memory: '—',
          date: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace('/', '-'),
          kind: 'server',
        };
        const submissions = await load();
        await save([record, ...submissions]);
        return json(response, 201, record);
      }
      json(response, 404, { error: 'Not found' });
    } catch (error) {
      json(response, error instanceof SyntaxError ? 400 : 500, { error: error instanceof SyntaxError ? 'Invalid JSON' : 'Internal server error' });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.NEDMORI_API_PORT || 8787);
  createApiServer().listen(port, '127.0.0.1', () => console.log(`Nedmori API listening on http://127.0.0.1:${port}`));
}
