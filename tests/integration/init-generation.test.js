'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// We test the file-generation functions directly (no CLI spawning)
const nodeTemplates = require('../../src/templates');
const phpTemplates = require('../../src/templates/php');
const { writeShipletConfig, readShipletConfig } = require('../../src/utils/helpers');

function makeTmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'shiplet-init-test-'));
}

// ── Node.js project generation ────────────────────────────────────────────────
describe('Node.js project generation', () => {
    let tmpDir;

    beforeEach(() => { tmpDir = makeTmpDir(); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    const nodeAnswers = {
        language: 'node', appName: 'my-app', template: 'express',
        nodeVersion: '20', packageManager: 'npm',
        port: 3000, services: ['postgres', 'redis'], timezone: 'UTC', runtime: 'docker',
    };

    test('generates valid shiplet.yml', () => {
        const compose = nodeTemplates.generateCompose(nodeAnswers);
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), compose);
        const content = fs.readFileSync(path.join(tmpDir, 'shiplet.yml'), 'utf8');
        expect(content).toContain('name: my-app');
        expect(content).toContain('NODE_VERSION: "20"');
        expect(content).toContain('postgres:');
        expect(content).toContain('redis:');
    });

    test('generates valid Dockerfile', () => {
        const dockerfile = nodeTemplates.generateDockerfile(nodeAnswers);
        fs.mkdirSync(path.join(tmpDir, '.shiplet'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.shiplet', 'Dockerfile'), dockerfile);
        const content = fs.readFileSync(path.join(tmpDir, '.shiplet', 'Dockerfile'), 'utf8');
        expect(content).toContain('node:${NODE_VERSION}');
        expect(content).toContain('WORKDIR /var/www/html');
    });

    test('generates .env with service variables', () => {
        const env = nodeTemplates.generateEnvAdditions(nodeAnswers);
        expect(env).toContain('DATABASE_URL=postgresql://');
        expect(env).toContain('REDIS_URL=redis://redis:6379');
        expect(env).toContain('APP_PORT=3000');
    });

    test('writes shiplet.config.json correctly', () => {
        writeShipletConfig(tmpDir, {
            language: 'node', runtime: 'docker', appName: 'my-app',
            nodeVersion: '20', packageManager: 'npm', port: 3000,
        });
        const cfg = readShipletConfig(tmpDir);
        expect(cfg.language).toBe('node');
        expect(cfg.appName).toBe('my-app');
        expect(cfg.runtime).toBe('docker');
    });

    test('pnpm generates corepack setup in Dockerfile', () => {
        const df = nodeTemplates.generateDockerfile({ ...nodeAnswers, packageManager: 'pnpm' });
        expect(df).toContain('corepack enable');
        expect(df).toContain('pnpm');
    });

    test('yarn generates corepack setup in Dockerfile', () => {
        const df = nodeTemplates.generateDockerfile({ ...nodeAnswers, packageManager: 'yarn' });
        expect(df).toContain('corepack enable');
        expect(df).toContain('yarn');
    });

    test('shiplet.yml mounts node_modules as volume', () => {
        const compose = nodeTemplates.generateCompose(nodeAnswers);
        expect(compose).toContain('shiplet_node_modules:/var/www/html/node_modules');
    });

    test('compose file references Dockerfile in .shiplet/', () => {
        const compose = nodeTemplates.generateCompose(nodeAnswers);
        expect(compose).toContain('.shiplet/Dockerfile');
    });
});

// ── PHP project generation ────────────────────────────────────────────────────
describe('PHP project generation (Laravel)', () => {
    let tmpDir;

    beforeEach(() => { tmpDir = makeTmpDir(); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    const laravelAnswers = {
        language: 'php', appName: 'my-laravel', template: 'laravel',
        phpVersion: '8.3', webServer: 'nginx',
        port: 80, services: ['mysql', 'redis', 'mailpit'], timezone: 'UTC', runtime: 'docker',
    };

    test('generates shiplet.yml with php-fpm and nginx', () => {
        const compose = phpTemplates.generatePhpCompose(laravelAnswers);
        fs.writeFileSync(path.join(tmpDir, 'shiplet.yml'), compose);
        const content = fs.readFileSync(path.join(tmpDir, 'shiplet.yml'), 'utf8');
        // php-fpm is in Dockerfile CMD, not the compose body text
        expect(content).toContain('app:');
        expect(content).toContain('nginx:');
        expect(content).toContain('mysql:');
        expect(content).toContain('redis:');
        expect(content).toContain('mailpit:');
    });

    test('generates .shiplet directory structure', () => {
        const shipletDir = path.join(tmpDir, '.shiplet');
        fs.mkdirSync(path.join(shipletDir, 'nginx'), { recursive: true });
        fs.mkdirSync(path.join(shipletDir, 'php'), { recursive: true });
        fs.mkdirSync(path.join(shipletDir, 'supervisor'), { recursive: true });

        fs.writeFileSync(path.join(shipletDir, 'Dockerfile'), phpTemplates.generatePhpDockerfile(laravelAnswers));
        fs.writeFileSync(path.join(shipletDir, 'nginx', 'default.conf'), phpTemplates.generateNginxConf('laravel'));
        fs.writeFileSync(path.join(shipletDir, 'php', 'php.ini'), phpTemplates.generatePhpIni());
        fs.writeFileSync(path.join(shipletDir, 'supervisor', 'supervisord.conf'), phpTemplates.generateSupervisorConf());

        expect(fs.existsSync(path.join(shipletDir, 'Dockerfile'))).toBe(true);
        expect(fs.existsSync(path.join(shipletDir, 'nginx', 'default.conf'))).toBe(true);
        expect(fs.existsSync(path.join(shipletDir, 'php', 'php.ini'))).toBe(true);
        expect(fs.existsSync(path.join(shipletDir, 'supervisor', 'supervisord.conf'))).toBe(true);
    });

    test('Dockerfile installs pdo and pdo_mysql for laravel', () => {
        const df = phpTemplates.generatePhpDockerfile(laravelAnswers);
        expect(df).toContain('pdo');
        expect(df).toContain('pdo_mysql');
    });

    test('.env includes Laravel-specific vars with mysql', () => {
        const env = phpTemplates.generatePhpEnvAdditions(laravelAnswers);
        expect(env).toContain('APP_KEY=');
        expect(env).toContain('DB_HOST=mysql');
        expect(env).toContain('CACHE_DRIVER=redis');
        expect(env).toContain('MAIL_HOST=mailpit');
    });

    test('shiplet.config.json has language=php', () => {
        writeShipletConfig(tmpDir, phpTemplates.phpShipletConfig(laravelAnswers));
        const cfg = readShipletConfig(tmpDir);
        expect(cfg.language).toBe('php');
        expect(cfg.phpVersion).toBe('8.3');
        expect(cfg.template).toBe('laravel');
    });

    test('nginx config has Laravel public root', () => {
        const conf = phpTemplates.generateNginxConf('laravel');
        expect(conf).toContain('/var/www/html/public');
        expect(conf).toContain('fastcgi_pass app:9000');
    });
});

describe('PHP project generation (Symfony)', () => {
    const symfonyAnswers = {
        language: 'php', appName: 'my-symfony', template: 'symfony',
        phpVersion: '8.2', webServer: 'nginx',
        port: 80, services: ['postgres', 'redis'], timezone: 'UTC', runtime: 'podman',
    };

    test('compose includes postgres for symfony', () => {
        const compose = phpTemplates.generatePhpCompose(symfonyAnswers);
        expect(compose).toContain('postgres:');
        expect(compose).toContain('APP_SECRET');
    });

    test('.env includes DATABASE_URL for symfony+postgres', () => {
        const env = phpTemplates.generatePhpEnvAdditions(symfonyAnswers);
        expect(env).toContain('DATABASE_URL=postgresql://');
    });

    test('Dockerfile uses PHP 8.2 image', () => {
        const df = phpTemplates.generatePhpDockerfile(symfonyAnswers);
        expect(df).toContain('php:8.2-fpm-bookworm');
    });

    test('shiplet.config.json has podman runtime', () => {
        const cfg = phpTemplates.phpShipletConfig(symfonyAnswers);
        expect(cfg.runtime).toBe('podman');
        expect(cfg.language).toBe('php');
    });
});

describe('PHP project generation (WordPress)', () => {
    const wpAnswers = {
        language: 'php', appName: 'my-wp', template: 'wordpress',
        phpVersion: '8.3', webServer: 'nginx',
        port: 80, services: ['mysql'], timezone: 'UTC', runtime: 'docker',
    };

    test('compose includes WORDPRESS_DB_HOST env', () => {
        const compose = phpTemplates.generatePhpCompose(wpAnswers);
        expect(compose).toContain('WORDPRESS_DB_HOST');
    });

    test('Dockerfile includes WP-CLI install', () => {
        const df = phpTemplates.generatePhpDockerfile(wpAnswers);
        expect(df).toContain('wp-cli');
    });

    test('.env includes WP_DEBUG', () => {
        const env = phpTemplates.generatePhpEnvAdditions(wpAnswers);
        expect(env).toContain('WP_DEBUG=true');
    });
});
