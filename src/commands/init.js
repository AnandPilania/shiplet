'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { header, success, info, assertRuntime, detectRuntime, writeShipletConfig } = require('../utils/helpers');
const templates = require('../templates');

const SERVICE_CHOICES = [
    { name: 'PostgreSQL', value: 'postgres', checked: false },
    { name: 'MySQL 8', value: 'mysql', checked: false },
    { name: 'MongoDB', value: 'mongo', checked: false },
    { name: 'Redis', value: 'redis', checked: false },
    { name: 'Mailpit (email)', value: 'mailpit', checked: false },
    { name: 'MinIO (S3)', value: 'minio', checked: false },
    { name: 'Elasticsearch', value: 'elasticsearch', checked: false },
    { name: 'Adminer (DB GUI)', value: 'adminer', checked: false },
];

const PACKAGE_MANAGER_CHOICES = ['npm', 'yarn', 'pnpm'];

module.exports = async function initCommand(options) {
    // detect before asserting so we can show in prompts
    const autoRuntime = detectRuntime(null) || 'docker';
    assertRuntime(null);
    header('Initializing Shiplet');

    const cwd = process.cwd();

    // ── Detect existing project ──────────────────────────────────────────────
    const hasPkg = fs.existsSync(path.join(cwd, 'package.json'));
    const hasYarn = fs.existsSync(path.join(cwd, 'yarn.lock'));
    const hasPnpm = fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'));

    let answers;

    if (options.yes) {
        answers = {
            appName: path.basename(cwd),
            template: options.template || 'blank',
            nodeVersion: '20',
            packageManager: hasYarn ? 'yarn' : hasPnpm ? 'pnpm' : 'npm',
            port: 3000,
            services: [],
            timezone: 'UTC',
            runtime: options.runtime || autoRuntime,
        };
    } else {
        answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'appName',
                message: 'Application name:',
                default: path.basename(cwd),
            },
            {
                type: 'list',
                name: 'template',
                message: 'Project template:',
                choices: ['express', 'fastify', 'nestjs', 'nextjs', 'nuxt', 't3', 'blank'],
                default: options.template || 'blank',
            },
            {
                type: 'list',
                name: 'runtime',
                message: 'Container runtime:',
                choices: [
                    { name: `docker  ${autoRuntime === 'docker' ? chalk.green('(detected)') : ''}`, value: 'docker' },
                    { name: `podman  ${autoRuntime === 'podman' ? chalk.green('(detected)') : ''}`, value: 'podman' },
                ],
                default: autoRuntime,
            },
            {
                type: 'list',
                name: 'nodeVersion',
                message: 'Node.js version inside container:',
                choices: ['22', '20', '18'],
                default: '20',
            },
            {
                type: 'list',
                name: 'packageManager',
                message: 'Package manager:',
                choices: PACKAGE_MANAGER_CHOICES,
                default: hasYarn ? 'yarn' : hasPnpm ? 'pnpm' : 'npm',
            },
            {
                type: 'number',
                name: 'port',
                message: 'App port (host):',
                default: 3000,
            },
            {
                type: 'checkbox',
                name: 'services',
                message: 'Additional services:',
                choices: SERVICE_CHOICES,
            },
            {
                type: 'input',
                name: 'timezone',
                message: 'Container timezone:',
                default: 'UTC',
            },
        ]);
    }

    const spinner = ora('Generating Shiplet configuration…').start();

    try {
        // ── Write compose.yml ────────────────────────────────────────────────────
        const composeContent = templates.generateCompose(answers);
        fs.writeFileSync(path.join(cwd, 'shiplet.yml'), composeContent);

        // ── Write Dockerfile ─────────────────────────────────────────────────────
        const dockerfileContent = templates.generateDockerfile(answers);
        fs.mkdirSync(path.join(cwd, '.shiplet'), { recursive: true });
        fs.writeFileSync(path.join(cwd, '.shiplet', 'Dockerfile'), dockerfileContent);

        // ── Write .env additions ─────────────────────────────────────────────────
        const envAdditions = templates.generateEnvAdditions(answers);
        const envPath = path.join(cwd, '.env');
        if (!fs.existsSync(envPath)) {
            fs.writeFileSync(envPath, envAdditions);
        } else {
            fs.appendFileSync(envPath, '\n' + envAdditions);
        }

        // ── Write shiplet.config.json ───────────────────────────────────────────────
        writeShipletConfig(cwd, {
            runtime: answers.runtime,
            appName: answers.appName,
            nodeVersion: answers.nodeVersion,
            packageManager: answers.packageManager,
            port: answers.port,
        });
        const gitignorePath = path.join(cwd, '.gitignore');
        const gitignoreEntry = '\n# Shiplet\n.shiplet/\n';
        if (fs.existsSync(gitignorePath)) {
            const current = fs.readFileSync(gitignorePath, 'utf8');
            if (!current.includes('Shiplet')) {
                fs.appendFileSync(gitignorePath, gitignoreEntry);
            }
        }

        spinner.succeed(chalk.green('Configuration generated!'));
    } catch (err) {
        spinner.fail('Failed to generate configuration');
        console.error(err);
        process.exit(1);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('');
    success(`shiplet.yml written`);
    success(`shiplet.config.json written  ${chalk.gray('(runtime: ' + answers.runtime + ')')}`);
    success(`.shiplet/Dockerfile written`);
    success(`.env updated`);

    if (answers.services.length) {
        info(`Services added: ${answers.services.join(', ')}`);
    }

    const rtBadge = answers.runtime === 'podman'
        ? chalk.magenta('podman')
        : chalk.blue('docker');

    console.log(`
${chalk.bold('  Next steps:')}

  ${chalk.cyan('shiplet up -d')}        Start all containers in the background  ${chalk.gray('(' + rtBadge + chalk.gray(')'))}
  ${chalk.cyan('shiplet shell')}        Open a shell inside your app container
  ${chalk.cyan('shiplet npm install')}  Install dependencies inside the container
  ${chalk.cyan('shiplet logs -f')}      Follow container logs
  ${chalk.cyan('shiplet status')}       Show running services
  ${chalk.cyan('shiplet release')}      Bump version, tag, and publish a release
  `);
};
