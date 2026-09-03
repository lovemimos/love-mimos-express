// Deterministic offline unit verification. No network or production database.
// Uses the TypeScript compiler directly when esbuild/Vitest is sandbox-blocked.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
function load(relative, overrides = {}) {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  const normal = mod.require.bind(mod);
  mod.require = (id) => id === 'server-only' ? {} : (id in overrides ? overrides[id] : normal(id));
  mod._compile(code, filename);
  return mod.exports;
}
const context = load('src/lib/tiny-sync/batch-context.ts');
const empty = () => ({ processed: 0, created: 0, updated: 0, unchanged: 0, inactivated: 0, notFound: 0, errors: 0, review: 0 });
let runs, calls, discovery, lock, rawUpdates, pauseOn;
const database = {
  tinySyncRun: {
    findFirst: async ({ where }) => runs.find((r) => typeof where.status === 'string' ? r.status === where.status : where.status.in.includes(r.status)) ?? null,
    create: async ({ data }) => { const r = { id: 'run' + runs.length, startedAt: new Date(), finishedAt: null, errorSummary: null, ...empty(), ...data }; runs.push(r); return r; },
    update: async ({ where, data }) => Object.assign(runs.find((r) => r.id === where.id), structuredClone(data)),
  },
  tinySyncLock: { updateMany: async () => ({ count: lock ? 1 : 0 }) },
  product: { findMany: async () => [{ tinyId: '1' }] },
  $executeRaw: async () => { rawUpdates++; },
};
database.$transaction = async (fn) => fn(database);
const engine = load('src/lib/tiny-sync/resumable-sync.ts', {
  '@/lib/db/prisma': { prisma: database },
  '@/../generated/prisma/client': { Prisma: { sql: () => ({}), join: (x) => x } },
  './batch-context': context,
  './tiny-sync-service': {
    emptyCounters: empty,
    acquireLock: async () => { if (lock) return false; lock = true; return true; },
    releaseLock: async () => { lock = false; },
    discoverIds: async () => { discovery++; return ['1', '2', '3']; },
    syncTinyProduct: async (id) => { if (id === pauseOn) throw new context.BatchPause(); calls.push(id); return 'unchanged'; },
  },
});
function reset() { runs = []; calls = []; discovery = 0; lock = false; rawUpdates = 0; pauseOn = null; }
async function main() {
  reset(); pauseOn = '2';
  let result = await engine.syncTinyCatalog({ trigger: 'manual' });
  assert.equal(result.status, 'PARTIAL'); assert.equal(result.processedThisBatch, 1);
  assert.equal(rawUpdates, 0); assert.equal(lock, false);
  pauseOn = null;
  result = await engine.syncTinyCatalog({ trigger: 'manual' });
  assert.equal(result.status, 'SUCCESS'); assert.equal(result.processedTotal, 3);
  assert.deepEqual(calls, ['1', '2', '3']); assert.equal(discovery, 1); assert.equal(rawUpdates, 1);
  console.log('PASS: persisted cursor, resume, no duplicate item calls, final checkpoint');
  reset();
  runs.push({ id: 'legacy', mode: 'incremental', status: 'RUNNING', startedAt: new Date(Date.now() - 700000), errorSummary: null, ...empty(), processed: 1, unchanged: 1 });
  result = await engine.syncTinyCatalog({ trigger: 'manual' });
  assert.equal(result.status, 'SUCCESS'); assert.deepEqual(calls, ['2', '3']); assert.equal(result.processedTotal, 3);
  console.log('PASS: stale legacy recovery preserves prior work');
  reset(); lock = true;
  await assert.rejects(engine.syncTinyCatalog({ trigger: 'manual' }), /ALREADY_RUNNING/);
  assert.equal(runs.length, 0);
  console.log('PASS: concurrent run rejected');
  context.batchContext.run({ deadline: Date.now() + 20000, progress: {}, save: async () => {} }, () => assert.throws(() => context.checkBudget(30000), context.BatchPause));
  assert.equal(context.safeSyncError(new Error('secret=do-not-output')), 'SYNC_OPERATION_FAILED');
  console.log('PASS: deadline reserve and sanitized errors');
  const client = load('src/lib/tiny-sync/tiny-v2-client.ts', { './batch-context': context });
  const originalFetch = global.fetch;
  const originalToken = process.env.TINY_API_TOKEN;
  process.env.TINY_API_TOKEN = 'offline-test-only';
  let requests = 0;
  const progress = { responses: {}, nextRequestAt: 0 };
  try {
    global.fetch = async () => { requests++; return new Response(JSON.stringify({ retorno: { status: 'OK', produto: { id: '123', nome: 'Offline' } } })); };
    await context.batchContext.run({ deadline: Date.now() + 200000, progress, save: async () => {} }, () => client.getTinyProduct('123'));
    await context.batchContext.run({ deadline: 0, progress, save: async () => {} }, () => client.getTinyProduct('123'));
    assert.equal(requests, 1);
    global.fetch = async () => new Response('', { status: 429, headers: { 'retry-after': '400' } });
    await assert.rejects(context.batchContext.run({ deadline: Date.now() + 200000, progress, save: async () => {} }, () => client.getTinyProduct('456')), context.BatchPause);
    assert.ok(progress.nextRequestAt > Date.now() + 390000);
    console.log('PASS: durable HTTP response reuse and 429 cooldown across batches');
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TINY_API_TOKEN; else process.env.TINY_API_TOKEN = originalToken;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
