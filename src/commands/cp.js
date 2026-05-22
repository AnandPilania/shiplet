'use strict';

/**
 * shiplet cp <src> <dest>
 *
 * Copy files between host and a running container, like `docker cp`.
 * Supports the container:path syntax automatically.
 *
 * Examples:
 *   shiplet cp app:/var/www/html/logs/app.log ./logs/
 *   shiplet cp ./config/local.json app:/var/www/html/config/
 *   shiplet cp postgres:/var/lib/postgresql/data/pg_hba.conf .
 */

const { spawnSync } = require('child_process');
const chalk = require('chalk');
const {
    assertRuntime, detectRuntime, findProjectRoot,
    getComposeCmd, resolveComposeFile, header, success, error,
} = require('../utils/helpers');

/**
 * Resolve a "service:path" token into a real container ID:path using
 * `compose ps` so users can write "app:/var/log" instead of a container ID.
 */
function resolveToken(token, root, rt) {
    const sep = token.indexOf(':');
    if (sep < 0) return token; // host path

    const service = token.slice(0, sep);
    const fpath = token.slice(sep + 1);

    // Check if it already looks like a real container name/id (has a slash → host path)
    // Simple heuristic: if the service part contains '/' it's a host path, not a service
    if (service.includes('/') || service.includes('.')) return token;

    // Resolve service → container name via compose ps
    const [bin, ...base] = getComposeCmd(rt);
    const cf = resolveComposeFile(root);
    const ff = cf ? ['-f', cf] : [];
    const out = spawnSync(bin, [...base, ...ff, 'ps', '-q', service], {
        cwd: root, stdio: 'pipe',
    });
    const containerId = out.stdout?.toString().trim().split('\n')[0];
    if (containerId) return `${containerId}:${fpath}`;

    // Fall back to using the service name directly
    return `${service}:${fpath}`;
}

module.exports = function cpCommand(src, dest, options = {}) {
    const root = findProjectRoot();
    if (!root) { error('No shiplet project found.', 1); }

    const rt = assertRuntime(root);
    const bin = rt === 'podman' ? 'podman' : 'docker';

    header('Copy');

    const resolvedSrc = resolveToken(src, root, rt);
    const resolvedDest = resolveToken(dest, root, rt);

    console.log(chalk.gray(`  ${resolvedSrc}  →  ${resolvedDest}\n`));

    const args = ['cp'];
    if (options.archive) args.push('-a');
    if (options.followLink) args.push('-L');
    args.push(resolvedSrc, resolvedDest);

    const result = spawnSync(bin, args, { stdio: 'inherit' });

    if (result.error) {
        error(result.error.message, 1);
    } else if (result.status !== 0) {
        process.exit(result.status ?? 1);
    } else {
        success(`Copied: ${src} → ${dest}`);
    }
};
