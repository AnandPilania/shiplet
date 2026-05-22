'use strict';

/**
 * shiplet composer [args...]
 *
 * Runs Composer inside the app container.
 *
 * Examples:
 *   shiplet composer install
 *   shiplet composer require laravel/sanctum
 *   shiplet composer update
 *   shiplet composer dump-autoload
 *   shiplet composer show --installed
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const {
    assertRuntime, findProjectRoot, resolveComposeFile,
    getComposeCmd, readShipletConfig, header,
} = require('../utils/helpers');

module.exports = function composerCommand(args) {
    const root = findProjectRoot();
    if (!root) {
        console.error(chalk.red('\n✖  No shiplet project found. Run `shiplet init` first.\n'));
        process.exit(1);
    }

    const cfg = readShipletConfig(root);
    if (cfg.language && cfg.language !== 'php') {
        console.error(chalk.yellow('\n⚠  This is a Node.js project. Use `shiplet npm` instead.\n'));
        process.exit(1);
    }

    const runtime = assertRuntime(root);
    const [bin, ...base] = getComposeCmd(runtime);
    const composeFile = resolveComposeFile(root);
    const fileFlag = composeFile ? ['-f', composeFile] : [];

    if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
        header('Composer → app');
    }

    const proc = spawn(
        bin,
        [...base, ...fileFlag, 'exec', 'app', 'composer', ...args],
        { cwd: root, stdio: 'inherit' },
    );

    proc.on('error', (err) => {
        console.error(chalk.red(`\n✖  ${err.message}\n`));
        process.exit(1);
    });
    proc.on('close', (code) => process.exit(code ?? 0));
};
