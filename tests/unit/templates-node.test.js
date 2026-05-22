'use strict';

const templates = require('../../src/templates');

// ── generateCompose ───────────────────────────────────────────────────────────
describe('generateCompose', () => {
    const base = {
        appName: 'test-app', nodeVersion: '20', packageManager: 'npm',
        port: 3000, services: [], timezone: 'UTC', runtime: 'docker',
    };

    test('includes project name', () => {
        expect(templates.generateCompose(base)).toContain('name: test-app');
    });

    test('sanitises app name to kebab-case', () => {
        const result = templates.generateCompose({ ...base, appName: 'My App 2!' });
        expect(result).toContain('name: my-app-2-');
    });

    test('includes NODE_VERSION build arg', () => {
        expect(templates.generateCompose({ ...base, nodeVersion: '22' })).toContain('"22"');
    });

    test('includes PACKAGE_MANAGER build arg', () => {
        expect(templates.generateCompose({ ...base, packageManager: 'pnpm' })).toContain('"pnpm"');
    });

    test('includes app port mapping', () => {
        const r4k = templates.generateCompose({ ...base, port: 4000 });
        expect(r4k).toContain(':4000');
        expect(r4k).toContain('APP_PORT:-4000');
    });

    test('adds postgres service when selected', () => {
        const result = templates.generateCompose({ ...base, services: ['postgres'] });
        expect(result).toContain('postgres:');
        expect(result).toContain('postgres_data:');
    });

    test('adds redis service when selected', () => {
        expect(templates.generateCompose({ ...base, services: ['redis'] })).toContain('redis:');
    });

    test('adds mongo service when selected', () => {
        expect(templates.generateCompose({ ...base, services: ['mongo'] })).toContain('mongo:');
    });

    test('adds mailpit service when selected', () => {
        expect(templates.generateCompose({ ...base, services: ['mailpit'] })).toContain('mailpit:');
    });

    test('adds minio service when selected', () => {
        const result = templates.generateCompose({ ...base, services: ['minio'] });
        expect(result).toContain('minio:');
        expect(result).toContain('minio_data:');
    });

    test('multiple services all appear', () => {
        const result = templates.generateCompose({ ...base, services: ['postgres', 'redis', 'mailpit'] });
        expect(result).toContain('postgres:');
        expect(result).toContain('redis:');
        expect(result).toContain('mailpit:');
    });

    test('depends_on includes selected services', () => {
        const result = templates.generateCompose({ ...base, services: ['postgres', 'redis'] });
        expect(result).toContain('depends_on:');
        expect(result).toContain('- postgres');
        expect(result).toContain('- redis');
    });

    test('no depends_on when no services', () => {
        const result = templates.generateCompose(base);
        expect(result).not.toContain('depends_on:');
    });

    test('includes shiplet network definition', () => {
        expect(templates.generateCompose(base)).toContain('networks:\n  shiplet:');
    });

    test('includes node_modules volume', () => {
        expect(templates.generateCompose(base)).toContain('shiplet_node_modules:');
    });
});

// ── generateDockerfile ────────────────────────────────────────────────────────
describe('generateDockerfile', () => {
    test('uses correct node base image', () => {
        const df = templates.generateDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'UTC' });
        expect(df).toContain('node:${NODE_VERSION}');
        expect(df).toContain('NODE_VERSION=20');
    });

    test('sets up npm (default — no corepack)', () => {
        const df = templates.generateDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'UTC' });
        expect(df).not.toContain('pnpm');
        expect(df).not.toContain('yarn');
    });

    test('sets up yarn via corepack', () => {
        const df = templates.generateDockerfile({ nodeVersion: '20', packageManager: 'yarn', timezone: 'UTC' });
        expect(df).toContain('corepack enable');
        expect(df).toContain('yarn');
    });

    test('sets up pnpm via corepack', () => {
        const df = templates.generateDockerfile({ nodeVersion: '22', packageManager: 'pnpm', timezone: 'UTC' });
        expect(df).toContain('corepack enable');
        expect(df).toContain('pnpm');
    });

    test('includes timezone setup', () => {
        const df = templates.generateDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'Asia/Kolkata' });
        expect(df).toContain('TZ=');
    });

    test('sets WORKDIR', () => {
        const df = templates.generateDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'UTC' });
        expect(df).toContain('WORKDIR /var/www/html');
    });
});

// ── generateEnvAdditions ──────────────────────────────────────────────────────
describe('generateEnvAdditions', () => {
    const base = { port: 3000, timezone: 'UTC', services: [] };

    test('always includes APP_PORT', () => {
        expect(templates.generateEnvAdditions(base)).toContain('APP_PORT=3000');
    });

    test('always includes NODE_ENV', () => {
        expect(templates.generateEnvAdditions(base)).toContain('NODE_ENV=development');
    });

    test('always includes TZ', () => {
        expect(templates.generateEnvAdditions({ ...base, timezone: 'Europe/London' })).toContain('TZ=Europe/London');
    });

    test('postgres block added when selected', () => {
        const env = templates.generateEnvAdditions({ ...base, services: ['postgres'] });
        expect(env).toContain('POSTGRES_USER=shiplet');
        expect(env).toContain('DATABASE_URL=postgresql://');
    });

    test('mysql block added when selected', () => {
        const env = templates.generateEnvAdditions({ ...base, services: ['mysql'] });
        expect(env).toContain('MYSQL_ROOT_PASSWORD=secret');
        expect(env).toContain('DATABASE_URL=mysql://');
    });

    test('redis block added when selected', () => {
        expect(templates.generateEnvAdditions({ ...base, services: ['redis'] })).toContain('REDIS_URL=redis://redis:6379');
    });

    test('mongo block added when selected', () => {
        expect(templates.generateEnvAdditions({ ...base, services: ['mongo'] })).toContain('MONGODB_URI=mongodb://');
    });

    test('minio block added when selected', () => {
        const env = templates.generateEnvAdditions({ ...base, services: ['minio'] });
        expect(env).toContain('MINIO_ROOT_USER=shiplet');
        expect(env).toContain('S3_ENDPOINT=http://minio:9000');
    });

    test('no service blocks when services array empty', () => {
        const env = templates.generateEnvAdditions(base);
        expect(env).not.toContain('POSTGRES_USER');
        expect(env).not.toContain('MYSQL_ROOT_PASSWORD');
        expect(env).not.toContain('REDIS_URL');
    });
});

// ── serviceSnippet ────────────────────────────────────────────────────────────
describe('serviceSnippet', () => {
    const ALL_SERVICES = ['postgres', 'mysql', 'mongo', 'redis', 'mailpit', 'minio', 'elasticsearch', 'adminer'];

    test.each(ALL_SERVICES)('%s returns a non-empty string with image:', (svc) => {
        const snippet = templates.serviceSnippet(svc);
        expect(typeof snippet).toBe('string');
        expect(snippet.length).toBeGreaterThan(0);
        expect(snippet).toContain('image:');
    });

    test('postgres snippet has healthcheck', () => {
        expect(templates.serviceSnippet('postgres')).toContain('healthcheck:');
    });

    test('redis snippet has healthcheck', () => {
        expect(templates.serviceSnippet('redis')).toContain('healthcheck:');
    });

    test('mysql snippet has healthcheck', () => {
        expect(templates.serviceSnippet('mysql')).toContain('healthcheck:');
    });

    test('unknown service returns null', () => {
        expect(templates.serviceSnippet('unknown-xyz')).toBeNull();
        expect(templates.serviceSnippet('')).toBeNull();
        expect(templates.serviceSnippet(null)).toBeNull();
    });
});
