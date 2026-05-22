'use strict';

const { execSync } = require('child_process');
const chalk = require('chalk');
const { assertRuntime, findProjectRoot, resolveComposeFile, getComposeCmd, header } = require('../utils/helpers');

module.exports = function statusCommand() {
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    const runtime = assertRuntime(root);
    const [bin, ...baseCompose] = getComposeCmd(runtime);
    const composeFile = resolveComposeFile(root);
    const fileFlag = composeFile ? ['-f', composeFile] : '';
    const fileFlagStr = composeFile ? `-f ${composeFile}` : '';

    header('Container Status');

    try {
        const cmd = `${bin} ${[...baseCompose, fileFlagStr].filter(Boolean).join(' ')} ps --format "table {{.Name}}\\t{{.Status}}\\t{{.Ports}}"`;
        const out = execSync(cmd, { cwd: root, encoding: 'utf8' });

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
