'use strict';

const { spawn } = require('child_process');
const chalk = require('chalk');
const { assertDocker, findProjectRoot, resolveComposeFile } = require('../utils/helpers');

module.exports = function execCommand(service, cmdArgs) {
    assertDocker();
    const root = findProjectRoot();
    if (!root) {
        console.error(chalk.red('\n✖  No shiplet.yml found. Run `shiplet init` first.\n'));
        process.exit(1);
    }

    const composeFile = resolveComposeFile(root);
    const baseArgs = composeFile ? ['-f', composeFile] : [];

    const proc = spawn(
        'docker',
        ['compose', ...baseArgs, 'exec', service, ...cmdArgs],
        { cwd: root, stdio: 'inherit' }
    );

    proc.on('close', (code) => process.exit(code));
    proc.on('error', (err) => {
        console.error(chalk.red('✖  ' + err.message));
        process.exit(1);
    });
};
