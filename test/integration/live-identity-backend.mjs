// The identity suite uses the shared clean-source/tmpfs lifecycle, with a separate context.
process.env.LIVE_TEST_SUITE = 'identity';
await import('./live-backend.mjs');
