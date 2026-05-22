'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const vb = require('../../src/templates/vite-bun');

// ── detectViteTemplate ────────────────────────────────────────────────────────
describe('detectViteTemplate', () => {
    test('returns null when no vite dep', () => {
        expect(vb.detectViteTemplate({ dependencies: {}, devDependencies: {} })).toBeNull();
    });

    test('returns null for null input', () => {
        expect(vb.detectViteTemplate(null)).toBeNull();
    });

    test('detects react-ts via @vitejs/plugin-react + typescript', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5', '@vitejs/plugin-react': '4', 'typescript': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('react-ts');
    });

    test('detects react (no typescript)', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5', '@vitejs/plugin-react': '4' } };
        expect(vb.detectViteTemplate(pkg)).toBe('react');
    });

    test('detects react-swc-ts via @vitejs/plugin-react-swc + typescript', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5', '@vitejs/plugin-react-swc': '3', 'typescript': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('react-swc-ts');
    });

    test('detects react-swc without typescript', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5', '@vitejs/plugin-react-swc': '3' } };
        expect(vb.detectViteTemplate(pkg)).toBe('react-swc');
    });

    test('detects vue-ts via @vitejs/plugin-vue + typescript', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5', '@vitejs/plugin-vue': '5', 'typescript': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('vue-ts');
    });

    test('detects vue without typescript', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5', '@vitejs/plugin-vue': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('vue');
    });

    test('detects svelte-ts via vite-plugin-solid', () => {
        const pkg = { dependencies: { 'svelte': '4' }, devDependencies: { 'vite': '5', '@sveltejs/vite-plugin-svelte': '3', 'typescript': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('svelte-ts');
    });

    test('detects svelte without typescript', () => {
        const pkg = { dependencies: { 'svelte': '4' }, devDependencies: { 'vite': '5', '@sveltejs/vite-plugin-svelte': '3' } };
        expect(vb.detectViteTemplate(pkg)).toBe('svelte');
    });

    test('detects sveltekit via @sveltejs/kit', () => {
        const pkg = { devDependencies: { '@sveltejs/kit': '2', 'vite': '5' }, dependencies: {} };
        expect(vb.detectViteTemplate(pkg)).toBe('sveltekit');
    });

    test('detects solid-ts via vite-plugin-solid + typescript', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5', 'vite-plugin-solid': '1', 'typescript': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('solid-ts');
    });

    test('detects astro via astro dep', () => {
        const pkg = { dependencies: { 'astro': '4' }, devDependencies: {} };
        expect(vb.detectViteTemplate(pkg)).toBe('astro');
    });

    test('detects preact-ts via @preact/preset-vite + typescript', () => {
        const pkg = { dependencies: { 'preact': '10' }, devDependencies: { 'vite': '5', '@preact/preset-vite': '2', 'typescript': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('preact-ts');
    });

    test('detects qwik via @builder.io/qwik', () => {
        const pkg = { dependencies: { '@builder.io/qwik': '1' }, devDependencies: { 'vite': '5', 'typescript': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('qwik-ts');
    });

    test('detects vanilla-ts when only vite + typescript', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5', 'typescript': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('vanilla-ts');
    });

    test('detects vanilla when only vite, no typescript', () => {
        const pkg = { dependencies: {}, devDependencies: { 'vite': '5' } };
        expect(vb.detectViteTemplate(pkg)).toBe('vanilla');
    });

    test('detects via vite in scripts when not in deps', () => {
        const pkg = { dependencies: {}, devDependencies: {}, scripts: { dev: 'vite', build: 'vite build' } };
        // Has vite in scripts but no ts → vanilla
        expect(vb.detectViteTemplate(pkg)).toBe('vanilla');
    });
});

// ── detectBunTemplate ─────────────────────────────────────────────────────────
describe('detectBunTemplate', () => {
    test('returns null when no bun lockfile', () => {
        expect(vb.detectBunTemplate({ dependencies: {} }, ['package.json'])).toBeNull();
    });

    test('returns null for null pkg', () => {
        expect(vb.detectBunTemplate(null, ['bun.lockb'])).toBeNull();
    });

    test('detects bun-elysia from elysia dep', () => {
        const pkg = { dependencies: { 'elysia': '1' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['bun.lockb'])).toBe('bun-elysia');
    });

    test('detects bun-hono from hono dep', () => {
        const pkg = { dependencies: { 'hono': '4' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['bun.lockb'])).toBe('bun-hono');
    });

    test('detects bun-react from react dep', () => {
        const pkg = { dependencies: { 'react': '18', 'react-dom': '18' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['bun.lockb'])).toBe('bun-react');
    });

    test('falls back to bun-api for generic bun project', () => {
        const pkg = { dependencies: {}, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['bun.lockb'])).toBe('bun-api');
    });

    test('recognises bun.lock (v1.1+ format) as well as bun.lockb', () => {
        const pkg = { dependencies: { 'hono': '4' }, devDependencies: {} };
        expect(vb.detectBunTemplate(pkg, ['bun.lock'])).toBe('bun-hono');
    });
});

// ── VITE_TEMPLATES metadata ───────────────────────────────────────────────────
describe('VITE_TEMPLATES', () => {
    const ALL_VITE = ['react', 'react-ts', 'react-swc', 'react-swc-ts', 'vue', 'vue-ts',
        'svelte', 'svelte-ts', 'sveltekit', 'solid', 'solid-ts', 'preact', 'preact-ts',
        'qwik', 'qwik-ts', 'lit', 'lit-ts', 'vanilla', 'vanilla-ts', 'astro', 'remix', 'remix-ts'];

    test.each(ALL_VITE)('%s has required metadata', (tpl) => {
        const meta = vb.VITE_TEMPLATES[tpl];
        expect(meta).toBeDefined();
        expect(typeof meta.port).toBe('number');
        expect(meta.port).toBeGreaterThan(0);
        expect(typeof meta.label).toBe('string');
        expect(meta.label.length).toBeGreaterThan(0);
        expect(typeof meta.devCmd).toBe('string');
    });

    test('react variants all use port 5173', () => {
        ['react', 'react-ts', 'react-swc', 'react-swc-ts'].forEach(t => {
            expect(vb.VITE_TEMPLATES[t].port).toBe(5173);
        });
    });

    test('astro uses port 4321', () => {
        expect(vb.VITE_TEMPLATES['astro'].port).toBe(4321);
    });
});

// ── BUN_TEMPLATES metadata ────────────────────────────────────────────────────
describe('BUN_TEMPLATES', () => {
    const ALL_BUN = ['bun-blank', 'bun-api', 'bun-react', 'bun-hono', 'bun-elysia'];

    test.each(ALL_BUN)('%s has required metadata', (tpl) => {
        const meta = vb.BUN_TEMPLATES[tpl];
        expect(meta).toBeDefined();
        expect(typeof meta.port).toBe('number');
        expect(typeof meta.label).toBe('string');
        expect(typeof meta.devCmd).toBe('string');
    });

    test('all bun templates default to port 3000', () => {
        ALL_BUN.forEach(t => expect(vb.BUN_TEMPLATES[t].port).toBe(3000));
    });
});

// ── generateViteCompose ───────────────────────────────────────────────────────
describe('generateViteCompose', () => {
    const base = {
        appName: 'my-vite-app', template: 'react-ts', nodeVersion: '20',
        packageManager: 'npm', port: 5173, services: [], timezone: 'UTC', runtime: 'docker',
    };

    test('includes project name', () => {
        expect(vb.generateViteCompose(base)).toContain('name: my-vite-app');
    });

    test('includes Vite HMR environment variables', () => {
        const c = vb.generateViteCompose(base);
        expect(c).toContain('VITE_HMR_HOST');
        expect(c).toContain('VITE_HMR_PORT');
    });

    test('exposes correct port for react-ts (5173)', () => {
        expect(vb.generateViteCompose(base)).toContain(':5173');
    });

    test('exposes port 4321 for astro', () => {
        const c = vb.generateViteCompose({ ...base, template: 'astro', port: 4321 });
        expect(c).toContain(':4321');
    });

    test('includes node_modules volume', () => {
        expect(vb.generateViteCompose(base)).toContain('shiplet_node_modules');
    });

    test('includes npm run dev command for npm', () => {
        expect(vb.generateViteCompose(base)).toContain('npm run dev');
    });

    test('includes pnpm run dev command for pnpm', () => {
        const c = vb.generateViteCompose({ ...base, packageManager: 'pnpm' });
        expect(c).toContain('pnpm run dev');
    });

    test('includes yarn dev for yarn', () => {
        const c = vb.generateViteCompose({ ...base, packageManager: 'yarn' });
        expect(c).toContain('yarn dev');
    });

    test('adds postgres service when selected', () => {
        const c = vb.generateViteCompose({ ...base, services: ['postgres'] });
        expect(c).toContain('postgres:');
    });

    test('adds redis service when selected', () => {
        expect(vb.generateViteCompose({ ...base, services: ['redis'] })).toContain('redis:');
    });
});

// ── generateBunCompose ────────────────────────────────────────────────────────
describe('generateBunCompose', () => {
    const base = {
        appName: 'my-bun-app', template: 'bun-hono',
        port: 3000, services: [], timezone: 'UTC', runtime: 'podman',
    };

    test('includes project name', () => {
        expect(vb.generateBunCompose(base)).toContain('name: my-bun-app');
    });

    test('includes bun cache volume', () => {
        expect(vb.generateBunCompose(base)).toContain('shiplet_bun_cache');
    });

    test('uses bun run dev as default command', () => {
        expect(vb.generateBunCompose(base)).toContain('bun run dev');
    });

    test('exposes port 3000', () => {
        expect(vb.generateBunCompose(base)).toContain(':3000');
    });

    test('includes services when selected', () => {
        const c = vb.generateBunCompose({ ...base, services: ['redis', 'postgres'] });
        expect(c).toContain('redis:');
        expect(c).toContain('postgres:');
    });

    test('shiplet network is defined', () => {
        expect(vb.generateBunCompose(base)).toContain('networks:\n  shiplet:');
    });
});

// ── generateViteDockerfile ────────────────────────────────────────────────────
describe('generateViteDockerfile', () => {
    test('uses node base image', () => {
        const df = vb.generateViteDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'UTC', template: 'react-ts' });
        expect(df).toContain('FROM node:${NODE_VERSION}');
        expect(df).toContain('NODE_VERSION=20');
    });

    test('exposes Vite port 5173', () => {
        expect(vb.generateViteDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'UTC', template: 'react-ts' })).toContain('EXPOSE 5173');
    });

    test('exposes astro port 4321', () => {
        expect(vb.generateViteDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'UTC', template: 'astro' })).toContain('EXPOSE 4321');
    });

    test('sets up pnpm via corepack', () => {
        const df = vb.generateViteDockerfile({ nodeVersion: '20', packageManager: 'pnpm', timezone: 'UTC', template: 'react-ts' });
        expect(df).toContain('corepack enable');
        expect(df).toContain('pnpm');
    });

    test('sets up yarn via corepack', () => {
        const df = vb.generateViteDockerfile({ nodeVersion: '20', packageManager: 'yarn', timezone: 'UTC', template: 'vue-ts' });
        expect(df).toContain('corepack enable');
        expect(df).toContain('yarn');
    });

    test('includes CMD with vite --host 0.0.0.0', () => {
        const df = vb.generateViteDockerfile({ nodeVersion: '20', packageManager: 'npm', timezone: 'UTC', template: 'react-ts' });
        expect(df).toContain('0.0.0.0');
    });
});

