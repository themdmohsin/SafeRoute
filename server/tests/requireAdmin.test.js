import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/protect.js';

function run(dbRole, tokenRole) {
  mock.method(User, 'findById', () => ({ select: async () => (dbRole ? { role: dbRole } : null) }));
  const res = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } };
  let passed = false;
  return requireAdmin({ user: { id: 'u1', role: tokenRole } }, res, () => { passed = true; })
    .then(() => { mock.restoreAll(); return { passed, code: res.code }; });
}

test('admin in database passes', async () => {
  assert.deepEqual(await run('admin', 'admin'), { passed: true, code: 200 });
});

test('demoted user with old admin token is blocked', async () => {
  assert.deepEqual(await run('commuter', 'admin'), { passed: false, code: 403 });
});

test('deleted user is blocked', async () => {
  assert.deepEqual(await run(null, 'admin'), { passed: false, code: 403 });
});
