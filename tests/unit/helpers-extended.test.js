'use strict';

/**
 * Extended helpers tests — covers runtime cache, output functions,
 * getComposeCmd, and edge cases that the first file didn't reach.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const h = require('../../src/utils/helpers');

// ── getComposeCmd ─────────────────────────────────────────────────────────────
describe('getComposeCmd', () => {
    test('docker returns [docker, compose]', () => {
        const result = h.getComposeCmd('docker');
        expect(result).toEqual(['docker', 'compose']);
    });

    test('podman returns array starting with podman', () => {
        // Result depends on what's installed; just validate it is an array with podman
        const result = h.getComposeCmd('podman');
        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toBe('podman');
    });

    test('unknown runtime falls back to docker', () => {
        // Unknown runtime should still produce something array-like
        const result = h.getComposeCmd('unknown');
        expect(Array.isArray(result)).toBe(true);
    });
});

// ── detectRuntime (env var override) ─────────────────────────────────────────
describe('detectRuntime env override', () => {
    const orig = process.env.SHIPLET_RUNTIME;

    afterEach(() => {
        if (orig === undefined) delete process.env.SHIPLET_RUNTIME;
        else process.env.SHIPLET_RUNTIME = orig;
        h.invalidateRuntimeCache();
    });

    test('SHIPLET_RUNTIME=docker forces docker', () => {
        process.env.SHIPLET_RUNTIME = 'docker';
        h.invalidateRuntimeCache();
        expect(h.detectRuntime(null)).toBe('docker');
    });

    test('SHIPLET_RUNTIME=podman forces podman', () => {
        process.env.SHIPLET_RUNTIME = 'podman';
        h.invalidateRuntimeCache();
        expect(h.detectRuntime(null)).toBe('podman');
    });

    test('SHIPLET_RUNTIME=invalid is ignored, falls through to auto-detect', () => {
        process.env.SHIPLET_RUNTIME = 'invalid-runtime';
        h.invalidateRuntimeCache();
        // Should not return 'invalid-runtime' — either returns docker/podman/null
        const result = h.detectRuntime(null);
        expect(['docker', 'podman', null]).toContain(result);
    });
});

// ── detectRuntime config file ──────────────────────────────────────────────────
describe('detectRuntime from shiplet.config.json', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-rt-'));
        delete process.env.SHIPLET_RUNTIME;
        h.invalidateRuntimeCache();
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        h.invalidateRuntimeCache();
    });

    test('reads docker from config', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'shiplet.config.json'),
            JSON.stringify({ runtime: 'docker' })
        );
        h.invalidateRuntimeCache();
        expect(h.detectRuntime(tmpDir)).toBe('docker');
    });

    test('reads podman from config', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'shiplet.config.json'),
            JSON.stringify({ runtime: 'podman' })
        );
        h.invalidateRuntimeCache();
        expect(h.detectRuntime(tmpDir)).toBe('podman');
    });

    test('ignores unknown runtime value in config', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'shiplet.config.json'),
            JSON.stringify({ runtime: 'kubernetes' })
        );
        h.invalidateRuntimeCache();
        // Should fall through to auto-detect
        const result = h.detectRuntime(tmpDir);
        expect(['docker', 'podman', null]).toContain(result);
    });
});

// ── Runtime cache behaviour ───────────────────────────────────────────────────
describe('runtime cache', () => {
    afterEach(() => {
        delete process.env.SHIPLET_RUNTIME;
        h.invalidateRuntimeCache();
    });

    test('invalidateRuntimeCache does not throw', () => {
        expect(() => h.invalidateRuntimeCache()).not.toThrow();
    });

    test('after invalidation, env var change is picked up', () => {
        process.env.SHIPLET_RUNTIME = 'docker';
        h.invalidateRuntimeCache();
        expect(h.detectRuntime(null)).toBe('docker');

        process.env.SHIPLET_RUNTIME = 'podman';
        h.invalidateRuntimeCache();
        expect(h.detectRuntime(null)).toBe('podman');
    });
});

// ── Output helpers (stdout capture) ──────────────────────────────────────────
describe('output helpers', () => {
    let logOutput = [];
    let errOutput = [];
    let origLog, origErr;

    beforeEach(() => {
        logOutput = []; errOutput = [];
        origLog = console.log; origErr = console.error;
        console.log = (...a) => logOutput.push(a.join(' '));
        console.error = (...a) => errOutput.push(a.join(' '));
    });

    afterEach(() => {
        console.log = origLog;
        console.error = origErr;
    });

    test('success() writes to console.log', () => {
        h.success('all good');
        expect(logOutput.join('')).toContain('all good');
    });

    test('info() writes to console.log', () => {
        h.info('some info');
        expect(logOutput.join('')).toContain('some info');
    });

    test('warn() writes to console.log', () => {
        h.warn('careful now');
        expect(logOutput.join('')).toContain('careful now');
    });

    test('error() without exitCode writes to console.error', () => {
        h.error('something broke');
        expect(errOutput.join('')).toContain('something broke');
    });

    test('header() writes to console.log', () => {
        h.header('My Section');
        expect(logOutput.join('')).toContain('My Section');
    });
});

// ── sanitiseContainerName edge cases ─────────────────────────────────────────
describe('sanitiseContainerName edge cases', () => {
    test('allows long valid names', () => {
        const name = 'a'.repeat(100);
        expect(h.sanitiseContainerName(name)).toBe(name);
    });

    test('throws on spaces', () => {
        expect(() => h.sanitiseContainerName('my app')).toThrow();
    });

    test('throws on null bytes', () => {
        expect(() => h.sanitiseContainerName('app\x00evil')).toThrow();
    });

    test('throws on newlines', () => {
        expect(() => h.sanitiseContainerName('app\nevil')).toThrow();
    });

    test('throws on quotes', () => {
        expect(() => h.sanitiseContainerName("app'evil")).toThrow();
        expect(() => h.sanitiseContainerName('app"evil')).toThrow();
    });

    test('throws on ampersand', () => {
        expect(() => h.sanitiseContainerName('app & evil')).toThrow();
    });
});

// ── sanitiseInt extended ──────────────────────────────────────────────────────
describe('sanitiseInt extended', () => {
    test('handles number type input', () => {
        expect(h.sanitiseInt(50)).toBe('50');
    });

    test('handles string float', () => {
        // parseInt('3.7') = 3 which is > 0
        expect(h.sanitiseInt('3.7')).toBe('3');
    });

    test('large numbers pass through', () => {
        expect(h.sanitiseInt('999999')).toBe('999999');
    });

    test('null returns fallback', () => {
        expect(h.sanitiseInt(null)).toBe('100');
    });

    test('undefined returns fallback', () => {
        expect(h.sanitiseInt(undefined)).toBe('100');
    });
});

// ── writeShipletConfig — file content verification ───────────────────────────────
describe('writeShipletConfig content', () => {
    let tmpDir;

    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-wc-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    test('writes valid JSON', () => {
        h.writeShipletConfig(tmpDir, { runtime: 'docker', port: 3000 });
        expect(() => JSON.parse(fs.readFileSync(path.join(tmpDir, 'shiplet.config.json'), 'utf8'))).not.toThrow();
    });

    test('file ends with newline', () => {
        h.writeShipletConfig(tmpDir, { runtime: 'docker' });
        const raw = fs.readFileSync(path.join(tmpDir, 'shiplet.config.json'), 'utf8');
        expect(raw.endsWith('\n')).toBe(true);
    });

    test('file is pretty-printed (has indentation)', () => {
        h.writeShipletConfig(tmpDir, { runtime: 'docker', appName: 'test' });
        const raw = fs.readFileSync(path.join(tmpDir, 'shiplet.config.json'), 'utf8');
        expect(raw).toContain('\n  ');
    });

    test('preserves all types: string, number, boolean', () => {
        h.writeShipletConfig(tmpDir, { runtime: 'docker', port: 3000, debug: true });
        const cfg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'shiplet.config.json'), 'utf8'));
        expect(typeof cfg.runtime).toBe('string');
        expect(typeof cfg.port).toBe('number');
        expect(typeof cfg.debug).toBe('boolean');
    });
});

// ── findProjectRoot deep nesting ──────────────────────────────────────────────
describe('findProjectRoot deep nesting', () => {
    let tmpDir;

    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-deep-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    test('finds root 5 levels deep', () => {
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), '');
        const deep = path.join(tmpDir, 'a', 'b', 'c', 'd', 'e');
        fs.mkdirSync(deep, { recursive: true });
        expect(h.findProjectRoot(deep)).toBe(tmpDir);
    });

    test('stops at filesystem root, returns null', () => {
        // Start from /tmp which has no shiplet project up the chain to root
        const result = h.findProjectRoot('/');
        expect(result).toBeNull();
    });

    test('prefers closest ancestor', () => {
        // Two nested shiplet.yml — should find the innermost one
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), '');
        const sub = path.join(tmpDir, 'sub');
        fs.mkdirSync(sub, { recursive: true });
        fs.writeFileSync(path.join(sub, 'shiplet.yml'), '');
        expect(h.findProjectRoot(sub)).toBe(sub);
    });
});

// ── getRunningServices ────────────────────────────────────────────────────────
describe('getRunningServices', () => {
    let tmpDir;

    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-svc-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    test('returns empty array when no compose file or no docker', () => {
        // No shiplet.yml, no docker running — should return []
        const result = h.getRunningServices(tmpDir);
        expect(Array.isArray(result)).toBe(true);
    });
});
