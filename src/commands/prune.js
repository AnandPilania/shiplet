'use strict';

/**
 * shiplet prune [target]
 *
 * Targets: containers | images | volumes | networks | all
 * Shows what will be removed and asks for confirmation unless --force.
 */

const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const {
    assertRuntime, detectRuntime, findProjectRoot, header, success, warn, info,
} = require('../utils/helpers');

function run(cmd) {
    try { return execSync(cmd, { stdio: 'pipe', timeout: 30_000 }).toString().trim(); }
    catch (e) { return e.stderr?.toString().trim() || ''; }
}

const TARGETS = {
    containers: {
        label: 'Stopped containers',
        preview: (bin) => run(`${bin} ps -a -q -f status=exited`).split('\n').filter(Boolean),
        cmd: (bin) => `${bin} container prune -f`,
    },
    images: {
        label: 'Dangling images',
        preview: (bin) => run(`${bin} images -f dangling=true --format "{{.Repository}}:{{.Tag}} ({{.ID}})"`)
            .split('\n').filter(Boolean),
        cmd: (bin) => `${bin} image prune -f`,
    },
    volumes: {
        label: 'Unused volumes',
        preview: (bin) => run(`${bin} volume ls -qf dangling=true`).split('\n').filter(Boolean),
        cmd: (bin) => `${bin} volume prune -f`,
    },
    networks: {
        label: 'Unused networks',
        preview: (bin) => {
            const all = run(`${bin} network ls --format "{{.Name}}"`)
                .split('\n').filter(Boolean)
                .filter(n => !['bridge', 'host', 'none'].includes(n));
            return all;
        },
        cmd: (bin) => `${bin} network prune -f`,
    },
    all: {
        label: 'All unused resources (containers + images + volumes + networks)',
        preview: (bin) => ['This will free all unused Docker/Podman resources.'],
        cmd: (bin) => `${bin} system prune -af --volumes`,
    },
};

module.exports = async function pruneCommand(target, options = {}) {
    const root = findProjectRoot() || process.cwd();
    const rt = assertRuntime(root);
    const bin = rt === 'podman' ? 'podman' : 'docker';

    header('Prune');

    // Interactive picker if no target given
    if (!target) {
        const { chosen } = await inquirer.prompt([{
            type: 'list',
            name: 'chosen',
            message: 'What to prune?',
            choices: [
                { name: '🗑  Stopped containers', value: 'containers' },
                { name: '🖼  Dangling images', value: 'images' },
                { name: '💾  Unused volumes', value: 'volumes' },
                { name: '🌐  Unused networks', value: 'networks' },
                { name: '🧹  Everything (system prune)', value: 'all' },
            ],
        }]);
        target = chosen;
    }

    const cfg = TARGETS[target];
    if (!cfg) {
        require('../utils/helpers').error(`Unknown target: ${target}\nValid: ${Object.keys(TARGETS).join(', ')}`, 1);
    }

    // Preview
    const items = cfg.preview(bin);
    if (items.length === 0 && target !== 'all') {
        success(`Nothing to prune for "${target}".`);
        return;
    }

    info(`${cfg.label} (${target === 'all' ? 'system prune' : items.length + ' item(s)'}):`);
    if (target !== 'all') {
        items.slice(0, 10).forEach(i => console.log(chalk.gray('    ' + i)));
        if (items.length > 10) console.log(chalk.gray(`    … and ${items.length - 10} more`));
    }
    console.log('');

    if (!options.force) {
        const { confirmed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmed',
            message: chalk.yellow(`Prune ${cfg.label.toLowerCase()}? This cannot be undone.`),
            default: false,
        }]);
        if (!confirmed) { info('Prune cancelled.'); return; }
    }

    const spinner = ora(`Pruning ${target}…`).start();
    const out = run(cfg.cmd(bin));
    spinner.succeed(`Pruned ${target}.`);
    if (out) console.log(chalk.gray('\n  ' + out.split('\n').join('\n  ') + '\n'));
};
