'use strict';

/**
 * Tests for the language and template auto-detection functions inside init.js.
 * We extract and test them directly (not via CLI spawning).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const vb = require('../../src/templates/vite-bun');

function makeTmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-detect-'));
}

function writeJson(dir, filename, obj) {
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(obj, null, 2));
}

function touch(dir, filename) {
    fs.writeFileSync(path.join(dir, filename), '');
}

// ── detectViteTemplate via package.json ───────────────────────────────────────
describe('detectViteTemplate — real package.json fixtures', () => {
    test('create-vite react-ts template', () => {
        const pkg = {
            name: 'my-app', version: '0.0.0',
            scripts: { dev: 'vite', build: 'tsc -b && vite build' },
            dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
            devDependencies: { '@vitejs/plugin-react-swc': '^3.5.0', typescript: '^5.5.3', vite: '^5.4.1' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('react-swc-ts');
    });

    test('create-vite vue-ts template', () => {
        const pkg = {
            scripts: { dev: 'vite' },
            dependencies: { vue: '^3.4.37' },
            devDependencies: { '@vitejs/plugin-vue': '^5.1.2', typescript: '^5.5.3', vite: '^5.4.1' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('vue-ts');
    });

    test('create-vite svelte template (no TypeScript)', () => {
        const pkg = {
            scripts: { dev: 'vite' },
            dependencies: { svelte: '^4.2.18' },
            devDependencies: { '@sveltejs/vite-plugin-svelte': '^3.1.1', vite: '^5.4.1' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('svelte');
    });

    test('SvelteKit template', () => {
        const pkg = {
            scripts: { dev: 'vite dev' },
            devDependencies: { '@sveltejs/kit': '^2.5.24', '@sveltejs/vite-plugin-svelte': '^3.1.1', vite: '^5.4.1' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('sveltekit');
    });

    test('Astro project', () => {
        const pkg = {
            scripts: { dev: 'astro dev', build: 'astro build' },
            dependencies: { astro: '^4.14.0' },
            devDependencies: {},
        };
        expect(vb.detectViteTemplate(pkg)).toBe('astro');
    });

    test('create-vite vanilla-ts template', () => {
        const pkg = {
            scripts: { dev: 'vite' },
            dependencies: {},
            devDependencies: { typescript: '^5.5.3', vite: '^5.4.1' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('vanilla-ts');
    });

    test('create-vite vanilla (no ts)', () => {
        const pkg = {
            scripts: { dev: 'vite' },
            dependencies: {},
            devDependencies: { vite: '^5.4.1' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('vanilla');
    });

    test('Solid + TypeScript template', () => {
        const pkg = {
            scripts: { dev: 'vite' },
            dependencies: { 'solid-js': '^1.8.22' },
            devDependencies: { 'vite-plugin-solid': '^2.10.2', typescript: '^5.0.0', vite: '^5.0.0' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('solid-ts');
    });

    test('Preact + TypeScript template', () => {
        const pkg = {
            scripts: { dev: 'vite' },
            dependencies: { preact: '^10.23.1' },
            devDependencies: { '@preact/preset-vite': '^2.8.1', typescript: '^5.0.0', vite: '^5.0.0' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('preact-ts');
    });

    test('Lit + TypeScript template', () => {
        const pkg = {
            scripts: { dev: 'vite' },
            dependencies: { lit: '^3.2.0' },
            devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
        };
        expect(vb.detectViteTemplate(pkg)).toBe('lit-ts');
    });

    test('Express app is not Vite', () => {
        const pkg = {
            scripts: { start: 'node index.js' },
            dependencies: { express: '^4.18.0' },
            devDependencies: {},
        };
        expect(vb.detectViteTemplate(pkg)).toBeNull();
    });

    test('NestJS project is not Vite', () => {
        const pkg = {
            dependencies: { '@nestjs/core': '^10.0.0' },
            devDependencies: {},
        };
        expect(vb.detectViteTemplate(pkg)).toBeNull();
    });
});

// ── detectBunTemplate — real lockfile fixtures ────────────────────────────────
describe('detectBunTemplate — lockfile + package.json', () => {
    test('ElysiaJS project with bun.lockb', () => {
        const pkg = { dependencies: { elysia: '^1.0.0' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['package.json', 'bun.lockb', 'src'])).toBe('bun-elysia');
    });

    test('Hono project with bun.lockb', () => {
        const pkg = { dependencies: { hono: '^4.5.0' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['bun.lockb'])).toBe('bun-hono');
    });

    test('React + Bun project', () => {
        const pkg = { dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['bun.lockb'])).toBe('bun-react');
    });

    test('plain Bun project (no framework deps)', () => {
        const pkg = { dependencies: {}, devDependencies: { '@types/bun': 'latest' } };
        expect(vb.detectBunTemplate(pkg, ['bun.lockb', 'index.ts'])).toBe('bun-api');
    });

    test('project with pnpm-lock.yaml is not Bun', () => {
        const pkg = { dependencies: { hono: '^4.5.0' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['package.json', 'pnpm-lock.yaml'])).toBeNull();
    });

    test('project with yarn.lock is not Bun', () => {
        const pkg = { dependencies: { hono: '^4.5.0' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['yarn.lock'])).toBeNull();
    });

    test('bun.lock (v1.1+) format works', () => {
        const pkg = { dependencies: { elysia: '^1.0.0' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['bun.lock'])).toBe('bun-elysia');
    });
});

// ── Full Vite project file generation ────────────────────────────────────────
describe('Vite full project generation', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-vite-gen-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    const viteAnswers = {
        appName: 'my-vite', template: 'react-swc-ts', nodeVersion: '22',
        packageManager: 'pnpm', port: 5173,
        services: ['redis', 'postgres'], timezone: 'UTC', runtime: 'docker',
    };

    test('generates shiplet.yml with all required sections', () => {
        const compose = vb.generateViteCompose(viteAnswers);
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), compose);
        const c = fs.readFileSync(path.join(tmpDir, 'shiplet.yml'), 'utf8');
        expect(c).toContain('name: my-vite');
        expect(c).toContain('VITE_HMR_HOST');
        expect(c).toContain('VITE_HMR_PORT');
        expect(c).toContain(':5173');
        expect(c).toContain('pnpm run dev');
        expect(c).toContain('shiplet_node_modules');
        expect(c).toContain('redis:');
        expect(c).toContain('postgres:');
    });

    test('generates Dockerfile with correct node version and pnpm', () => {
        const df = vb.generateViteDockerfile(viteAnswers);
        expect(df).toContain('NODE_VERSION=22');
        expect(df).toContain('corepack enable');
        expect(df).toContain('pnpm');
        expect(df).toContain('EXPOSE 5173');
        expect(df).toContain('0.0.0.0');
    });

    test('generates .env with VITE_ prefixed vars and service vars', () => {
        const env = vb.generateViteEnv(viteAnswers);
        expect(env).toContain('APP_PORT=5173');
        expect(env).toContain('VITE_API_URL=');
        expect(env).toContain('VITE_APP_NAME=my-vite');
        expect(env).toContain('REDIS_URL=redis://redis:6379');
        expect(env).toContain('DATABASE_URL=postgresql://');
    });

    test('viteConfigHint returns server config with usePolling', () => {
        const hint = vb.viteConfigHint('react-swc-ts');
        expect(hint).toContain('usePolling');
        expect(hint).toContain('0.0.0.0');
        expect(hint).toContain('hmr');
    });

    test('astro compose uses port 4321', () => {
        const c = vb.generateViteCompose({ ...viteAnswers, template: 'astro', port: 4321 });
        expect(c).toContain(':4321');
        expect(c).toContain('4321');
    });

    test('vue-ts compose uses yarn dev for yarn PM', () => {
        const c = vb.generateViteCompose({ ...viteAnswers, template: 'vue-ts', packageManager: 'yarn' });
        expect(c).toContain('yarn dev');
    });
});

// ── Full Bun project file generation ─────────────────────────────────────────
describe('Bun full project generation', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-bun-gen-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    const bunAnswers = {
        appName: 'my-hono', template: 'bun-hono',
        port: 3000, services: ['redis'], timezone: 'UTC', runtime: 'podman',
    };

    test('generates shiplet.yml with bun cache volume', () => {
        const compose = vb.generateBunCompose(bunAnswers);
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), compose);
        const c = fs.readFileSync(path.join(tmpDir, 'shiplet.yml'), 'utf8');
        expect(c).toContain('name: my-hono');
        expect(c).toContain('shiplet_bun_cache');
        expect(c).toContain('bun run dev');
        expect(c).toContain(':3000');
        expect(c).toContain('redis:');
    });

    test('generates Dockerfile with oven/bun base and BUN_VERSION arg', () => {
        const df = vb.generateBunDockerfile(bunAnswers);
        expect(df).toContain('FROM oven/bun:');
        expect(df).toContain('ARG BUN_VERSION=latest');
        expect(df).toContain('CMD ["bun", "run", "dev"]');
        expect(df).toContain('WORKDIR /var/www/html');
    });

    test('generates .env with NODE_ENV and Redis', () => {
        const env = vb.generateBunEnv(bunAnswers);
        expect(env).toContain('APP_PORT=3000');
        expect(env).toContain('NODE_ENV=development');
        expect(env).toContain('REDIS_URL=redis://redis:6379');
    });

    test('elysia template also generates correctly', () => {
        const c = vb.generateBunCompose({ ...bunAnswers, template: 'bun-elysia', appName: 'my-elysia' });
        expect(c).toContain('name: my-elysia');
        expect(c).toContain('bun run dev');
    });
});

// ── VITE_TEMPLATES exhaustive check ──────────────────────────────────────────
describe('VITE_TEMPLATES — all templates generate valid compose', () => {
    const TEMPLATES = Object.keys(vb.VITE_TEMPLATES);

    test.each(TEMPLATES)('%s generates valid compose.yml', (tpl) => {
        const meta = vb.VITE_TEMPLATES[tpl];
        const answers = {
            appName: 'test-app', template: tpl, nodeVersion: '20',
            packageManager: 'npm', port: meta.port,
            services: [], timezone: 'UTC', runtime: 'docker',
        };
        const compose = vb.generateViteCompose(answers);
        expect(compose).toContain('name: test-app');
        expect(compose).toContain('VITE_HMR_HOST');
        expect(compose).toContain(`${meta.port}`);
        expect(compose).toContain('networks:\n  shiplet:');
    });

    test.each(TEMPLATES)('%s generates valid Dockerfile', (tpl) => {
        const df = vb.generateViteDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'UTC', template: tpl });
        expect(df).toContain('FROM node:');
        expect(df).toContain('WORKDIR /var/www/html');
    });
});

// ── BUN_TEMPLATES exhaustive check ────────────────────────────────────────────
describe('BUN_TEMPLATES — all templates generate valid compose', () => {
    const TEMPLATES = Object.keys(vb.BUN_TEMPLATES);

    test.each(TEMPLATES)('%s generates valid compose.yml', (tpl) => {
        const answers = {
            appName: 'test-bun', template: tpl,
            port: 3000, services: [], timezone: 'UTC', runtime: 'docker',
        };
        const compose = vb.generateBunCompose(answers);
        expect(compose).toContain('name: test-bun');
        expect(compose).toContain('shiplet_bun_cache');
        expect(compose).toContain('bun run dev');
    });

    test.each(TEMPLATES)('%s generates valid Dockerfile', (tpl) => {
        const df = vb.generateBunDockerfile({ timezone: 'UTC', template: tpl });
        expect(df).toContain('FROM oven/bun:');
        expect(df).toContain('CMD ["bun", "run", "dev"]');
    });
});
