#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const { version } = require('../package.json');

// ── Commands ──────────────────────────────────────────────────────────────────
const initCommand = require('./commands/init');
const upCommand = require('./commands/up');
const downCommand = require('./commands/down');
const buildCommand = require('./commands/build');
const execCommand = require('./commands/exec');
const shellCommand = require('./commands/shell');
const logsCommand = require('./commands/logs');
const statusCommand = require('./commands/status');
const healthCommand = require('./commands/health');
const testCommand = require('./commands/test');
const lintCommand = require('./commands/lint');
const dbCommand = require('./commands/db');
const shareCommand = require('./commands/share');
const addCommand = require('./commands/add');
const publishCommand = require('./commands/publish');
const envCommand = require('./commands/env');
const scaleCommand = require('./commands/scale');
const snapshotCommand = require('./commands/snapshot');
const releaseCommand = require('./commands/release');
const runtimeCommand = require('./commands/runtime');
const completionsCommand = require('./commands/completions');
const upgradeCommand = require('./commands/upgrade');
const dashboardCommand = require('./commands/dashboard');

// ── Banner ────────────────────────────────────────────────────────────────────
const BANNER = `
${chalk.cyan('  ██████╗██╗  ██╗██╗██████╗ ██╗     ███████╗████████╗')}
${chalk.cyan(' ██╔════╝██║  ██║██║██╔══██╗██║     ██╔════╝╚══██╔══╝')}
${chalk.cyan(' ╚█████╗ ███████║██║██████╔╝██║     █████╗     ██║   ')}
${chalk.cyan('  ╚═══██╗██╔══██║██║██╔═══╝ ██║     ██╔══╝     ██║   ')}
${chalk.cyan(' ██████╔╝██║  ██║██║██║     ███████╗███████╗   ██║   ')}
${chalk.cyan(' ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝     ╚══════╝╚══════╝   ╚═╝   ')}
${chalk.gray('  Node.js Docker Dev Environment')}  ${chalk.yellow('v' + version)}
`;

const hideBanner = process.argv.includes('completions') && process.argv.length > 3;
if (!hideBanner) console.log(BANNER);

// ── Program ───────────────────────────────────────────────────────────────────
program
    .name('shiplet')
    .description('Shiplet — Docker-powered dev environment for Node.js projects')
    .version(version);

// SETUP
program
    .command('init')
    .description('Initialize Shiplet in a new or existing project (interactive)')
    .option('--template <n>', 'Preset: express | fastify | nestjs | nextjs | nuxt | t3 | blank', 'blank')
    .option('--yes', 'Skip prompts and accept all defaults')
    .action(initCommand);

// LIFECYCLE
program
    .command('up')
    .description('Start all containers')
    .option('-d, --detach', 'Run in background')
    .option('--build', 'Rebuild images first')
    .action(upCommand);

program
    .command('down')
    .description('Stop and remove containers')
    .option('-v, --volumes', 'Also remove volumes')
    .action(downCommand);

program
    .command('build')
    .description('Build or rebuild images')
    .option('--no-cache', 'Skip layer cache')
    .action(buildCommand);

program
    .command('restart [service]')
    .description('Restart one or all services')
    .action(async (service) => {
        const { runCompose, findProjectRoot } = require('./utils/helpers');
        const root = findProjectRoot();
        if (!root) { console.error(chalk.red('No shiplet.yml found.')); process.exit(1); }
        await runCompose(service ? ['restart', service] : ['restart'], { cwd: root });
    });

// EXEC / SHELL
program
    .command('shell [service]')
    .description('Interactive shell in a container (default: app)')
    .action(shellCommand);

program
    .command('exec <service> [cmd...]')
    .description('Run a one-off command in a container')
    .action(execCommand);

