'use strict';

const { spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const { assertDocker, findProjectRoot, header, info } = require('../utils/helpers');

module.exports = async function shareCommand(options) {
    assertDocker();
    findProjectRoot(); // validates we're in a shiplet project

    header('Sharing Your App');

    const port = options.port || '3000';
    info(`Tunneling local port ${chalk.cyan(port)} to the internet…`);
    info('Press Ctrl+C to stop sharing.\n');

    // Prefer lt (localtunnel) — install on the fly if missing
    const args = ['--port', port];
    if (options.subdomain) args.push('--subdomain', options.subdomain);

    const spinner = ora('Starting tunnel…').start();

    // Try npx localtunnel (zero-install approach)
    const proc = spawn('npx', ['localtunnel', ...args], {
        stdio: ['inherit', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line.includes('your url is')) {
            spinner.stop();
            const url = line.split('your url is: ')[1]?.trim() || line;
            console.log(chalk.green('\n  ✔  Public URL: ') + chalk.bold.cyan(url));
            console.log(chalk.gray('     Share this URL with anyone to access your app.\n'));
        } else if (line) {
            console.log(chalk.gray('  ' + line));
        }
    });

    proc.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) console.error(chalk.yellow('  ! ' + line));
    });

    proc.on('close', (code) => {
        spinner.stop();
        if (code !== 0) {
            console.log(chalk.red('\n  ✖  Tunnel closed.'));
            console.log(chalk.gray('  Tip: Make sure localtunnel is available via npx, or install ngrok separately.\n'));
        }
    });

    proc.on('error', () => {
        spinner.fail('Could not start tunnel. Install localtunnel: npm install -g localtunnel');
    });
};
