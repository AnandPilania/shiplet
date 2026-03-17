'use strict';

/**
 * shiplet upgrade
 *
 * Checks npm for a newer version of shiplet and upgrades if found.
 * Works for both global installs and local devDependencies.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const ora = require('ora');
const { header, success, info } = require('../utils/helpers');
const { version: currentVersion } = require('../../package.json');

function semverGt(a, b) {
    const pa = a.replace(/^v/, '').split('.').map(Number);
    const pb = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return true;
        if ((pa[i] || 0) < (pb[i] || 0)) return false;
    }
    return false;
}

function detectInstallMode() {
    // Is shiplet installed globally or as a local devDep?
    try {
        const globalList = execSync('npm list -g --depth=0 --json', { stdio: 'pipe' }).toString();
        const globals = JSON.parse(globalList);
        if (globals.dependencies?.['shiplet']) return 'global';
    } catch { /* not global */ }
    return 'local';
}

function detectPackageManager(root) {
    if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
    return 'npm';
}

module.exports = async function upgradeCommand(options) {
    header('Upgrade Shiplet');
    info(`Current version: ${chalk.cyan(currentVersion)}`);

    const spinner = ora('Checking npm for latest version…').start();

    let latestVersion;
    try {
        latestVersion = execSync('npm view shiplet version', { stdio: 'pipe' })
            .toString()
            .trim();
        spinner.stop();
    } catch {
        spinner.fail('Could not reach npm registry. Check your network connection.');
        process.exit(1);
    }

    if (!semverGt(latestVersion, currentVersion)) {
        success(`Already on the latest version (${chalk.cyan(currentVersion)}).`);
        return;
    }

    info(`New version available: ${chalk.cyan(latestVersion)}`);

    if (options.check) {
        // --check: just report, don't install
        console.log(`\n  Run ${chalk.cyan('shiplet upgrade')} to install v${latestVersion}.\n`);
        return;
    }

    const mode = detectInstallMode();

    let installSpinner;

    if (mode === 'global') {
        installSpinner = ora(`Upgrading globally to v${latestVersion}…`).start();
        const res = spawnSync('npm', ['install', '-g', `shiplet@${latestVersion}`], { stdio: 'pipe' });
        if (res.status !== 0) {
            installSpinner.fail('Global upgrade failed: ' + (res.stderr?.toString() || ''));
            console.error(chalk.gray('\n  Try: sudo npm install -g shiplet@latest\n'));
            process.exit(1);
        }
        installSpinner.succeed(`Upgraded to v${latestVersion} (global).`);
    } else {
        // Local devDependency
        const cwd = process.cwd();
        const pm = detectPackageManager(cwd);
        const cmds = {
            npm: ['install', '--save-dev', `shiplet@${latestVersion}`],
            yarn: ['add', '--dev', `shiplet@${latestVersion}`],
            pnpm: ['add', '--save-dev', `shiplet@${latestVersion}`],
        };
        installSpinner = ora(`Upgrading locally to v${latestVersion} (${pm})…`).start();
        const res = spawnSync(pm, cmds[pm], { cwd, stdio: 'pipe' });
        if (res.status !== 0) {
            installSpinner.fail('Local upgrade failed: ' + (res.stderr?.toString() || ''));
            process.exit(1);
        }
        installSpinner.succeed(`Upgraded to v${latestVersion} (local devDependency).`);
    }

    console.log(`
  ${chalk.bold('What changed:')}
  ${chalk.cyan('https://github.com/your-org/shiplet/releases/tag/v' + latestVersion)}
  `);
};
