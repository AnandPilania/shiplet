'use strict';

const chalk = require('chalk');
const { assertRuntime, runCompose, findProjectRoot, header, info, success, printRuntimeBadge } = require('../utils/helpers');

module.exports = async function upCommand(options) {
    const root = findProjectRoot();
    assertRuntime(root);

    header('Starting Shiplet');
    printRuntimeBadge(root);

    if (!root) {
        console.error(chalk.red('\n✖  No shiplet.yml found. Run `shiplet init` first.\n'));
        process.exit(1);
    }

    const args = ['up'];
    if (options.detach) args.push('-d');
    if (options.build) args.push('--build');

    try {
        await runCompose(args, { cwd: root });
        if (options.detach) {
            success('All containers are running in the background.');
            info('Run `shiplet status` to see running services.');
            info('Run `shiplet logs -f` to follow output.');
        }
    } catch (err) {
        console.error(chalk.red('\n✖  Failed to start containers: ' + err.message + '\n'));
        process.exit(1);
    }
};
