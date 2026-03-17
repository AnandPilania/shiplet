'use strict';

const { spawn } = require('child_process');
const chalk = require('chalk');
const { assertDocker, findProjectRoot, resolveComposeFile, header } = require('../utils/helpers');

module.exports = function shellCommand(service = 'app') {
    assertDocker();
    const root = findProjectRoot();
    if (!root) {
        console.error(chalk.red('\n✖  No shiplet.yml found. Run `shiplet init` first.\n'));
        process.exit(1);
    }

    header(`Shell → ${service}`);

    const composeFile = resolveComposeFile(root);
    const baseArgs = composeFile ? ['-f', composeFile] : [];

    // Try bash first, fall back to sh
    const proc = spawn(
        'docker',
        ['compose', ...baseArgs, 'exec', '-it', service, 'bash'],
        { cwd: root, stdio: 'inherit' }
    );

    proc.on('close', (code) => {
        if (code === 126 || code === 127) {
            // bash not found — retry with sh
            const fallback = spawn(
                'docker',
                ['compose', ...baseArgs, 'exec', '-it', service, 'sh'],
                { cwd: root, stdio: 'inherit' }
            );
            fallback.on('close', (c) => process.exit(c));
        } else {
            process.exit(code);
        }
    });
};
