'use strict';

/**
 * shiplet bun [args...]
 *
 * Runs Bun inside the app container for Bun-based projects.
 *
 * Examples:
 *   shiplet bun install
 *   shiplet bun run dev
 *   shiplet bun run build
 *   shiplet bun add hono
 *   shiplet bun remove lodash
 *   shiplet bun test
 *   shiplet bun --version
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const {
    assertRuntime, findProjectRoot, resolveComposeFile,
    getComposeCmd, readShipletConfig, header,
} = require('../utils/helpers');

module.exports = function bunCommand(args) {
    const root = findProjectRoot();
    if (!root) {
        console.error(chalk.red('\n✖  No shiplet project found. Run `shiplet init` first.\n'));
        process.exit(1);
    }

    const cfg = readShipletConfig(root);

    // Warn if this is not a Bun project
    if (cfg.runtime !== 'bun' && cfg.packageManager !== 'bun' &&
        cfg.template && !cfg.template.startsWith('bun-')) {
        console.warn(chalk.yellow(
            '\n⚠  This project is not configured for Bun. ' +
            'If you want Bun, run `shiplet init --language bun` in a new project.\n'
        ));
    }

    const runtime = assertRuntime(root);
    const [bin, ...base] = getComposeCmd(runtime);
    const composeFile = resolveComposeFile(root);
    const fileFlag = composeFile ? ['-f', composeFile] : [];

    if (args.length === 0) {
        header('Bun → app');
        args = ['--version'];
    }

    const proc = spawn(
        bin,
        [...base, ...fileFlag, 'exec', 'app', 'bun', ...args],
        { cwd: root, stdio: 'inherit' }
    );

    proc.on('error', (err) => {
        console.error(chalk.red(`\n✖  bun failed: ${err.message}\n`));
        process.exit(1);
    });

    proc.on('close', (code) => process.exit(code ?? 0));
};
