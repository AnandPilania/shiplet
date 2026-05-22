'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');

const {
    header, success, info, assertRuntime, detectRuntime, writeShipletConfig,
} = require('../utils/helpers');
const nodeTemplates = require('../templates');
const phpTemplates = require('../templates/php');
const viteBun = require('../templates/vite-bun');

// ── Service choices ────────────────────────────────────────────────────────────
const SVC_NODE = [
    { name: 'PostgreSQL', value: 'postgres', checked: false },
    { name: 'MySQL 8', value: 'mysql', checked: false },
    { name: 'MongoDB', value: 'mongo', checked: false },
    { name: 'Redis', value: 'redis', checked: false },
    { name: 'Mailpit (email)', value: 'mailpit', checked: false },
    { name: 'MinIO (S3)', value: 'minio', checked: false },
    { name: 'Elasticsearch', value: 'elasticsearch', checked: false },
    { name: 'Adminer (DB GUI)', value: 'adminer', checked: false },
];

const SVC_PHP = [
    { name: 'MySQL 8', value: 'mysql', checked: false },
    { name: 'PostgreSQL', value: 'postgres', checked: false },
    { name: 'Redis', value: 'redis', checked: false },
    { name: 'Mailpit (email)', value: 'mailpit', checked: false },
    { name: 'MinIO (S3)', value: 'minio', checked: false },
    { name: 'Elasticsearch', value: 'elasticsearch', checked: false },
    { name: 'Adminer (DB GUI)', value: 'adminer', checked: false },
    { name: 'phpMyAdmin', value: 'phpmyadmin', checked: false },
];

// ── Language / template detection ─────────────────────────────────────────────
function readPkg(cwd) {
    try { return JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')); }
    catch { return null; }
}

function listFiles(cwd) {
    try { return fs.readdirSync(cwd); }
    catch { return []; }
}

function detectLanguage(cwd) {
    const files = listFiles(cwd);
    if (files.includes('artisan') || files.includes('symfony.lock') ||
        files.includes('wp-config.php') || files.includes('composer.json')) return 'php';
    if (files.includes('bun.lockb') || files.includes('bun.lock')) return 'bun';
    if (files.includes('package.json')) return 'node'; // may be vite
    return null;
}

function detectNodeTemplate(cwd) {
    const pkg = readPkg(cwd);
    if (!pkg) return 'blank';

    // Check for Vite first
    const viteTemplate = viteBun.detectViteTemplate(pkg);
    if (viteTemplate) return 'vite:' + viteTemplate;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['@nestjs/core']) return 'nestjs';
    if (deps['next']) return 'nextjs';
    if (deps['nuxt'] || deps['@nuxt/kit']) return 'nuxt';
    if (deps['fastify']) return 'fastify';
    if (deps['express']) return 'express';
    if (deps['@remix-run/node']) return 'vite:remix-ts';
    if (deps['astro']) return 'vite:astro';
    return 'blank';
}

function detectBunTemplate(cwd) {
    const pkg = readPkg(cwd);
    const files = listFiles(cwd);
    return viteBun.detectBunTemplate(pkg, files) || 'bun-blank';
}

function detectPhpTemplate(cwd) {
    const files = listFiles(cwd);
    if (files.includes('artisan')) return 'laravel';
    if (files.includes('symfony.lock')) return 'symfony';
    if (files.includes('wp-config.php') ||
        files.includes('wp-config-sample.php')) return 'wordpress';
    return 'blank';
}

function isViteTemplate(tpl) { return tpl && tpl.startsWith('vite:'); }
function stripVitePrefix(tpl) { return tpl.replace(/^vite:/, ''); }

