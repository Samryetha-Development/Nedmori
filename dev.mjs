import { spawn } from 'node:child_process';

const api = spawn(process.execPath, ['backend/server.mjs'], { stdio: 'inherit' });
const vite = spawn(process.execPath, [process.env.npm_execpath, 'exec', 'vite', '--host', '127.0.0.1', '--port', '3000', '--strictPort'], { stdio: 'inherit' });
const children = [api, vite];
const stop = signal => { for (const child of children) if (!child.killed) child.kill(signal); };
process.on('SIGINT', () => { stop('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { stop('SIGTERM'); process.exit(0); });
for (const child of children) child.on('exit', code => { if (code) { stop('SIGTERM'); process.exit(code); } });
