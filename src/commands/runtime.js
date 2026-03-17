'use strict';

/**
 * shiplet runtime [show|switch|check]
 *
 * show   — print which runtime is active and why
 * switch — interactively switch between docker and podman (updates shiplet.config.json)
 * check  — validate both runtimes and compose plugins
 */

const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const {
    detectRuntime, findProjectRoot, readShipletConfig, writeShipletConfig,
    header, success, info, warn, error,
} = require('../utils/helpers');

function probe(bin) {
    const checks = {};
    try {
        const v = execSync(`${bin} --version`, { stdio: 'pipe' }).toString().trim();
        checks.version = v.split('\n')[0];
        checks.available = true;
    } catch { checks.available = false; }

    try {
        execSync(`${bin} info`, { stdio: 'pipe' });
        checks.running = true;
    } catch { checks.running = false; }

    // compose plugin
    try {
        const cv = execSync(`${bin} compose version`, { stdio: 'pipe' }).toString().trim();
        checks.composeVersion = cv;
        checks.composeAvail = true;
    } catch { checks.composeAvail = false; }

    return checks;
}

module.exports = async function runtimeCommand(action = 'show') {
    const root = findProjectRoot();
    const config = readShipletConfig(root);
    const active = detectRuntime(root);

    switch (action) {

        case 'show': {
            header('Container Runtime');

            const source =
                process.env.SHIPLET_RUNTIME ? chalk.cyan('SHIPLET_RUNTIME env var') :
                    config.runtime ? chalk.cyan('shiplet.config.json') :
                        active ? chalk.gray('auto-detected') :
                            chalk.red('none found');

            console.log(`  Active runtime  : ${active ? chalk.bold(active) : chalk.red('none')}  ${chalk.gray('(' + source + ')')}`);
            if (config.runtime) {
                info(`Pinned in shiplet.config.json to: ${chalk.cyan(config.runtime)}`);
            }
            console.log('');

            for (const bin of ['docker', 'podman']) {
                const p = probe(bin);
                const label = bin === active ? chalk.bold.green(bin + ' ◀ active') : chalk.gray(bin);
                console.log(`  ${label}`);
                console.log(`    installed : ${p.available ? chalk.green('yes') : chalk.red('no')}  ${p.version ? chalk.gray(p.version) : ''}`);
                console.log(`    running   : ${p.running ? chalk.green('yes') : chalk.red('no')}`);
                console.log(`    compose   : ${p.composeAvail ? chalk.green('yes') : chalk.red('no')}  ${p.composeVersion ? chalk.gray(p.composeVersion) : ''}`);
                console.log('');
            }
            break;
        }

        case 'switch': {
            header('Switch Runtime');
            if (!root) { error('No shiplet project found. Run `shiplet init` first.', 1); }

            const { runtime } = await inquirer.prompt([{
                type: 'list',
                name: 'runtime',
                message: 'Switch to:',
                choices: ['docker', 'podman'],
                default: active === 'podman' ? 'docker' : 'podman',
            }]);

            const p = probe(runtime);
            if (!p.available) { error(`${runtime} is not installed.`, 1); }
            if (!p.running) { warn(`${runtime} is installed but not running. Start it before using shiplet up.`); }
            if (!p.composeAvail) {
                warn(`${runtime} compose plugin not found.`);
                if (runtime === 'podman') info('Install: pip3 install podman-compose  or  update Podman to ≥4.7');
                if (runtime === 'docker') info('Install Docker Desktop or the compose plugin: https://docs.docker.com/compose/install/');
            }

            writeShipletConfig(root, { runtime });
            success(`Runtime pinned to ${chalk.bold(runtime)} in shiplet.config.json`);
            info('Run `shiplet up` to restart with the new runtime.');
            break;
        }

        case 'check': {
            header('Runtime Check');
            let allOk = true;

            for (const bin of ['docker', 'podman']) {
                const p = probe(bin);
                console.log(`  ${chalk.bold(bin)}`);

                const items = [
                    ['binary available', p.available],
                    ['daemon running', p.running],
                    ['compose available', p.composeAvail],
                ];
                for (const [label, ok] of items) {
                    console.log(`    ${ok ? chalk.green('✔') : chalk.red('✖')}  ${label}`);
                    if (!ok) allOk = false;
                }
                console.log('');
            }

            if (allOk) {
                success('Both runtimes are fully operational.');
            } else {
                warn('Some checks failed — see above. At least one runtime must pass all checks.');
            }
            break;
        }

        default:
            error(`Unknown action: ${action}. Use: show, switch, check`, 1);
    }
};
