'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findProjectRoot, header, success, info } = require('../utils/helpers');

module.exports = function publishCommand() {
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    header('Publishing Dockerfiles');

    const shipletDir = path.join(root, '.shiplet');
    const dockerfile = path.join(shipletDir, 'Dockerfile');

    if (!fs.existsSync(dockerfile)) {
        console.error(chalk.red('✖  No .shiplet/Dockerfile found. Run `shiplet init` first.'));
        process.exit(1);
    }

    // Copy into a "docker" folder at the root (fully ejected)
    const outDir = path.join(root, 'docker');
    fs.mkdirSync(outDir, { recursive: true });

    const src = dockerfile;
    const dest = path.join(outDir, 'Dockerfile');
    fs.copyFileSync(src, dest);

    success(`Dockerfile ejected to ${chalk.cyan('docker/Dockerfile')}`);
    info('You can now freely edit docker/Dockerfile and shiplet.yml.');
    info('Update the `build.context` and `dockerfile` paths in shiplet.yml accordingly.\n');
};