// ── generateBunDockerfile ─────────────────────────────────────────────────────
describe('generateBunDockerfile', () => {
    test('uses oven/bun base image', () => {
        const df = vb.generateBunDockerfile({ timezone: 'UTC', template: 'bun-hono' });
        expect(df).toContain('FROM oven/bun:');
    });

    test('uses CMD bun run dev', () => {
        const df = vb.generateBunDockerfile({ timezone: 'UTC', template: 'bun-hono' });
        expect(df).toContain('CMD ["bun", "run", "dev"]');
    });

    test('uses BUN_VERSION build arg', () => {
        const df = vb.generateBunDockerfile({ timezone: 'UTC', template: 'bun-blank' });
        expect(df).toContain('ARG BUN_VERSION=latest');
    });

    test('sets WORKDIR', () => {
        expect(vb.generateBunDockerfile({ timezone: 'UTC', template: 'bun-api' })).toContain('WORKDIR /var/www/html');
    });
});

// ── generateViteEnv ───────────────────────────────────────────────────────────
describe('generateViteEnv', () => {
    const base = { appName: 'my-app', template: 'react-ts', port: 5173, timezone: 'UTC', services: [] };

    test('includes APP_PORT', () => {
        expect(vb.generateViteEnv(base)).toContain('APP_PORT=5173');
    });

    test('includes VITE_API_URL', () => {
        expect(vb.generateViteEnv(base)).toContain('VITE_API_URL=');
    });

    test('includes VITE_APP_NAME', () => {
        expect(vb.generateViteEnv(base)).toContain('VITE_APP_NAME=my-app');
    });

    test('adds redis env when selected', () => {
        expect(vb.generateViteEnv({ ...base, services: ['redis'] })).toContain('REDIS_URL=redis://');
    });

    test('adds postgres env when selected', () => {
        expect(vb.generateViteEnv({ ...base, services: ['postgres'] })).toContain('DATABASE_URL=postgresql://');
    });

    test('adds mongo env when selected', () => {
        expect(vb.generateViteEnv({ ...base, services: ['mongo'] })).toContain('MONGODB_URI=');
    });
});

