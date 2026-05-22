'use strict';

/**
 * shiplet port [service]
 *
 * Lists all host→container port mappings for the project.
 * If --check is passed, warns about any ports already in use on the host.
 */

const { execSync } = require('child_process');
const chalk = require('chalk');
const {
    assertRuntime, detectRuntime, findProjectRoot,
    resolveComposeFile, getComposeCmd, header, info, warn, success,
} = require('../utils/helpers');

function run(cmd, opts = {}) {
    try { return execSync(cmd, { stdio: 'pipe', timeout: 8000, ...opts }).toString().trim(); }
    catch { return ''; }
}

function isPortInUse(port) {
    const result =
        run(`lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null`) ||
        run(`ss -tlnp 2>/dev/null | grep ":${port} "`);
    return !!result;
}

module.exports = function portCommand(service, options = {}) {
    const root = findProjectRoot();
    if (!root) { require('../utils/helpers').error('No shiplet project found.', 1); }

    const rt = assertRuntime(root);
    const [bin, ...base] = getComposeCmd(rt);
    const cf = resolveComposeFile(root);
    const ff = cf ? ['-f', cf] : [];

    header('Port Mappings');

    // Get running containers with ports
    const fmt = '{{.Name}}\t{{.Ports}}';
    const raw = run(`${bin} ${rt === 'podman' ? '' : 'compose ' + ff.join(' ')} ps -a --format "${fmt}"`)
        .split('\n').filter(Boolean);

    if (!raw.length) {
        info('No containers found. Run `shiplet up` first.');
        return;
    }

    let hasConflict = false;

    raw.forEach(line => {
        const [name, ports] = line.split('\t');
        if (!ports?.trim()) return;
        if (service && !name.toLowerCase().includes(service.toLowerCase())) return;

        console.log(chalk.bold(`  ${name}`));

        const portMappings = ports.split(',').map(p => p.trim()).filter(Boolean);
        portMappings.forEach(mapping => {
            // e.g. "0.0.0.0:5432->5432/tcp"
            const m = mapping.match(/^([\d.]+):(\d+)->(\d+)\/(tcp|udp)$/);
            if (!m) {
                console.log(chalk.gray(`    ${mapping}`));
                return;
            }
            const [, host, hostPort, containerPort, proto] = m;
            const inUse = options.check ? isPortInUse(hostPort) : false;
            const portStr = chalk.cyan(`${hostPort}`) + chalk.gray(` → ${containerPort}/${proto}`);
            const hostStr = host === '0.0.0.0' ? chalk.gray('all interfaces') : chalk.gray(host);

            if (inUse) {
                hasConflict = true;
                console.log(chalk.yellow(`    ⚠  ${portStr}  ${hostStr}`) + chalk.red('  [CONFLICT]'));
            } else {
                console.log(`    ✓  ${portStr}  ${hostStr}`);
            }
        });
        console.log('');
    });

    if (options.check) {
        if (hasConflict) {
            warn('Port conflicts detected. Change the host port in shiplet.yml or .env, then run `shiplet up`.');
        } else {
            success('No port conflicts detected.');
        }
    }
};
