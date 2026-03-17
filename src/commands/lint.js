'use strict';

/**
 * shiplet lint [--fix]
 *
 * Auto-detects and runs:
 *   eslint, biome, oxlint, prettier, tsc --noEmit
 * inside the app container.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');
const {
    assertRuntime, findProjectRoot, resolveComposeFile,
    getComposeCmd, header, info, warn,
} = require('../utils/helpers');

function hasConfig(root, files) {
    return files.some(f => fs.existsSync(path.join(root, f)));
}

function detectLinters(root) {
    const pkgPath = path.join(root, 'package.json');
    let deps = {};
    try { deps = { ...JSON.parse(fs.readFileSync(pkgPath, 'utf8')).devDependencies }; } catch { }

    const linters = [];

    if (deps['@biomejs/biome'] || hasConfig(root, ['biome.json', 'biome.jsonc'])) {
        linters.push({ name: 'biome', cmd: (fix) => ['npx', 'biome', fix ? 'check --apply' : 'check', '.'] });
    }
    if (deps['oxlint']) {
        linters.push({ name: 'oxlint', cmd: (fix) => ['npx', 'oxlint', fix ? '--fix' : '', '.'].filter(Boolean) });
    }
    if (deps['eslint'] || hasConfig(root, ['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs', 'eslint.config.js', 'eslint.config.mjs'])) {
        linters.push({ name: 'eslint', cmd: (fix) => ['npx', 'eslint', fix ? '--fix' : '', '.'].filter(Boolean) });
    }
    if (deps['prettier'] || hasConfig(root, ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js'])) {
        linters.push({ name: 'prettier', cmd: (fix) => ['npx', 'prettier', fix ? '--write' : '--check', '.'] });
    }
    if (deps['typescript'] || hasConfig(root, ['tsconfig.json'])) {
        linters.push({ name: 'tsc', cmd: () => ['npx', 'tsc', '--noEmit'] });
    }

    return linters;
}

module.exports = async function lintCommand(options) {
    const root = findProjectRoot();
    if (!root) { require('../utils/helpers').error('No shiplet project found.', 1); }

    const runtime = assertRuntime(root);
    const composeFile = resolveComposeFile(root);
    const [bin, ...baseCompose] = getComposeCmd(runtime);
    const fileFlag = composeFile ? ['-f', composeFile] : [];

    const linters = detectLinters(root);

    header(`Lint${options.fix ? ' & Fix' : ''}`);

    if (!linters.length) {
        warn('No linters detected in this project.');
        info('Install eslint, biome, prettier, or oxlint to enable auto-linting.');
        return;
    }

    info(`Linters detected: ${linters.map(l => chalk.cyan(l.name)).join(', ')}\n`);

    let allPassed = true;

    for (const linter of linters) {
        const cmd = linter.cmd(options.fix || false);
        process.stdout.write(chalk.bold(`  ── ${linter.name} `));

        await new Promise((resolve) => {
            const proc = spawn(
                bin,
                [...baseCompose, ...fileFlag, 'exec', 'app', ...cmd],
                { cwd: root, stdio: ['inherit', 'pipe', 'pipe'] }
            );

            let out = '';
            let err = '';
            proc.stdout.on('data', d => { out += d.toString(); });
            proc.stderr.on('data', d => { err += d.toString(); });

            proc.on('close', (code) => {
                if (code === 0) {
                    console.log(chalk.green('✔ passed'));
                } else {
                    console.log(chalk.red('✖ failed'));
                    allPassed = false;
                    if (out.trim()) console.log(chalk.gray(out.split('\n').map(l => '    ' + l).join('\n')));
                    if (err.trim()) console.error(chalk.red(err.split('\n').map(l => '    ' + l).join('\n')));
                }
                resolve();
            });
        });
    }

    console.log('');
    if (allPassed) {
        require('../utils/helpers').success('All linters passed.');
    } else {
        require('../utils/helpers').error('Some linters failed. Run `shiplet lint --fix` to auto-fix where possible.');
        process.exit(1);
    }
};