// ── generateBunEnv ────────────────────────────────────────────────────────────
describe('generateBunEnv', () => {
    const base = { appName: 'my-bun', template: 'bun-hono', port: 3000, timezone: 'UTC', services: [] };

    test('includes APP_PORT', () => {
        expect(vb.generateBunEnv(base)).toContain('APP_PORT=3000');
    });

    test('includes NODE_ENV', () => {
        expect(vb.generateBunEnv(base)).toContain('NODE_ENV=development');
    });

    test('adds redis env when selected', () => {
        expect(vb.generateBunEnv({ ...base, services: ['redis'] })).toContain('REDIS_URL=redis://');
    });
});

// ── viteConfigHint ────────────────────────────────────────────────────────────
describe('viteConfigHint', () => {
    test('returns string for all Vite templates', () => {
        Object.keys(vb.VITE_TEMPLATES).forEach(tpl => {
            const hint = vb.viteConfigHint(tpl);
            expect(typeof hint).toBe('string');
            expect(hint.length).toBeGreaterThan(10);
        });
    });

    test('react hint includes 0.0.0.0 host binding', () => {
        expect(vb.viteConfigHint('react-ts')).toContain('0.0.0.0');
    });

    test('astro hint mentions astro.config', () => {
        expect(vb.viteConfigHint('astro')).toContain('astro.config');
    });

    test('sveltekit hint mentions svelte config', () => {
        const hint = vb.viteConfigHint('sveltekit');
        expect(hint.toLowerCase()).toContain('svelte');
    });

    test('hint includes usePolling for Docker volume compatibility', () => {
        expect(vb.viteConfigHint('react-ts')).toContain('usePolling');
    });

    test('hint includes HMR config', () => {
        expect(vb.viteConfigHint('vue-ts')).toContain('hmr');
    });
});

