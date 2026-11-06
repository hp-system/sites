// Run the local skeleton (#157): `pnpm skeleton` (after `pnpm build`), then open
// http://127.0.0.1:4330/skeleton. Every registry page opens at its real URL as a wireframe.
// Other pages run on stub data (300 fake properties), never on the real CRM. Ctrl+C stops it.
import { spawn } from 'node:child_process';
import { startStub } from './stub-api.mjs';

const PORT = 4330;
const stub = await startStub({ port: 4339, n: 300, variety: true });
const site = spawn(process.execPath, ['dist/server/entry.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT), SITE_ENV: 'preview', SKELETON: '1', EALIDA_API: stub.base, PUBLIC_ORIGIN: `http://127.0.0.1:${PORT}` },
});
console.log(`\n  Skeleton: http://127.0.0.1:${PORT}/skeleton   (Ctrl+C to stop)\n`);
const stop = () => { site.kill(); stub.server.close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
site.on('exit', () => { stub.server.close(); process.exit(0); });
