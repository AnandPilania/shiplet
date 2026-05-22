'use strict';

const { spawn } = require('child_process');
const chalk = require('chalk');
const { assertRuntime, findProjectRoot, resolveComposeFile, getComposeCmd, header } = require('../utils/helpers');

module.exports = function shellCommand(service = 'app') {
    const root = findProjectRoot();
    if (!root) {
        console.error(chalk.red('\n✖  No shiplet.yml found. Run `shiplet init` first.\n'));
        process.exit(1);
    }

    const runtime = assertRuntime(root);
    const [bin, ...baseCompose] = getComposeCmd(runtime);
    const composeFile = resolveComposeFile(root);
    const fileFlag = composeFile ? ['-f', composeFile] : [];

    header(`Shell → ${service}`);

    // Try bash first, fall back to sh
    const proc = spawn(
        bin,
        [...baseCompose, ...fileFlag, 'exec', '-it', service, 'bash'],
        { cwd: root, stdio: 'inherit' }
    );

    proc.on('close', (code) => {
        if (code === 126 || code === 127) {
            // bash not found — retry with sh
            const fallback = spawn(
                bin,
                [...baseCompose, ...fileFlag, 'exec', '-it', service, 'sh'],
                { cwd: root, stdio: 'inherit' }
            );
            fallback.on('close', (c) => process.exit(c));
            fallback.on('error', (err) => {
                console.error(chalk.red('✖  ' + err.message));
                process.exit(1);
            });
        } else {
            process.exit(code);
        }
    });

    proc.on('error', (err) => {
        console.error(chalk.red('✖  ' + err.message));
        process.exit(1);
    });
};
