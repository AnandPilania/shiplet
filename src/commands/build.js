'use strict';

const chalk = require('chalk');
const { assertDocker, dockerCompose, findProjectRoot, header, success } = require('../utils/helpers');

module.exports = async function buildCommand(options) {
    assertDocker();
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    header('Building Images');

    const args = ['build'];
    if (options.noCache) args.push('--no-cache');

    try {
        await dockerCompose(args, { cwd: root });
        success('Images built successfully.');
    } catch (err) {
        console.error(chalk.red('✖  Build failed: ' + err.message));
        process.exit(1);
    }
};
