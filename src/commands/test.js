'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { assertDocker, findProjectRoot, resolveComposeFile, header } = require('../utils/helpers');

function detectTestRunner(root) {
    const pkgPath = path.join(root, 'package.json');
    if (!fs.existsSync(pkgPath)) return 'npm test';

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps['vitest']) return 'npx vitest run';
        if (deps['jest']) return 'npx jest';
        if (deps['mocha']) return 'npx mocha';
        if (pkg.scripts?.test) return 'npm test';
    } catch {/* fall through */ }

    return 'npm test';
}

module.exports = function testCommand(extraArgs) {
    assertDocker();
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    const runner = detectTestRunner(root);
    const fullCmd = [...runner.split(' '), ...extraArgs];

    header(`Running Tests  (${runner})`);

    const composeFile = resolveComposeFile(root);
    const baseArgs = composeFile ? ['-f', composeFile] : [];

    const proc = spawn(
        'docker',
        ['compose', ...baseArgs, 'exec', 'app', ...fullCmd],
        { cwd: root, stdio: 'inherit' }
    );

    proc.on('close', (code) => process.exit(code));
    proc.on('error', (err) => {
        console.error(chalk.red('✖  ' + err.message));
        process.exit(1);
    });
};