// ── Main command ──────────────────────────────────────────────────────────────
module.exports = async function initCommand(options) {
    const autoRuntime = detectRuntime(null) || 'docker';
    assertRuntime(null);
    header('Initializing Shiplet');

    const cwd = process.cwd();
    const detectedLang = options.language || detectLanguage(cwd);
    const detectedPhpTpl = detectPhpTemplate(cwd);
    const detectedNodeTpl = detectNodeTemplate(cwd);   // may be 'vite:react-ts'
    const detectedBunTpl = detectBunTemplate(cwd);
    const hasYarn = fs.existsSync(path.join(cwd, 'yarn.lock'));
    const hasPnpm = fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'));
    const hasBun = fs.existsSync(path.join(cwd, 'bun.lockb')) || fs.existsSync(path.join(cwd, 'bun.lock'));
    const isVite = isViteTemplate(detectedNodeTpl);

    let answers;

    if (options.yes) {
        const lang = detectedLang || 'node';
        if (lang === 'php') {
            answers = { language: 'php', appName: path.basename(cwd), template: options.template || detectedPhpTpl, phpVersion: options.phpVersion || '8.3', webServer: 'nginx', port: 80, services: [], timezone: 'UTC', runtime: autoRuntime };
        } else if (lang === 'bun') {
            answers = { language: 'bun', appName: path.basename(cwd), template: options.template || detectedBunTpl, port: 3000, services: [], timezone: 'UTC', runtime: autoRuntime };
        } else if (isVite || (options.template && options.template !== 'express')) {
            const viteKey = options.template || stripVitePrefix(detectedNodeTpl) || 'react-ts';
            answers = { language: 'vite', appName: path.basename(cwd), template: viteKey, nodeVersion: options.nodeVersion || '20', packageManager: hasYarn ? 'yarn' : hasPnpm ? 'pnpm' : hasBun ? 'bun' : 'npm', port: 5173, services: [], timezone: 'UTC', runtime: autoRuntime };
        } else {
            answers = { language: 'node', appName: path.basename(cwd), template: options.template || detectedNodeTpl, nodeVersion: options.nodeVersion || '20', packageManager: hasYarn ? 'yarn' : hasPnpm ? 'pnpm' : 'npm', port: 3000, services: [], timezone: 'UTC', runtime: autoRuntime };
        }
    } else {
        // ── shared questions ──
        const shared = await inquirer.prompt([
            { type: 'input', name: 'appName', message: 'Application name:', default: path.basename(cwd) },
            {
                type: 'list', name: 'language', message: 'Project type:',
                choices: [
                    { name: `Node.js — Express, Fastify, NestJS, Next.js, Nuxt, T3${['node'].includes(detectedLang) && !isVite ? chalk.green(' ✓') : ''}`, value: 'node' },
                    { name: `Vite — React, Vue, Svelte, Solid, Astro, Qwik…${isVite ? chalk.green(' ✓ detected: ' + stripVitePrefix(detectedNodeTpl)) : ''}`, value: 'vite' },
                    { name: `Bun — API, Hono, ElysiaJS, React${detectedLang === 'bun' ? chalk.green(' ✓') : ''}`, value: 'bun' },
                    { name: `PHP / Composer — Laravel, Symfony, WordPress${detectedLang === 'php' ? chalk.green(' ✓') : ''}`, value: 'php' },
                ],
                default: detectedLang === 'php' ? 'php' : detectedLang === 'bun' ? 'bun' : isVite ? 'vite' : 'node',
            },
            {
                type: 'list', name: 'runtime', message: 'Container runtime:',
                choices: [
                    { name: `docker${autoRuntime === 'docker' ? chalk.green('  ✓ detected') : ''}`, value: 'docker' },
                    { name: `podman${autoRuntime === 'podman' ? chalk.green('  ✓ detected') : ''}`, value: 'podman' },
                ],
                default: autoRuntime,
            },
            { type: 'input', name: 'timezone', message: 'Container timezone:', default: 'UTC' },
        ]);

        if (shared.language === 'vite') {
            const viteAnswers = await _vitePrompts(detectedNodeTpl, isVite, options, hasYarn, hasPnpm, hasBun);
            answers = { ...shared, ...viteAnswers };

        } else if (shared.language === 'bun') {
            const bunAnswers = await _bunPrompts(detectedBunTpl, options);
            answers = { ...shared, ...bunAnswers };

        } else if (shared.language === 'php') {
            const phpAnswers = await _phpPrompts(detectedPhpTpl, options);
            answers = { ...shared, ...phpAnswers };

        } else {
            const nodeAnswers = await _nodePrompts(detectedNodeTpl, options, hasYarn, hasPnpm);
            answers = { ...shared, ...nodeAnswers };
        }
    }

    // ── Generate files ────────────────────────────────────────────────────────
    const spinner = ora('Generating shiplet configuration…').start();
    try {
        switch (answers.language) {
            case 'vite': await _generateVite(cwd, answers); break;
            case 'bun': await _generateBun(cwd, answers); break;
            case 'php': await _generatePhp(cwd, answers); break;
            default: await _generateNode(cwd, answers);
        }
        spinner.succeed(chalk.green('Configuration generated!'));
    } catch (err) {
        spinner.fail('Failed to generate configuration');
        console.error(chalk.red(err.message));
        process.exit(1);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('');
    success(`shiplet.yml`);
    success(`shiplet.config.json  ${chalk.gray(`(${answers.language}, runtime: ${answers.runtime})`)}`);
    success(`.shiplet/Dockerfile`);
    success(`.env`);
    if (answers.services?.length) info(`Services: ${answers.services.join(', ')}`);
    _printNextSteps(answers);
};

// ── Prompt helpers ─────────────────────────────────────────────────────────────
async function _vitePrompts(detectedNodeTpl, isVite, options, hasYarn, hasPnpm, hasBun) {
    const detected = isVite ? stripVitePrefix(detectedNodeTpl) : null;

    const groups = [
        { name: chalk.bold('─── React ────────────────────'), value: null, disabled: true },
        { name: `react          — React${detected === 'react' ? chalk.green(' ✓') : ''}`, value: 'react' },
        { name: `react-ts       — React + TypeScript${detected === 'react-ts' ? chalk.green(' ✓') : ''}`, value: 'react-ts' },
        { name: `react-swc      — React + SWC (faster)${detected === 'react-swc' ? chalk.green(' ✓') : ''}`, value: 'react-swc' },
        { name: `react-swc-ts   — React + SWC + TS${detected === 'react-swc-ts' ? chalk.green(' ✓') : ''}`, value: 'react-swc-ts' },
        { name: chalk.bold('─── Vue ──────────────────────'), value: null, disabled: true },
        { name: `vue            — Vue 3${detected === 'vue' ? chalk.green(' ✓') : ''}`, value: 'vue' },
        { name: `vue-ts         — Vue 3 + TypeScript${detected === 'vue-ts' ? chalk.green(' ✓') : ''}`, value: 'vue-ts' },
        { name: chalk.bold('─── Svelte ───────────────────'), value: null, disabled: true },
        { name: `svelte         — Svelte${detected === 'svelte' ? chalk.green(' ✓') : ''}`, value: 'svelte' },
        { name: `svelte-ts      — Svelte + TypeScript${detected === 'svelte-ts' ? chalk.green(' ✓') : ''}`, value: 'svelte-ts' },
        { name: `sveltekit      — SvelteKit${detected === 'sveltekit' ? chalk.green(' ✓') : ''}`, value: 'sveltekit' },
        { name: chalk.bold('─── Others ───────────────────'), value: null, disabled: true },
        { name: `solid-ts       — Solid + TypeScript${detected === 'solid-ts' ? chalk.green(' ✓') : ''}`, value: 'solid-ts' },
        { name: `astro          — Astro${detected === 'astro' ? chalk.green(' ✓') : ''}`, value: 'astro' },
        { name: `qwik-ts        — Qwik + TypeScript${detected === 'qwik-ts' ? chalk.green(' ✓') : ''}`, value: 'qwik-ts' },
        { name: `preact-ts      — Preact + TypeScript`, value: 'preact-ts' },
        { name: `lit-ts         — Lit + TypeScript`, value: 'lit-ts' },
        { name: `vanilla-ts     — Vanilla TypeScript`, value: 'vanilla-ts' },
        { name: `remix-ts       — Remix + TypeScript`, value: 'remix-ts' },
    ];

    const meta = viteBun.VITE_TEMPLATES[detected || 'react-ts'] || viteBun.VITE_TEMPLATES['react-ts'];
    const defPort = meta?.port || 5173;

    const defPm = hasBun ? 'bun' : hasYarn ? 'yarn' : hasPnpm ? 'pnpm' : 'npm';

    return inquirer.prompt([
        { type: 'list', name: 'template', message: 'Vite template:', choices: groups.filter(c => c.value !== null), default: detected || 'react-ts' },
        { type: 'list', name: 'nodeVersion', message: 'Node.js version:', choices: ['22', '20', '18'], default: '20' },
        { type: 'list', name: 'packageManager', message: 'Package manager:', choices: ['npm', 'yarn', 'pnpm', 'bun'], default: defPm },
        { type: 'number', name: 'port', message: 'Dev server port:', default: defPort },
        { type: 'checkbox', name: 'services', message: 'Backend services (optional):', choices: SVC_NODE },
    ]);
}

async function _bunPrompts(detectedBunTpl, options) {
    return inquirer.prompt([
        {
            type: 'list', name: 'template', message: 'Bun project type:',
            choices: [
                { name: `bun-blank   — Bare Bun script${detectedBunTpl === 'bun-blank' ? chalk.green(' ✓') : ''}`, value: 'bun-blank' },
                { name: `bun-api     — Bun HTTP API server${detectedBunTpl === 'bun-api' ? chalk.green(' ✓') : ''}`, value: 'bun-api' },
                { name: `bun-hono    — Hono framework${detectedBunTpl === 'bun-hono' ? chalk.green(' ✓') : ''}`, value: 'bun-hono' },
                { name: `bun-elysia  — ElysiaJS${detectedBunTpl === 'bun-elysia' ? chalk.green(' ✓') : ''}`, value: 'bun-elysia' },
                { name: `bun-react   — Bun + React (Bun bundler)${detectedBunTpl === 'bun-react' ? chalk.green(' ✓') : ''}`, value: 'bun-react' },
            ],
            default: options.template || detectedBunTpl,
        },
        { type: 'number', name: 'port', message: 'App port:', default: 3000 },
        { type: 'checkbox', name: 'services', message: 'Backend services:', choices: SVC_NODE },
    ]);
}

async function _phpPrompts(detectedPhpTpl, options) {
    return inquirer.prompt([
        {
            type: 'list', name: 'template', message: 'PHP framework:',
            choices: [
                { name: `laravel   — Laravel 11${detectedPhpTpl === 'laravel' ? chalk.green(' ✓') : ''}`, value: 'laravel' },
                { name: `symfony   — Symfony 7${detectedPhpTpl === 'symfony' ? chalk.green(' ✓') : ''}`, value: 'symfony' },
                { name: `wordpress — WordPress + WP-CLI${detectedPhpTpl === 'wordpress' ? chalk.green(' ✓') : ''}`, value: 'wordpress' },
                { name: 'slim      — Slim Framework 4', value: 'slim' },
                { name: 'lumen     — Lumen micro-framework', value: 'lumen' },
                { name: 'blank     — Vanilla PHP', value: 'blank' },
            ],
            default: options.template || detectedPhpTpl,
        },
        { type: 'list', name: 'phpVersion', message: 'PHP version:', choices: ['8.3', '8.2', '8.1', '8.0'], default: options.phpVersion || '8.3' },
        { type: 'list', name: 'webServer', message: 'Web server:', choices: [{ name: 'nginx (recommended)', value: 'nginx' }, { name: 'apache', value: 'apache' }], default: 'nginx' },
        { type: 'number', name: 'port', message: 'App port:', default: 80 },
        { type: 'checkbox', name: 'services', message: 'Additional services:', choices: SVC_PHP },
    ]);
}

async function _nodePrompts(detectedNodeTpl, options, hasYarn, hasPnpm) {
    return inquirer.prompt([
        {
            type: 'list', name: 'template', message: 'Node.js template:',
            choices: [
                { name: `express — Express.js${detectedNodeTpl === 'express' ? chalk.green(' ✓') : ''}`, value: 'express' },
                { name: `fastify — Fastify${detectedNodeTpl === 'fastify' ? chalk.green(' ✓') : ''}`, value: 'fastify' },
                { name: `nestjs  — NestJS${detectedNodeTpl === 'nestjs' ? chalk.green(' ✓') : ''}`, value: 'nestjs' },
                { name: `nextjs  — Next.js${detectedNodeTpl === 'nextjs' ? chalk.green(' ✓') : ''}`, value: 'nextjs' },
                { name: `nuxt    — Nuxt 3${detectedNodeTpl === 'nuxt' ? chalk.green(' ✓') : ''}`, value: 'nuxt' },
                { name: 't3      — T3 (Next+tRPC+Prisma)', value: 't3' },
                { name: 'blank   — Bare Node.js', value: 'blank' },
            ],
            default: options.template || (isViteTemplate(detectedNodeTpl) ? 'blank' : detectedNodeTpl),
        },
        { type: 'list', name: 'nodeVersion', message: 'Node.js version:', choices: ['22', '20', '18'], default: options.nodeVersion || '20' },
        { type: 'list', name: 'packageManager', message: 'Package manager:', choices: ['npm', 'yarn', 'pnpm'], default: hasYarn ? 'yarn' : hasPnpm ? 'pnpm' : 'npm' },
        { type: 'number', name: 'port', message: 'App port:', default: 3000 },
        { type: 'checkbox', name: 'services', message: 'Additional services:', choices: SVC_NODE },
    ]);
}

// ── File generators ───────────────────────────────────────────────────────────
async function _generateVite(cwd, answers) {
    const shipletDir = path.join(cwd, '.shiplet');
    fs.mkdirSync(shipletDir, { recursive: true });

    fs.writeFileSync(path.join(cwd, 'shiplet.yml'), viteBun.generateViteCompose(answers));
    fs.writeFileSync(path.join(shipletDir, 'Dockerfile'), viteBun.generateViteDockerfile(answers));
    _writeEnv(cwd, viteBun.generateViteEnv(answers));

    // Print vite.config hint separately (don't overwrite user config)
    const hint = viteBun.viteConfigHint(answers.template);
    answers._viteHint = hint;

    writeShipletConfig(cwd, {
        language: 'vite', runtime: answers.runtime,
        appName: answers.appName, template: answers.template,
        nodeVersion: answers.nodeVersion, packageManager: answers.packageManager,
        port: answers.port,
    });
    _appendGitignore(cwd);
}

async function _generateBun(cwd, answers) {
    const shipletDir = path.join(cwd, '.shiplet');
    fs.mkdirSync(shipletDir, { recursive: true });

    fs.writeFileSync(path.join(cwd, 'shiplet.yml'), viteBun.generateBunCompose(answers));
    fs.writeFileSync(path.join(shipletDir, 'Dockerfile'), viteBun.generateBunDockerfile(answers));
    _writeEnv(cwd, viteBun.generateBunEnv(answers));

    writeShipletConfig(cwd, {
        language: 'bun', runtime: answers.runtime,
        appName: answers.appName, template: answers.template,
        packageManager: 'bun', port: answers.port,
    });
    _appendGitignore(cwd);
}

async function _generateNode(cwd, answers) {
    const shipletDir = path.join(cwd, '.shiplet');
    fs.mkdirSync(shipletDir, { recursive: true });

    fs.writeFileSync(path.join(cwd, 'shiplet.yml'), nodeTemplates.generateCompose(answers));
    fs.writeFileSync(path.join(shipletDir, 'Dockerfile'), nodeTemplates.generateDockerfile(answers));
    _writeEnv(cwd, nodeTemplates.generateEnvAdditions(answers));

    writeShipletConfig(cwd, {
        language: 'node', runtime: answers.runtime,
        appName: answers.appName, template: answers.template,
        nodeVersion: answers.nodeVersion, packageManager: answers.packageManager,
        port: answers.port,
    });
    _appendGitignore(cwd);
}

async function _generatePhp(cwd, answers) {
    const td = path.join(cwd, '.shiplet');
    fs.mkdirSync(path.join(td, 'nginx'), { recursive: true });
    fs.mkdirSync(path.join(td, 'php'), { recursive: true });
    fs.mkdirSync(path.join(td, 'supervisor'), { recursive: true });

    fs.writeFileSync(path.join(cwd, 'shiplet.yml'), phpTemplates.generatePhpCompose(answers));
    fs.writeFileSync(path.join(td, 'Dockerfile'), phpTemplates.generatePhpDockerfile(answers));
    if (answers.webServer !== 'apache')
        fs.writeFileSync(path.join(td, 'nginx', 'default.conf'), phpTemplates.generateNginxConf(answers.template));
    fs.writeFileSync(path.join(td, 'php', 'php.ini'), phpTemplates.generatePhpIni());
    if (answers.template === 'laravel')
        fs.writeFileSync(path.join(td, 'supervisor', 'supervisord.conf'), phpTemplates.generateSupervisorConf());
    _writeEnv(cwd, phpTemplates.generatePhpEnvAdditions(answers));

    writeShipletConfig(cwd, phpTemplates.phpShipletConfig(answers));
    _appendGitignore(cwd);
}

function _writeEnv(cwd, text) {
    const envPath = path.join(cwd, '.env');
    if (!fs.existsSync(envPath)) fs.writeFileSync(envPath, text);
    else fs.appendFileSync(envPath, '\n' + text);
}

function _appendGitignore(cwd) {
    const p = path.join(cwd, '.gitignore');
    const entry = '\n# Shiplet\n.shiplet/\n';
    if (fs.existsSync(p)) {
        if (!fs.readFileSync(p, 'utf8').includes('Shiplet'))
            fs.appendFileSync(p, entry);
    }
}

// ── Next steps ────────────────────────────────────────────────────────────────
function _printNextSteps(a) {
    const rt = a.runtime === 'podman' ? chalk.magenta('podman') : chalk.blue('docker');
    console.log('');

    if (a.language === 'vite') {
        const pm = a.packageManager || 'npm';
        const runDev = pm === 'npm' ? 'npm run dev' : `${pm} run dev`;
        console.log(chalk.bold('  Next steps:\n'));
        console.log(`  ${chalk.cyan('shiplet up -d')}                Start containers  ${chalk.gray(`(${rt})`)}`);
        console.log(`  ${chalk.cyan(`shiplet ${pm} install`)}${''.padEnd(Math.max(0, 12 - pm.length))}  Install dependencies`);
        console.log(`  ${chalk.cyan(`shiplet ${runDev}`)}${''.padEnd(Math.max(0, 12 - runDev.length))}  Start Vite dev server`);
        if (a._viteHint) {
            console.log('');
            console.log(chalk.yellow('  ⚠  Add this to your vite.config.ts for HMR inside Docker:'));
            a._viteHint.split('\n').forEach(l => console.log(chalk.gray('     ' + l)));
        }

    } else if (a.language === 'bun') {
        console.log(chalk.bold('  Next steps:\n'));
        console.log(`  ${chalk.cyan('shiplet up -d')}              Start containers  ${chalk.gray(`(${rt})`)}`);
        console.log(`  ${chalk.cyan('shiplet bun install')}        Install dependencies`);
        console.log(`  ${chalk.cyan('shiplet bun run dev')}        Start dev server`);
        console.log(`  ${chalk.cyan('shiplet shell')}              Shell into app container`);

    } else if (a.language === 'php') {
        const extra = { laravel: `  ${chalk.cyan('shiplet artisan key:generate')}\n  ${chalk.cyan('shiplet artisan migrate')}`, symfony: `  ${chalk.cyan('shiplet console doctrine:migrations:migrate')}`, wordpress: `  ${chalk.cyan('shiplet wp --info')}` }[a.template] || '';
        console.log(chalk.bold('  Next steps:\n'));
        console.log(`  ${chalk.cyan('shiplet up -d')}              Start containers  ${chalk.gray(`(${rt})`)}`);
        console.log(`  ${chalk.cyan('shiplet composer install')}   Install PHP dependencies`);
        if (extra) console.log(extra);
        console.log(`  ${chalk.cyan('shiplet shell')}              App shell`);
        console.log(`  ${chalk.cyan('shiplet db')}                 Open DB CLI`);

    } else {
        const pm = a.packageManager || 'npm';
        console.log(chalk.bold('  Next steps:\n'));
        console.log(`  ${chalk.cyan('shiplet up -d')}              Start containers  ${chalk.gray(`(${rt})`)}`);
        console.log(`  ${chalk.cyan(`shiplet ${pm} install`)}${''.padEnd(Math.max(0, 14 - pm.length))}Install dependencies`);
        console.log(`  ${chalk.cyan('shiplet shell')}              App shell`);
        console.log(`  ${chalk.cyan('shiplet logs -f')}            Follow logs`);
    }

    console.log(`  ${chalk.cyan('shiplet dashboard')}          Web UI → http://localhost:6171`);
    console.log('');
}
