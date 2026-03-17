'use strict';

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// ── Runtime detection ────────────────────────────────────────────────────────

/**
 * Resolve the container runtime to use: docker or podman.
 * Priority:
 *   1. SHIPLET_RUNTIME env var
 *   2. shiplet.config.json "runtime" field in project root
 *   3. Auto-detect: prefer podman if available + running, else docker
 */
function detectRuntime(root) {
    // 1. Explicit env override
    const envRuntime = process.env.SHIPLET_RUNTIME;
    if (envRuntime === 'docker' || envRuntime === 'podman') return envRuntime;

    // 2. Project-level config
    const cfgPath = root && fs.existsSync(path.join(root, 'shiplet.config.json'))
        ? path.join(root, 'shiplet.config.json') : null;
    if (cfgPath) {
        try {
            const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
            if (cfg.runtime === 'docker' || cfg.runtime === 'podman') return cfg.runtime;
        } catch { /* ignore */ }
    }

    // 3. Auto-detect
    const isAvail = (bin) => {
        try { execSync(`${bin} --version`, { stdio: 'pipe' }); return true; } catch { return false; }
    };
    const isRunning = (bin) => {
        try { execSync(`${bin} info`, { stdio: 'pipe' }); return true; } catch { return false; }
    };

    if (isAvail('podman') && isRunning('podman')) return 'podman';
    if (isAvail('docker') && isRunning('docker')) return 'docker';
    return null; // neither running
}

/**
 * Get the compose command for the detected runtime.
 * - docker  → ["docker", "compose"]
 * - podman  → ["podman", "compose"]  (podman-compose or podman compose v4+)
 */
function getComposeCmd(runtime) {
    if (runtime === 'podman') {
        // podman >= 4.7 ships compose natively
        try {
            execSync('podman compose version', { stdio: 'pipe' });
            return ['podman', 'compose'];
        } catch {
            // fall back to standalone podman-compose
            try {
                execSync('podman-compose version', { stdio: 'pipe' });
                return ['podman-compose'];
            } catch {
                return ['podman', 'compose']; // let it fail naturally with a clear error
            }
        }
    }
    return ['docker', 'compose'];
}

/**
 * Assert a supported runtime is installed & running.
 */
function assertRuntime(root) {
    const runtime = detectRuntime(root);
    if (!runtime) {
        console.error(chalk.red('\n✖  No container runtime found (tried Docker and Podman).'));
        console.error(chalk.gray('   • Docker:  https://docs.docker.com/get-docker/'));
        console.error(chalk.gray('   • Podman:  https://podman.io/getting-started/install\n'));
        console.error(chalk.gray('   Or force one: SHIPLET_RUNTIME=docker shiplet up\n'));
        process.exit(1);
    }
    return runtime;
}

// Keep legacy name for backward compat
const assertDocker = assertRuntime;

// ── Project helpers ───────────────────────────────────────────────────────────

/**
 * Find the project root (directory containing shiplet.yml / compose.yml).
 */
function findProjectRoot(start = process.cwd()) {
    let dir = start;
    while (dir !== path.parse(dir).root) {
        if (
            fs.existsSync(path.join(dir, 'shiplet.yml')) ||
            fs.existsSync(path.join(dir, 'shiplet.config.json')) ||
            fs.existsSync(path.join(dir, 'compose.yml')) ||
            fs.existsSync(path.join(dir, 'docker-compose.yml'))
        ) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    return null;
}

/**
 * Resolve which compose file to use.
 */
function resolveComposeFile(root) {
    const candidates = ['shiplet.yml', 'compose.yml', 'docker-compose.yml'];
    for (const f of candidates) {
        const full = path.join(root, f);
        if (fs.existsSync(full)) return full;
    }
    return null;
}

/**
 * Read shiplet.config.json (if present).
 */
function readShipletConfig(root) {
    const cfgPath = root ? path.join(root, 'shiplet.config.json') : null;
    if (cfgPath && fs.existsSync(cfgPath)) {
        try { return JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch { /* ignore */ }
    }
    return {};
}

/**
 * Write / merge shiplet.config.json.
 */
function writeShipletConfig(root, updates) {
    const cfgPath = path.join(root, 'shiplet.config.json');
    const existing = readShipletConfig(root);
    fs.writeFileSync(cfgPath, JSON.stringify({ ...existing, ...updates }, null, 2) + '\n');
}

// ── Compose runner ────────────────────────────────────────────────────────────

/**
 * Run compose with given args, streaming output.
 * Returns a Promise that resolves/rejects on exit.
 */
function runCompose(args, { cwd, env, runtime: forceRuntime } = {}) {
    return new Promise((resolve, reject) => {
        const root = cwd || findProjectRoot();
        if (!root) {
            console.error(chalk.red('\n✖  No shiplet.yml / compose.yml found. Run `shiplet init` first.\n'));
            process.exit(1);
        }

        const runtime = forceRuntime || assertRuntime(root);
        const [bin, ...baseCompose] = getComposeCmd(runtime);
        const composeFile = resolveComposeFile(root);
        const fileFlag = composeFile ? ['-f', composeFile] : [];
        const fullArgs = [...baseCompose, ...fileFlag, ...args];

        const proc = spawn(bin, fullArgs, {
            cwd: root,
            stdio: 'inherit',
            env: { ...process.env, ...env },
        });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${bin} compose exited with code ${code}`));
        });
        proc.on('error', reject);
    });
}

// Legacy alias used across existing commands
const dockerCompose = runCompose;

/**
 * Get list of running services.
 */
function getRunningServices(root) {
    const runtime = detectRuntime(root) || 'docker';
    const [bin, ...baseCompose] = getComposeCmd(runtime);
    const composeFile = resolveComposeFile(root);
    const fileFlag = composeFile ? `-f ${composeFile}` : '';
    try {
        const cmd = `${bin} ${[...baseCompose, fileFlag, 'ps --services --filter status=running'].filter(Boolean).join(' ')}`;
        const out = execSync(cmd, { cwd: root, stdio: 'pipe' }).toString().trim();
        return out ? out.split('\n') : [];
    } catch {
        return [];
    }
}

// ── Output helpers ────────────────────────────────────────────────────────────

function header(text) {
    console.log('\n' + chalk.bold.cyan('  ' + text));
    console.log(chalk.cyan('  ' + '─'.repeat(text.length)) + '\n');
}
function success(msg) { console.log(chalk.green('  ✔  ') + msg); }
function info(msg) { console.log(chalk.blue('  ℹ  ') + msg); }
function warn(msg) { console.log(chalk.yellow('  ⚠  ') + msg); }
function error(msg, exitCode = null) {
    console.error(chalk.red('  ✖  ') + msg);
    if (exitCode !== null) process.exit(exitCode);
}

/** Print runtime badge on startup */
function printRuntimeBadge(root) {
    const runtime = detectRuntime(root);
    if (!runtime) return;
    const badge = runtime === 'podman'
        ? chalk.magenta('  [podman]')
        : chalk.blue('  [docker]');
    console.log(badge + chalk.gray(' runtime active\n'));
}

module.exports = {
    detectRuntime,
    getComposeCmd,
    assertRuntime,
    assertDocker,         // legacy alias
    findProjectRoot,
    resolveComposeFile,
    readShipletConfig,
    writeShipletConfig,
    runCompose,
    dockerCompose,        // legacy alias
    getRunningServices,
    header,
    success,
    info,
    warn,
    error,
    printRuntimeBadge,
};
