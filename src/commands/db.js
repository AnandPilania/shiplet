'use strict';

const { spawn } = require('child_process');
const chalk = require('chalk');
const { assertDocker, findProjectRoot, resolveComposeFile, getRunningServices, header, info } = require('../utils/helpers');

const DB_CONFIGS = {
    postgres: { cmd: ['psql', '-U', '${POSTGRES_USER:-postgres}', '${POSTGRES_DB:-app}'], label: 'PostgreSQL' },
    mysql: { cmd: ['mysql', '-u', '${MYSQL_USER:-root}', '-p${MYSQL_PASSWORD:-secret}', '${MYSQL_DATABASE:-app}'], label: 'MySQL' },
    mongo: { cmd: ['mongosh', '--quiet'], label: 'MongoDB' },
    mongodb: { cmd: ['mongosh', '--quiet'], label: 'MongoDB' },
    redis: { cmd: ['redis-cli'], label: 'Redis' },
};

module.exports = function dbCommand(service) {
    assertDocker();
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    const running = getRunningServices(root);

    // Auto-detect if no service provided
    let target = service;
    if (!target) {
        const detected = Object.keys(DB_CONFIGS).find((s) => running.includes(s));
        if (!detected) {
            console.error(chalk.red('\n✖  No running database service found.'));
            console.error(chalk.gray('   Specify one: shiplet db postgres | mysql | mongo | redis\n'));
            process.exit(1);
        }
        target = detected;
    }

    const cfg = DB_CONFIGS[target];
    if (!cfg) {
        console.error(chalk.red(`✖  Unknown database service: ${target}`));
        console.error(chalk.gray(`   Supported: ${Object.keys(DB_CONFIGS).join(', ')}\n`));
        process.exit(1);
    }

    header(`${cfg.label} CLI`);
    info(`Connecting to ${chalk.cyan(target)}…\n`);

    const composeFile = resolveComposeFile(root);
    const baseArgs = composeFile ? ['-f', composeFile] : [];

    const proc = spawn(
        'docker',
        ['compose', ...baseArgs, 'exec', '-it', target, 'sh', '-c', cfg.cmd.join(' ')],
        { cwd: root, stdio: 'inherit' }
    );

    proc.on('close', (code) => process.exit(code));
    proc.on('error', (err) => {
        console.error(chalk.red('✖  ' + err.message));
        process.exit(1);
    });
};
