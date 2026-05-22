'use strict';

/**
 * These tests extract and test the semver logic from release.js
 * without requiring git or Docker.
 */

// Extract the pure functions inline (same code as release.js)
function parseSemver(v) {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || null };
}

function bumpVersion(current, bump, preTag = null) {
  const v = parseSemver(current);
  if (!v) throw new Error(`Cannot parse current version: ${current}`);
  let { major, minor, patch } = v;
  if (bump === 'major')      { major++; minor = 0; patch = 0; }
  else if (bump === 'minor') { minor++; patch = 0; }
  else if (bump === 'patch') { patch++; }
  else {
    const explicit = parseSemver(bump);
    if (!explicit) throw new Error(`Invalid version: ${bump}`);
    return preTag
      ? `${explicit.major}.${explicit.minor}.${explicit.patch}-${preTag}.0`
      : `${explicit.major}.${explicit.minor}.${explicit.patch}`;
  }
  return preTag
    ? `${major}.${minor}.${patch}-${preTag}.0`
    : `${major}.${minor}.${patch}`;
}

const CC_TYPES = {
  feat: '🚀 Features', fix: '🐛 Bug Fixes', perf: '⚡ Performance',
  refactor: '♻️  Refactoring', docs: '📝 Documentation', test: '🧪 Tests',
  chore: '🔨 Chores', ci: '🤖 CI/CD', breaking: '💥 Breaking Changes',
};

function parseConventionalCommit(line) {
  const m = line.match(/^\w+\s+(\w+)(?:\(([^)]+)\))?(!)?\s*:\s+(.+)$/);
  if (!m) return { type: 'other', scope: null, breaking: false, desc: line.replace(/^\w+\s+/, '') };
  return { type: m[3] ? 'breaking' : m[1], scope: m[2] || null, breaking: !!m[3], desc: m[4] };
}

// ── parseSemver ───────────────────────────────────────────────────────────────
describe('parseSemver', () => {
  test('parses x.y.z correctly', () => {
    expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, pre: null });
  });

  test('strips v prefix', () => {
    expect(parseSemver('v2.0.0')).toEqual({ major: 2, minor: 0, patch: 0, pre: null });
  });

  test('parses pre-release suffix', () => {
    expect(parseSemver('1.0.0-beta.0')).toEqual({ major: 1, minor: 0, patch: 0, pre: 'beta.0' });
    expect(parseSemver('1.0.0-rc.1')).toEqual({ major: 1, minor: 0, patch: 0, pre: 'rc.1' });
  });

  test('returns null for invalid strings', () => {
    expect(parseSemver('not-a-version')).toBeNull();
    expect(parseSemver('1.2')).toBeNull();
    expect(parseSemver('')).toBeNull();
  });

  test('handles 0.0.0', () => {
    expect(parseSemver('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0, pre: null });
  });
});

// ── bumpVersion ───────────────────────────────────────────────────────────────
describe('bumpVersion', () => {
  describe('patch', () => {
    test('1.0.0 → 1.0.1', () => expect(bumpVersion('1.0.0', 'patch')).toBe('1.0.1'));
    test('1.2.9 → 1.2.10', () => expect(bumpVersion('1.2.9', 'patch')).toBe('1.2.10'));
    test('0.0.0 → 0.0.1', () => expect(bumpVersion('0.0.0', 'patch')).toBe('0.0.1'));
  });

  describe('minor', () => {
    test('1.0.0 → 1.1.0', () => expect(bumpVersion('1.0.0', 'minor')).toBe('1.1.0'));
    test('1.2.3 → 1.3.0 (resets patch)', () => expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0'));
  });

  describe('major', () => {
    test('1.0.0 → 2.0.0', () => expect(bumpVersion('1.0.0', 'major')).toBe('2.0.0'));
    test('1.9.9 → 2.0.0 (resets minor and patch)', () => expect(bumpVersion('1.9.9', 'major')).toBe('2.0.0'));
  });

  describe('explicit version', () => {
    test('bumps to exact version', () => expect(bumpVersion('1.0.0', '2.5.3')).toBe('2.5.3'));
    test('strips v prefix from explicit', () => expect(bumpVersion('1.0.0', 'v3.0.0')).toBe('3.0.0'));
  });

  describe('pre-release tags', () => {
    test('patch + beta → x.y.(z+1)-beta.0', () => expect(bumpVersion('1.0.0', 'patch', 'beta')).toBe('1.0.1-beta.0'));
    test('minor + rc → x.(y+1).0-rc.0', () => expect(bumpVersion('1.0.0', 'minor', 'rc')).toBe('1.1.0-rc.0'));
    test('major + alpha → (x+1).0.0-alpha.0', () => expect(bumpVersion('1.0.0', 'major', 'alpha')).toBe('2.0.0-alpha.0'));
    test('explicit + pre → explicit-pre.0', () => expect(bumpVersion('1.0.0', '2.0.0', 'beta')).toBe('2.0.0-beta.0'));
  });

  describe('error cases', () => {
    test('throws for unparseable current version', () => {
      expect(() => bumpVersion('not-a-version', 'patch')).toThrow(/cannot parse/i);
    });

    test('throws for invalid explicit version', () => {
      expect(() => bumpVersion('1.0.0', 'invalid-ver')).toThrow(/invalid version/i);
    });
  });
});

// ── parseConventionalCommit ───────────────────────────────────────────────────
describe('parseConventionalCommit', () => {
  test('parses feat commit', () => {
    const r = parseConventionalCommit('abc1234 feat(auth): add OAuth2 login');
    expect(r.type).toBe('feat');
    expect(r.scope).toBe('auth');
    expect(r.desc).toBe('add OAuth2 login');
    expect(r.breaking).toBe(false);
  });

  test('parses fix commit without scope', () => {
    const r = parseConventionalCommit('def5678 fix: resolve null pointer');
    expect(r.type).toBe('fix');
    expect(r.scope).toBeNull();
    expect(r.desc).toBe('resolve null pointer');
  });

  test('detects breaking change with !', () => {
    const r = parseConventionalCommit('abc1234 feat!: redesign API');
    expect(r.type).toBe('breaking');
    expect(r.breaking).toBe(true);
  });

  test('detects breaking change with scope and !', () => {
    const r = parseConventionalCommit('abc1234 feat(api)!: remove deprecated endpoint');
    expect(r.type).toBe('breaking');
    expect(r.breaking).toBe(true);
    expect(r.scope).toBe('api');
  });

  test('handles non-conventional commits as other', () => {
    const r = parseConventionalCommit('abc1234 just a random commit message');
    expect(r.type).toBe('other');
    expect(r.scope).toBeNull();
  });

  test('parses chore commit', () => {
    const r = parseConventionalCommit('ghi9012 chore: bump dependencies');
    expect(r.type).toBe('chore');
  });

  test('parses perf commit', () => {
    const r = parseConventionalCommit('abc1234 perf(cache): switch to LRU');
    expect(r.type).toBe('perf');
    expect(r.scope).toBe('cache');
  });

  test('parses docs commit', () => {
    const r = parseConventionalCommit('abc1234 docs(readme): update installation');
    expect(r.type).toBe('docs');
  });
});
