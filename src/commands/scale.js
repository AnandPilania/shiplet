'use strict';

/**
 * shiplet scale <service>=<n> [<service>=<n> ...]
 *
 * Examples:
 *   shiplet scale app=3
 *   shiplet scale worker=4 app=2
 */

const chalk = require('chalk');
const { assertRuntime, runCompose, findProjectRoot, header, success, error } = require('../utils/helpers');

module.exports = async function scaleCommand(specs) {
    const root = findProjectRoot();
    if (!root) { error('No shiplet project found.', 1); }

    assertRuntime(root);
    header('Scale Services');

    if (!specs || !specs.length) {
        error('Usage: shiplet scale <service>=<replicas>  e.g. shiplet scale app=3', 1);
    }

    // validate format
    for (const spec of specs) {
        if (!/^\w+=\d+$/.test(spec)) {
            error(`Invalid spec: ${chalk.cyan(spec)} — expected format: service=N`, 1);
        }
    }

    // docker compose up --scale service=N --scale service=N -d --no-recreate
    const scaleArgs = specs.flatMap(s => ['--scale', s]);

    try {
        await runCompose(['up', '-d', '--no-recreate', ...scaleArgs], { cwd: root });
        specs.forEach(s => {
            const [svc, n] = s.split('=');
            success(`${chalk.cyan(svc)} scaled to ${chalk.bold(n)} replica(s)`);
        });
    } catch (err) {
        error('Scale failed: ' + err.message, 1);
    }
};