// ── Integration: file generation ──────────────────────────────────────────────
describe('Vite project file generation', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-vite-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    test('generates shiplet.yml with HMR vars for react-ts', () => {
        const answers = { appName: 'test', template: 'react-ts', nodeVersion: '20', packageManager: 'npm', port: 5173, services: [], timezone: 'UTC', runtime: 'docker' };
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), vb.generateViteCompose(answers));
        const content = fs.readFileSync(path.join(tmpDir, 'shiplet.yml'), 'utf8');
        expect(content).toContain('VITE_HMR_HOST');
        expect(content).toContain(':5173');
    });

    test('generates Dockerfile with correct node version', () => {
        const answers = { nodeVersion: '22', packageManager: 'pnpm', timezone: 'UTC', template: 'vue-ts' };
        const df = vb.generateViteDockerfile(answers);
        expect(df).toContain('NODE_VERSION=22');
        expect(df).toContain('pnpm');
    });

    test('generates .env with VITE_ prefixed vars', () => {
        const env = vb.generateViteEnv({ appName: 'myapp', template: 'react-ts', port: 5173, timezone: 'UTC', services: ['redis'] });
        expect(env).toContain('VITE_API_URL');
        expect(env).toContain('REDIS_URL');
    });
});

describe('Bun project file generation', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-bun-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    test('generates shiplet.yml with bun run dev command', () => {
        const answers = { appName: 'my-bun', template: 'bun-hono', port: 3000, services: [], timezone: 'UTC', runtime: 'docker' };
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), vb.generateBunCompose(answers));
        const content = fs.readFileSync(path.join(tmpDir, 'shiplet.yml'), 'utf8');
        expect(content).toContain('bun run dev');
        expect(content).toContain('name: my-bun');
        expect(content).toContain('shiplet_bun_cache');
    });

    test('generates Dockerfile using oven/bun base', () => {
        const df = vb.generateBunDockerfile({ timezone: 'UTC', template: 'bun-elysia' });
        expect(df).toContain('FROM oven/bun:${BUN_VERSION}');
        expect(df).toContain('"bun"');
        expect(df).toContain('"run"');
        expect(df).toContain('"dev"');
    });
});
