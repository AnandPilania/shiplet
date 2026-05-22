'use strict';

const { spawn } = require('child_process');
const chalk = require('chalk');
const { assertRuntime, findProjectRoot, resolveComposeFile, getComposeCmd } = require('../utils/helpers');

module.exports = function execCommand(service, cmdArgs) {
    const root = findProjectRoot();
    if (!root) {
        console.error(chalk.red('\n✖  No shiplet.yml found. Run `shiplet init` first.\n'));
        process.exit(1);
    }

    const runtime = assertRuntime(root);
    const [bin, ...baseCompose] = getComposeCmd(runtime);
    const composeFile = resolveComposeFile(root);
    const fileFlag = composeFile ? ['-f', composeFile] : [];

    const proc = spawn(
        bin,
        [...baseCompose, ...fileFlag, 'exec', service, ...cmdArgs],
        { cwd: root, stdio: 'inherit' }
    );

    proc.on('close', (code) => process.exit(code));
    proc.on('error', (err) => {
        console.error(chalk.red('✖  ' + err.message));
        process.exit(1);
    });
};
