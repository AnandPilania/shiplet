'use strict';

const { assertDocker, dockerCompose, findProjectRoot } = require('../utils/helpers');
const chalk = require('chalk');

module.exports = async function logsCommand(service, options) {
    assertDocker();
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    const args = ['logs', '--tail', options.lines];
    if (options.follow) args.push('-f');
    if (service) args.push(service);

    try {
        await dockerCompose(args, { cwd: root });
    } catch {
        // user Ctrl-C'd — normal exit
    }
};
