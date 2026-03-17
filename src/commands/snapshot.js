'use strict';

/**
 * shiplet snapshot <action> [name]
 *
 * save    [name]   — dump all data volumes to .shiplet/snapshots/<name>.tar.gz
 * restore [name]   — restore a named snapshot
 * list             — show all snapshots
 * delete  [name]   — remove a snapshot
 *
 * Supports both docker and podman volume inspect/cp patterns.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const {
    assertRuntime, findProjectRoot, resolveComposeFile,
    header, success, info, warn, error,
} = require('../utils/helpers');

const SNAPSHOT_DIR = (root) => path.join(root, '.shiplet', 'snapshots');

function listVolumeNames(root, composeFile, runtime) {
    try {
        const bin = runtime === 'podman' ? 'podman compose' : 'docker compose';
        const ff = composeFile ? `-f ${composeFile}` : '';
        const out = execSync(`${bin} ${ff} config --volumes`, { cwd: root, stdio: 'pipe' })
            .toString().trim().split('\n').filter(Boolean);
        return out;
    } catch {
        return [];
    }
}

function resolveVolumeId(name, root, runtime) {
    // compose volume names are prefixed with the project name
    try {
        const bin = runtime === 'podman' ? 'podman' : 'docker';
        const out = execSync(`${bin} volume ls --format "{{.Name}}"`, { stdio: 'pipe' })
            .toString().trim().split('\n');
        // e.g.  myapp_postgres_data
        return out.find(v => v.endsWith('_' + name) || v === name) || name;
    } catch { return name; }
}

module.exports = async function snapshotCommand(action = 'list', name) {
    const root = findProjectRoot();
    if (!root) { error('No shiplet project found.', 1); }

    const runtime = assertRuntime(root);
    const composeFile = resolveComposeFile(root);
    const snapDir = SNAPSHOT_DIR(root);

    switch (action) {

        case 'save': {
            header('Save Snapshot');
            fs.mkdirSync(snapDir, { recursive: true });

            const snapshotName = name || `snapshot-${Date.now()}`;
            const snapshotPath = path.join(snapDir, snapshotName + '.tar.gz');

            const volumes = listVolumeNames(root, composeFile, runtime);
            if (!volumes.length) { warn('No volumes found in shiplet.yml.'); return; }

            info(`Saving volumes: ${chalk.cyan(volumes.join(', '))}`);

            for (const vol of volumes) {
                const volId = resolveVolumeId(vol, root, runtime);
                const bin = runtime === 'podman' ? 'podman' : 'docker';
                const spinner = ora(`  Snapshotting ${chalk.cyan(vol)}…`).start();

                const res = spawnSync(
                    bin,
                    ['run', '--rm',
                        '-v', `${volId}:/data:ro`,
                        '-v', `${snapDir}:/backup`,
                        'alpine',
                        'tar', '-czf', `/backup/${snapshotName}-${vol}.tar.gz`, '-C', '/data', '.'],
                    { stdio: 'pipe' }
                );

                if (res.status !== 0) {
                    spinner.fail(`Failed to snapshot ${vol}`);
                    console.error(res.stderr?.toString());
                } else {
                    spinner.succeed(`${vol} → ${snapshotName}-${vol}.tar.gz`);
                }
            }

            success(`Snapshot ${chalk.cyan(snapshotName)} saved to .shiplet/snapshots/`);
            break;
        }

        case 'restore': {
            header('Restore Snapshot');
            if (!fs.existsSync(snapDir)) { error('No snapshots directory found.', 1); }

            const files = fs.readdirSync(snapDir).filter(f => f.endsWith('.tar.gz'));
            if (!files.length) { warn('No snapshots found. Run `shiplet snapshot save` first.'); return; }

            let snapshotName = name;
            if (!snapshotName) {
                // group files by snapshot name prefix
                const names = [...new Set(files.map(f => f.replace(/-[^-]+\.tar\.gz$/, '')))];
                const { chosen } = await inquirer.prompt([{
                    type: 'list',
                    name: 'chosen',
                    message: 'Which snapshot to restore?',
                    choices: names,
                }]);
                snapshotName = chosen;
            }

            const { confirmed } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirmed',
                message: chalk.yellow(`This will overwrite current volume data with snapshot ${chalk.cyan(snapshotName)}. Continue?`),
                default: false,
            }]);
            if (!confirmed) { info('Restore cancelled.'); return; }

            const matchingFiles = files.filter(f => f.startsWith(snapshotName + '-'));
            for (const file of matchingFiles) {
                const vol = file.replace(snapshotName + '-', '').replace('.tar.gz', '');
                const volId = resolveVolumeId(vol, root, runtime);
                const bin = runtime === 'podman' ? 'podman' : 'docker';
                const spinner = ora(`  Restoring ${chalk.cyan(vol)}…`).start();

                const res = spawnSync(
                    bin,
                    ['run', '--rm',
                        '-v', `${volId}:/data`,
                        '-v', `${snapDir}:/backup:ro`,
                        'alpine',
                        'sh', '-c', `cd /data && tar -xzf /backup/${file}`],
                    { stdio: 'pipe' }
                );

                if (res.status !== 0) {
                    spinner.fail(`Failed to restore ${vol}`);
                } else {
                    spinner.succeed(`${vol} restored`);
                }
            }

            success(`Snapshot ${chalk.cyan(snapshotName)} restored.`);
            break;
        }

        case 'list': {
            header('Snapshots');
            if (!fs.existsSync(snapDir)) { info('No snapshots yet.'); return; }
            const files = fs.readdirSync(snapDir).filter(f => f.endsWith('.tar.gz'));
            if (!files.length) { info('No snapshots yet.'); return; }

            const names = [...new Set(files.map(f => f.replace(/-[^-]+\.tar\.gz$/, '')))];
            names.forEach((n) => {
                const parts = files.filter(f => f.startsWith(n + '-'));
                const size = parts.reduce((acc, f) => {
                    try { return acc + fs.statSync(path.join(snapDir, f)).size; } catch { return acc; }
                }, 0);
                console.log(`  ${chalk.cyan(n.padEnd(40))} ${chalk.gray((size / 1024 / 1024).toFixed(1) + ' MB')}  (${parts.length} volume(s))`);
            });
            console.log('');
            break;
        }

        case 'delete': {
            header('Delete Snapshot');
            if (!fs.existsSync(snapDir)) { info('No snapshots directory.'); return; }

            let snapshotName = name;
            if (!snapshotName) {
                const files = fs.readdirSync(snapDir).filter(f => f.endsWith('.tar.gz'));
                const names = [...new Set(files.map(f => f.replace(/-[^-]+\.tar\.gz$/, '')))];
                if (!names.length) { info('No snapshots to delete.'); return; }
                const { chosen } = await inquirer.prompt([{
                    type: 'list',
                    name: 'chosen',
                    message: 'Which snapshot to delete?',
                    choices: names,
                }]);
                snapshotName = chosen;
            }

            const toDelete = fs.readdirSync(snapDir).filter(f => f.startsWith(snapshotName + '-') || f === snapshotName + '.tar.gz');
            toDelete.forEach(f => fs.unlinkSync(path.join(snapDir, f)));
            success(`Snapshot ${chalk.cyan(snapshotName)} deleted.`);
            break;
        }

        default:
            error(`Unknown action: ${action}. Use: save, restore, list, delete`, 1);
    }
};
