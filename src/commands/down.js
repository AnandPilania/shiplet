'use strict';

const chalk = require('chalk');
const { assertDocker, dockerCompose, findProjectRoot, header } = require('../utils/helpers');

module.exports = async function downCommand(options) {
    assertDocker();
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    header('Stopping Shiplet');

    const args = ['down'];
    if (options.volumes) {
        args.push('-v');
        console.warn(chalk.yellow('  ⚠  Volume removal requested — this will destroy database data!\n'));
    }

    try {
        await dockerCompose(args, { cwd: root });
    } catch (err) {
        console.error(chalk.red('✖  ' + err.message));
        process.exit(1);
    }
};
