'use strict';

/**
 * shiplet php [args...]         — run php binary
 * shiplet artisan [args...]     — shortcut for `shiplet php artisan`
 * shiplet wp [args...]          — shortcut for `shiplet php wp` (WP-CLI)
 * shiplet console [args...]     — shortcut for `shiplet php bin/console` (Symfony)
 *
 * Examples:
 *   shiplet php --version
 *   shiplet php artisan migrate
 *   shiplet php artisan tinker
 *   shiplet php artisan queue:work
 *   shiplet php bin/console doctrine:migrations:migrate
 *   shiplet php -r "echo phpversion();"
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const {
    assertRuntime, findProjectRoot, resolveComposeFile,
    getComposeCmd, readShipletConfig,
} = require('../utils/helpers');

function runInContainer(extraArgs, label) {
    const root = findProjectRoot();
    if (!root) {
        console.error(chalk.red(`\n✖  No shiplet project found. Run \`shiplet init\` first.\n`));
        process.exit(1);
    }

    const runtime = assertRuntime(root);
    const [bin, ...base] = getComposeCmd(runtime);
    const composeFile = resolveComposeFile(root);
    const fileFlag = composeFile ? ['-f', composeFile] : [];

    const proc = spawn(
        bin,
        [...base, ...fileFlag, 'exec', 'app', ...extraArgs],
        { cwd: root, stdio: 'inherit' },
    );

    proc.on('error', (err) => {
        console.error(chalk.red(`\n✖  ${label} failed: ${err.message}\n`));
        process.exit(1);
    });
    proc.on('close', (code) => process.exit(code ?? 0));
}

// shiplet php [args...]
function phpCommand(args) {
    runInContainer(['php', ...args], 'php');
}

// shiplet artisan [args...]  →  php artisan [args...]
function artisanCommand(args) {
    runInContainer(['php', 'artisan', ...args], 'artisan');
}

// shiplet wp [args...]  →  php wp [args...]
function wpCommand(args) {
    runInContainer(['php', 'wp', '--allow-root', ...args], 'wp-cli');
}

// shiplet console [args...]  →  php bin/console [args...]
function consoleCommand(args) {
    runInContainer(['php', 'bin/console', ...args], 'symfony console');
}

module.exports = { phpCommand, artisanCommand, wpCommand, consoleCommand };