// PACKAGE MANAGERS
program.command('node [args...]').description('Run node in the app container').allowUnknownOption().action((a) => execCommand('app', ['node', ...a]));
program.command('npm  [args...]').description('Run npm  in the app container').allowUnknownOption().action((a) => execCommand('app', ['npm', ...a]));
program.command('npx  [args...]').description('Run npx  in the app container').allowUnknownOption().action((a) => execCommand('app', ['npx', ...a]));
program.command('yarn [args...]').description('Run yarn in the app container').allowUnknownOption().action((a) => execCommand('app', ['yarn', ...a]));
program.command('pnpm [args...]').description('Run pnpm in the app container').allowUnknownOption().action((a) => execCommand('app', ['pnpm', ...a]));

// QUALITY
program
    .command('test [args...]')
    .description('Run tests — jest / vitest / mocha auto-detected')
    .allowUnknownOption()
    .action(testCommand);

program
    .command('lint')
    .description('Run linters — eslint / biome / oxlint / prettier / tsc auto-detected')
    .option('--fix', 'Auto-fix where possible')
    .action(lintCommand);

// OBSERVABILITY
program
    .command('logs [service]')
    .description('Tail container logs')
    .option('-f, --follow', 'Stream in real time')
    .option('-n, --lines <n>', 'Tail N lines', '100')
    .action(logsCommand);

program.command('status').alias('ps').description('Running containers + port map').action(statusCommand);

program
    .command('health')
    .description('Container health dashboard (CPU, memory, healthcheck state)')
    .option('-w, --watch', 'Auto-refresh every 3s')
    .action(healthCommand);

// DATABASES
program.command('db [service]').description('Open DB CLI — psql / mysql / mongosh / redis-cli (auto)').action(dbCommand);

// NETWORKING
program
    .command('share')
    .description('Expose your app to the internet via a public tunnel')
    .option('--subdomain <n>', 'Requested subdomain')
    .option('--port <p>', 'Port to tunnel', '3000')
    .action(shareCommand);

// SCALING
program.command('scale <specs...>').description('Scale replicas  e.g. shiplet scale app=3 worker=2').action(scaleCommand);

// SERVICES
program.command('add [services...]').description('Add services: postgres mysql mongo redis mailpit minio elasticsearch adminer').action(addCommand);

// SNAPSHOTS
program.command('snapshot [action] [name]').description('Volume snapshots: save | restore | list | delete').action(snapshotCommand);

// ENVIRONMENT
program.command('env <action> [args...]').description('.env management: get | set | unset | list | sync').action(envCommand);

// RELEASE PIPELINE
program
    .command('release [bump]')
    .description('Full release: version bump → changelog → git tag → image build  [patch|minor|major]')
    .option('--pre <tag>', 'Pre-release tag, e.g. beta')
    .option('--dry-run', 'Simulate — no permanent changes')
    .option('--skip-tests', 'Skip test run')
    .option('--skip-build', 'Skip image build')
    .option('--skip-push', 'Skip git push')
    .option('--publish', 'npm publish after release')
    .option('--access <p>', 'npm publish access', 'public')
    .option('--yes', 'Skip confirmation')
    .option('--force', 'Ignore pre-check failures')
    .action(releaseCommand);

// CUSTOMISATION
program.command('publish').description('Eject Dockerfiles for full customisation').action(publishCommand);
program.command('runtime [action]').description('Container runtime: show | switch | check  (Docker ↔ Podman)').action(runtimeCommand);

// TOOLING
program.command('upgrade').description('Upgrade shiplet to latest').option('--check', 'Check only, no install').action(upgradeCommand);
program.command('completions [shell]').description('Shell completions for bash | zsh | fish').action(completionsCommand);

// ── Dashboard UI ──────────────────────────────────────────────────────────────
program
    .command('dashboard')
    .alias('ui')
    .description('Launch web dashboard UI (Tailwind, live metrics, log streaming)')
    .option('-p, --port <port>', 'Port to listen on', '6171')
    .option('--no-open', 'Do not auto-open browser')
    .action(dashboardCommand);

program.parse(process.argv);
