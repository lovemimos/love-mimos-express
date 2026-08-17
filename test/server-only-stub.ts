// Tests run in Node, never in a browser, so the server-only guard has
// nothing to protect against here — this stub mirrors what Next.js's
// own webpack config does when bundling for the server (swaps
// "server-only" for a no-op). See vitest.config.ts.
export {};
