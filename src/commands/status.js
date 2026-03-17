'use strict';

const { execSync } = require('child_process');
const chalk = require('chalk');
const { assertDocker, findProjectRoot, resolveComposeFile, header } = require('../utils/helpers');

module.exports = function statusCommand() {
    assertDocker();
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    header('Container Status');

    const composeFile = resolveComposeFile(root);
    const fileFlag = composeFile ? `-f ${composeFile}` : '';

    try {
        const out = execSync(`docker compose ${fileFlag} ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"`, {
            cwd: root, encoding: 'utf8',
        });

        const lines = out.trim().split('\n');
        lines.forEach((line, i) => {
            if (i === 0) {
                console.log(chalk.bold.gray('  ' + line));
            } else if (line.includes('running') || line.includes('Up')) {
                console.log(chalk.green('  ' + line));
            } else if (line.includes('exited') || line.includes('Exit')) {
                console.log(chalk.red('  ' + line));
            } else {
                console.log(chalk.yellow('  ' + line));
            }
        });
        console.log('');
    } catch (err) {
        console.error(chalk.red('✖  ' + err.message));
        process.exit(1);
    }
};
