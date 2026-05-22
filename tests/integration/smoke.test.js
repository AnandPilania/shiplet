'use strict';

/**
 * Smoke tests — validates the entire package structure:
 * - All commands load without error
 * - All public exports exist in index.js
 * - helpers exports all expected functions
 * - All template generators are callable
 * - CLI version matches package.json
 * - Vite + Bun templates are in index exports
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

describe('Package structure', () => {
    test('package.json is valid JSON', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
        expect(pkg.name).toBe('shiplet');
        expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
        expect(pkg.bin.shiplet).toBeTruthy();
        expect(pkg.bin['shiplet']).toBeTruthy();
        expect(pkg.main).toBe('src/index.js');
    });

    test('README.md exists and covers all major sections', () => {
        const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
        const requiredSections = [
            'Quick Start', 'Installation', 'Vite', 'Bun',
            'PHP', 'Docker', 'Podman', 'Release', 'Dashboard',
        ];
        requiredSections.forEach(s => {
            expect(readme).toContain(s);
        });
    });

    test('all example projects have shiplet.yml and shiplet.config.json', () => {
        const examples = fs.readdirSync(path.join(ROOT, 'examples'))
            .filter(d => fs.statSync(path.join(ROOT, 'examples', d)).isDirectory());

        expect(examples.length).toBeGreaterThanOrEqual(5);

        examples.forEach(ex => {
            const dir = path.join(ROOT, 'examples', ex);
            expect(fs.existsSync(path.join(dir, 'shiplet.yml'))).toBe(true);
            expect(fs.existsSync(path.join(dir, 'shiplet.config.json'))).toBe(true);
        });
    });

    test('all example shiplet.config.json files are valid JSON with required fields', () => {
        const examples = fs.readdirSync(path.join(ROOT, 'examples'))
            .filter(d => fs.statSync(path.join(ROOT, 'examples', d)).isDirectory());

        examples.forEach(ex => {
            const cfg = JSON.parse(
                fs.readFileSync(path.join(ROOT, 'examples', ex, 'shiplet.config.json'), 'utf8')
            );
            expect(cfg.language).toMatch(/^(node|php|vite|bun)$/);
            expect(cfg.runtime).toMatch(/^(docker|podman)$/);
            expect(typeof cfg.appName).toBe('string');
            expect(typeof cfg.port).toBe('number');
        });
    });
});

describe('Command modules', () => {
    const commandsDir = path.join(ROOT, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsDir)
        .filter(f => f.endsWith('.js'))
        .map(f => f.replace('.js', ''));

    test.each(commandFiles)('%s loads without error', (name) => {
        expect(() => require(path.join(commandsDir, name + '.js'))).not.toThrow();
    });

    test('all command files export a function or object', () => {
        commandFiles.forEach(name => {
            const mod = require(path.join(commandsDir, name + '.js'));
            expect(typeof mod === 'function' || typeof mod === 'object').toBe(true);
            expect(mod).not.toBeNull();
        });
    });
});

describe('index.js exports', () => {
    const idx = require('../../src/index.js');

    test('exports commands, helpers, templates', () => {
        expect(typeof idx.commands).toBe('object');
        expect(typeof idx.helpers).toBe('object');
        expect(typeof idx.templates).toBe('object');
    });

    test('viteBunTemplates is exported in commands', () => {
        expect(idx.commands.viteBunTemplates).toBeDefined();
        expect(typeof idx.commands.viteBunTemplates.generateViteCompose).toBe('function');
        expect(typeof idx.commands.viteBunTemplates.generateBunCompose).toBe('function');
    });

    test('PHP commands are exported', () => {
        expect(typeof idx.commands.composer).toBe('function');
        expect(typeof idx.commands.php).toBe('object'); // exports { phpCommand, artisanCommand, ... }
    });

    test('Bun command is exported', () => {
        expect(typeof idx.commands.bun).toBe('function');
    });

    test('all core commands are exported', () => {
        const required = [
            'init', 'up', 'down', 'build', 'exec', 'shell', 'logs', 'status',
            'test', 'lint', 'db', 'share', 'add', 'env', 'release',
            'runtime', 'health', 'prune', 'doctor', 'dashboard', 'snapshot',
            'cp', 'port', 'top', 'scale',
        ];
        required.forEach(cmd => {
            expect(idx.commands[cmd]).toBeDefined();
        });
    });
});

describe('helpers exports', () => {
    const h = require('../../src/utils/helpers');

    const requiredFns = [
        'detectRuntime', 'invalidateRuntimeCache', 'getComposeCmd',
        'assertRuntime', 'findProjectRoot', 'resolveComposeFile',
        'readShipletConfig', 'writeShipletConfig', 'runCompose',
        'getRunningServices', 'sanitiseContainerName', 'sanitiseInt',
        'header', 'success', 'info', 'warn', 'error', 'printRuntimeBadge',
    ];

    test.each(requiredFns)('%s is a function', (name) => {
        expect(typeof h[name]).toBe('function');
    });
});

describe('templates exports', () => {
    const t = require('../../src/templates/index.js');
    const pt = require('../../src/templates/php/index.js');
    const vt = require('../../src/templates/vite-bun/index.js');

    test('Node templates export all required generators', () => {
        ['generateCompose', 'generateDockerfile', 'generateEnvAdditions', 'serviceSnippet']
            .forEach(fn => expect(typeof t[fn]).toBe('function'));
    });

    test('PHP templates export all required generators', () => {
        ['generatePhpCompose', 'generatePhpDockerfile', 'generatePhpEnvAdditions',
            'generateNginxConf', 'generatePhpIni', 'generateSupervisorConf', 'phpShipletConfig']
            .forEach(fn => expect(typeof pt[fn]).toBe('function'));
    });

    test('Vite/Bun templates export all required generators', () => {
        ['detectViteTemplate', 'detectBunTemplate',
            'generateViteCompose', 'generateBunCompose',
            'generateViteDockerfile', 'generateBunDockerfile',
            'generateViteEnv', 'generateBunEnv', 'viteConfigHint']
            .forEach(fn => expect(typeof vt[fn]).toBe('function'));
    });

    test('VITE_TEMPLATES has at least 15 entries', () => {
        expect(Object.keys(vt.VITE_TEMPLATES).length).toBeGreaterThanOrEqual(15);
    });

    test('BUN_TEMPLATES has at least 4 entries', () => {
        expect(Object.keys(vt.BUN_TEMPLATES).length).toBeGreaterThanOrEqual(4);
    });
});

describe('UI server', () => {
    test('createServer is exported as a function', () => {
        const srv = require('../../src/ui/server.js');
        expect(typeof srv.createServer).toBe('function');
    });
});

describe('CLI version', () => {
    test('package.json version matches semantic versioning', () => {
        const pkg = require('../../package.json');
        expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
    });

    test('cli.js references package version', () => {
        const cli = fs.readFileSync(path.join(ROOT, 'src', 'cli.js'), 'utf8');
        expect(cli).toContain("require('../package.json')");
    });
});

describe('Examples', () => {
    const examplesDir = path.join(ROOT, 'examples');
    const examples = fs.readdirSync(examplesDir)
        .filter(d => fs.statSync(path.join(examplesDir, d)).isDirectory());

    test.each(examples)('%s has a README.md', (ex) => {
        expect(fs.existsSync(path.join(examplesDir, ex, 'README.md'))).toBe(true);
    });

    test.each(examples)('%s has a .shiplet/Dockerfile', (ex) => {
        expect(fs.existsSync(path.join(examplesDir, ex, '.shiplet', 'Dockerfile'))).toBe(true);
    });

    test.each(examples)('%s has a .env file', (ex) => {
        expect(fs.existsSync(path.join(examplesDir, ex, '.env'))).toBe(true);
    });

    test('react-vite-ts example has vite.config.ts', () => {
        expect(fs.existsSync(path.join(examplesDir, 'react-vite-ts', 'vite.config.ts'))).toBe(true);
    });

    test('react-vite-ts vite.config.ts contains usePolling', () => {
        const cfg = fs.readFileSync(path.join(examplesDir, 'react-vite-ts', 'vite.config.ts'), 'utf8');
        expect(cfg).toContain('usePolling');
        expect(cfg).toContain('0.0.0.0');
        expect(cfg).toContain('hmr');
    });

    test('laravel-docker has supervisor config', () => {
        expect(fs.existsSync(path.join(examplesDir, 'laravel-docker', '.shiplet', 'supervisor', 'supervisord.conf'))).toBe(true);
    });

    test('laravel-docker supervisor config has queue:work', () => {
        const conf = fs.readFileSync(path.join(examplesDir, 'laravel-docker', '.shiplet', 'supervisor', 'supervisord.conf'), 'utf8');
        expect(conf).toContain('queue:work');
        expect(conf).toContain('schedule:work');
    });
});
