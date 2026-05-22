'use strict';

/**
 * shiplet top [service]
 *
 * Shows running processes inside a container, refreshing every 2 seconds.
 * Like `docker top` but auto-picks the right container and loops.
 *
 * shiplet top             → prompts to pick a container
 * shiplet top app         → top for the "app" service
 * shiplet top --once      → print once and exit
 */

const { execSync, spawnSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const {
    assertRuntime, detectRuntime, findProjectRoot, resolveComposeFile,
    getComposeCmd, header, info,
} = require('../utils/helpers');

function run(cmd) {
    try { return execSync(cmd, { stdio: 'pipe', timeout: 5000 }).toString().trim(); }
    catch { return ''; }
}

function getContainerId(service, root, rt) {
    const [bin, ...base] = getComposeCmd(rt);
    const cf = resolveComposeFile(root);
    const ff = cf ? ['-f', cf] : [];
    const out = spawnSync(bin, [...base, ...ff, 'ps', '-q', service], { cwd: root, stdio: 'pipe' });
    return out.stdout?.toString().trim().split('\n')[0] || service;
}

function renderTop(containerId, rt) {
    const bin = rt === 'podman' ? 'podman' : 'docker';
    const out = run(`${bin} top ${containerId} -o pid,ppid,user,%cpu,%mem,vsz,rss,stat,start,time,comm`);
    if (!out) return chalk.gray('  Container is not running.');

    const lines = out.split('\n');
    const header_ = lines[0];
    const rows = lines.slice(1);

    let result = chalk.bold.gray('  ' + header_) + '\n';
    rows.forEach(row => {
        result += chalk.white('  ' + row) + '\n';
    });
    return result;
}

module.exports = async function topCommand(service, options = {}) {
    const root = findProjectRoot();
    if (!root) { require('../utils/helpers').error('No shiplet project found.', 1); }

    const rt = assertRuntime(root);

    // Resolve container
    let target = service;
    if (!target) {
        const bin = rt === 'podman' ? 'podman' : 'docker';
        const names = run(`${bin} ps --format "{{.Names}}"`)
            .split('\n').filter(Boolean);
        if (!names.length) { info('No running containers.'); return; }
        if (names.length === 1) {
            target = names[0];
        } else {
            const { chosen } = await inquirer.prompt([{
                type: 'list', name: 'chosen',
                message: 'Which container?', choices: names,
            }]);
            target = chosen;
        }
    }

    // Resolve service name → container id
    const containerId = getContainerId(target, root, rt);

    header(`shiplet top — ${target}`);

    if (options.once) {
        console.log(renderTop(containerId, rt));
        return;
    }

    // Loop
    console.log(chalk.gray('  Refreshing every 2s. Press Ctrl+C to stop.\n'));
    const printFrame = () => {
        process.stdout.write('\x1b[2J\x1b[H'); // clear
        console.log(chalk.bold.cyan(`  shiplet top — ${target}`) + chalk.gray(`  [${new Date().toLocaleTimeString()}]\n`));
        console.log(renderTop(containerId, rt));
    };

    printFrame();
    const timer = setInterval(printFrame, 2000);

    process.on('SIGINT', () => {
        clearInterval(timer);
        console.log('\n');
        process.exit(0);
    });
};
