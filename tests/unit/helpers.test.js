'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const helpers = require('../../src/utils/helpers');

describe('sanitiseContainerName', () => {
    test('allows alphanumeric names', () => {
        expect(helpers.sanitiseContainerName('myapp')).toBe('myapp');
    });

    test('allows hyphens, underscores, dots, slashes', () => {
        expect(helpers.sanitiseContainerName('my-app_1.0/test')).toBe('my-app_1.0/test');
    });

    test('throws on semicolons (shell injection)', () => {
        expect(() => helpers.sanitiseContainerName('app; rm -rf /')).toThrow(/unsafe/i);
    });

    test('throws on backticks', () => {
        expect(() => helpers.sanitiseContainerName('app`whoami`')).toThrow(/unsafe/i);
    });

    test('throws on dollar signs', () => {
        expect(() => helpers.sanitiseContainerName('app$HOME')).toThrow(/unsafe/i);
    });

    test('throws on pipe characters', () => {
        expect(() => helpers.sanitiseContainerName('app | cat /etc/passwd')).toThrow(/unsafe/i);
    });

    test('throws on empty string', () => {
        expect(() => helpers.sanitiseContainerName('')).toThrow(/unsafe/i);
    });
});

describe('sanitiseInt', () => {
    test('valid positive integer passes through as string', () => {
        expect(helpers.sanitiseInt('50')).toBe('50');
        expect(helpers.sanitiseInt('1000')).toBe('1000');
        expect(helpers.sanitiseInt(200)).toBe('200');
    });

    test('zero returns fallback', () => {
        expect(helpers.sanitiseInt('0')).toBe('100');
        expect(helpers.sanitiseInt('0', '50')).toBe('50');
    });

    test('negative returns fallback', () => {
        expect(helpers.sanitiseInt('-5')).toBe('100');
    });

    test('non-numeric returns fallback', () => {
        expect(helpers.sanitiseInt('abc')).toBe('100');
        expect(helpers.sanitiseInt(NaN)).toBe('100');
    });

    test('custom fallback is used', () => {
        expect(helpers.sanitiseInt('bad', '999')).toBe('999');
    });

    test('float is floored to integer', () => {
        expect(helpers.sanitiseInt('3.7')).toBe('3');
    });
});

describe('readShipletConfig', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns {} for non-existent directory', () => {
        expect(helpers.readShipletConfig('/absolutely/nonexistent/path')).toEqual({});
    });

    test('returns {} when shiplet.config.json missing', () => {
        expect(helpers.readShipletConfig(tmpDir)).toEqual({});
    });

    test('parses valid shiplet.config.json', () => {
        const cfg = { runtime: 'docker', appName: 'test', port: 3000 };
        fs.writeFileSync(path.join(tmpDir, 'shiplet.config.json'), JSON.stringify(cfg));
        expect(helpers.readShipletConfig(tmpDir)).toEqual(cfg);
    });

    test('returns {} for malformed JSON', () => {
        fs.writeFileSync(path.join(tmpDir, 'shiplet.config.json'), '{ not: valid json');
        expect(helpers.readShipletConfig(tmpDir)).toEqual({});
    });
});

describe('writeShipletConfig', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-write-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('creates shiplet.config.json when absent', () => {
        helpers.writeShipletConfig(tmpDir, { runtime: 'docker' });
        const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'shiplet.config.json'), 'utf8'));
        expect(written.runtime).toBe('docker');
    });

    test('merges into existing config without losing old keys', () => {
        fs.writeFileSync(path.join(tmpDir, 'shiplet.config.json'), JSON.stringify({ appName: 'myapp', port: 3000 }));
        helpers.writeShipletConfig(tmpDir, { runtime: 'podman' });
        const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'shiplet.config.json'), 'utf8'));
        expect(written.appName).toBe('myapp');
        expect(written.port).toBe(3000);
        expect(written.runtime).toBe('podman');
    });

    test('new key overwrites old key', () => {
        fs.writeFileSync(path.join(tmpDir, 'shiplet.config.json'), JSON.stringify({ runtime: 'docker' }));
        helpers.writeShipletConfig(tmpDir, { runtime: 'podman' });
        const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'shiplet.config.json'), 'utf8'));
        expect(written.runtime).toBe('podman');
    });
});

describe('resolveComposeFile', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-compose-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns null when no compose file exists', () => {
        expect(helpers.resolveComposeFile(tmpDir)).toBeNull();
    });

    test('returns null for null input', () => {
        expect(helpers.resolveComposeFile(null)).toBeNull();
    });

    test('prefers shiplet.yml over compose.yml', () => {
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), '');
        fs.writeFileSync(path.join(tmpDir, 'compose.yml'), '');
        expect(helpers.resolveComposeFile(tmpDir)).toBe(path.join(tmpDir, 'shiplet.yml'));
    });

    test('falls back to compose.yml when shiplet.yml absent', () => {
        fs.writeFileSync(path.join(tmpDir, 'compose.yml'), '');
        expect(helpers.resolveComposeFile(tmpDir)).toBe(path.join(tmpDir, 'compose.yml'));
    });

    test('falls back to docker-compose.yml as last resort', () => {
        fs.writeFileSync(path.join(tmpDir, 'docker-compose.yml'), '');
        expect(helpers.resolveComposeFile(tmpDir)).toBe(path.join(tmpDir, 'docker-compose.yml'));
    });
});

describe('findProjectRoot', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-root-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns null when no shiplet file found anywhere', () => {
        expect(helpers.findProjectRoot(os.tmpdir())).toBeNull();
    });

    test('finds root from exact directory with shiplet.yml', () => {
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), '');
        expect(helpers.findProjectRoot(tmpDir)).toBe(tmpDir);
    });

    test('finds root from subdirectory', () => {
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), '');
        const sub = path.join(tmpDir, 'src', 'components');
        fs.mkdirSync(sub, { recursive: true });
        expect(helpers.findProjectRoot(sub)).toBe(tmpDir);
    });

    test('finds root via shiplet.config.json', () => {
        fs.writeFileSync(path.join(tmpDir, 'shiplet.config.json'), '{}');
        expect(helpers.findProjectRoot(tmpDir)).toBe(tmpDir);
    });
});

describe('invalidateRuntimeCache', () => {
    test('is callable without error', () => {
        expect(() => helpers.invalidateRuntimeCache()).not.toThrow();
    });
});
