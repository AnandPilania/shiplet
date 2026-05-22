'use strict';

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// ── Runtime cache (avoids repeated execSync on every command) ────────────────
let _runtimeCache = null;
let _runtimeCacheTime = 0;
const RUNTIME_CACHE_TTL = 10_000; // 10 s

/**
 * Resolve the container runtime: docker | podman | null.
 * Priority: SHIPLET_RUNTIME env → shiplet.config.json → auto-detect.
 * Result is cached for 10 s to avoid hammering execSync on every call.
 */
function detectRuntime(root, { forceRefresh = false } = {}) {
    const now = Date.now();
    if (!forceRefresh && _runtimeCache && (now - _runtimeCacheTime) < RUNTIME_CACHE_TTL) {
        return _runtimeCache;
    }

    // 1. Explicit env override
    const envRuntime = process.env.SHIPLET_RUNTIME;
    if (envRuntime === 'docker' || envRuntime === 'podman') {
        _runtimeCache = envRuntime;
        _runtimeCacheTime = now;
        return envRuntime;
    }

    // 2. Project-level config
    if (root) {
        const cfgPath = path.join(root, 'shiplet.config.json');
        if (fs.existsSync(cfgPath)) {
            try {
                const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
                if (cfg.runtime === 'docker' || cfg.runtime === 'podman') {
                    _runtimeCache = cfg.runtime;
                    _runtimeCacheTime = now;
                    return cfg.runtime;
                }
            } catch { /* ignore malformed config */ }
        }
    }

    // 3. Auto-detect — check binary availability then daemon liveness
    const isAvail = (bin) => {
        try { execSync(`${bin} --version`, { stdio: 'pipe', timeout: 3000 }); return true; }
        catch { return false; }
    };
    const isRunning = (bin) => {
        try { execSync(`${bin} info`, { stdio: 'pipe', timeout: 5000 }); return true; }
        catch { return false; }
    };

    let detected = null;
    if (isAvail('podman') && isRunning('podman')) detected = 'podman';
    else if (isAvail('docker') && isRunning('docker')) detected = 'docker';

    _runtimeCache = detected;
    _runtimeCacheTime = now;
    return detected;
}

/** Bust the runtime cache (call after shiplet runtime switch) */
function invalidateRuntimeCache() {
    _runtimeCache = null;
    _runtimeCacheTime = 0;
}

/**
 * Get the compose command array for a given runtime.
 * docker  → ['docker', 'compose']
 * podman  → ['podman', 'compose'] or ['podman-compose']
 */
function getComposeCmd(runtime) {
    if (runtime === 'podman') {
        try {
            execSync('podman compose version', { stdio: 'pipe', timeout: 3000 });
            return ['podman', 'compose'];
        } catch {
            try {
                execSync('podman-compose version', { stdio: 'pipe', timeout: 3000 });
                return ['podman-compose'];
            } catch {
                return ['podman', 'compose']; // let it fail with a clear error
            }
        }
    }
    return ['docker', 'compose'];
}

/**
 * Assert a supported runtime is installed and running.
 * Returns the runtime string, exits the process on failure.
 */
function assertRuntime(root) {
    const runtime = detectRuntime(root);
    if (!runtime) {
        console.error(chalk.red('\n✖  No container runtime found/initialized/started (tried Docker and Podman).'));
        console.error(chalk.gray('   • Docker:  https://docs.docker.com/get-docker/'));
        console.error(chalk.gray('   • Podman:  https://podman.io/getting-started/install'));
        console.error(chalk.gray('   • Force one: SHIPLET_RUNTIME=docker shiplet up\n'));
        process.exit(1);
    }
    return runtime;
}

// Legacy alias
const assertDocker = assertRuntime;

// ── Project helpers ───────────────────────────────────────────────────────────

/**
 * Walk up from `start` to find the first directory containing a shiplet/compose file.
 */
function findProjectRoot(start = process.cwd()) {
    let dir = start;
    while (dir !== path.parse(dir).root) {
        if (
            fs.existsSync(path.join(dir, 'shiplet.yml')) ||
            fs.existsSync(path.join(dir, 'shiplet.config.json')) ||
            fs.existsSync(path.join(dir, 'compose.yml')) ||
            fs.existsSync(path.join(dir, 'docker-compose.yml'))
        ) return dir;
        dir = path.dirname(dir);
    }
    return null;
}

/**
 * Resolve the compose file path in order of preference.
 */
function resolveComposeFile(root) {
    if (!root) return null;
    for (const f of ['shiplet.yml', 'compose.yml', 'docker-compose.yml']) {
        const full = path.join(root, f);
        if (fs.existsSync(full)) return full;
    }
    return null;
}

/**
 * Read shiplet.config.json safely. Returns {} if absent or malformed.
 */
function readShipletConfig(root) {
    if (!root) return {};
    const cfgPath = path.join(root, 'shiplet.config.json');
    if (!fs.existsSync(cfgPath)) return {};
    try { return JSON.parse(fs.readFileSync(cfgPath, 'utf8')); }
    catch { return {}; }
}

/**
 * Merge `updates` into shiplet.config.json (creates if absent).
 */
function writeShipletConfig(root, updates) {
    const cfgPath = path.join(root, 'shiplet.config.json');
    const existing = readShipletConfig(root);
    fs.writeFileSync(cfgPath, JSON.stringify({ ...existing, ...updates }, null, 2) + '\n');
    // Bust cache so next detectRuntime sees the new value
    invalidateRuntimeCache();
}

// ── Compose runner ────────────────────────────────────────────────────────────

/**
 * Spawn compose with `args`, streaming stdio.  Returns a Promise.
 * Cleans up the child process on SIGINT so we never leave orphans.
 */
function runCompose(args, { cwd: cwdOpt, env: extraEnv, runtime: forceRuntime } = {}) {
    return new Promise((resolve, reject) => {
        const root = cwdOpt || findProjectRoot();
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
            env: { ...process.env, ...extraEnv },
        });

        // Guarantee child cleanup on parent SIGINT
        const onSigint = () => { try { proc.kill('SIGTERM'); } catch { } };
        process.once('SIGINT', onSigint);

        proc.on('close', (code) => {
            process.removeListener('SIGINT', onSigint);
            if (code === 0 || code === null) resolve();
            else reject(new Error(`${bin} compose exited with code ${code}`));
        });

        proc.on('error', (err) => {
            process.removeListener('SIGINT', onSigint);
            reject(err);
        });
    });
}

// Legacy alias
const dockerCompose = runCompose;

/**
 * Get names of currently-running services for a project.
 */
function getRunningServices(root) {
    const runtime = detectRuntime(root) || 'docker';
    const [bin, ...base] = getComposeCmd(runtime);
    const cf = resolveComposeFile(root);
    const fileFlag = cf ? ['-f', cf] : [];
    try {
        const out = execSync(
            [bin, ...base, ...fileFlag, 'ps', '--services', '--filter', 'status=running'].join(' '),
            { cwd: root, stdio: 'pipe', timeout: 8000 }
        ).toString().trim();
        return out ? out.split('\n').filter(Boolean) : [];
    } catch {
        return [];
    }
}

/**
 * Sanitise a string for safe use in a shell argument.
 * Rejects anything that isn't alphanumeric + common container-name chars.
 */
function sanitiseContainerName(name) {
    if (!/^[a-zA-Z0-9_.\-/]+$/.test(name)) {
        throw new Error(`Unsafe container name: "${name}"`);
    }
    return name;
}

/** Sanitise a positive integer string (lines, etc.) */
function sanitiseInt(val, fallback = '100') {
    const n = parseInt(val, 10);
    return (!isNaN(n) && n > 0) ? String(n) : fallback;
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

function printRuntimeBadge(root) {
    const runtime = detectRuntime(root);
    if (!runtime) return;
    const badge = runtime === 'podman' ? chalk.magenta('  [podman]') : chalk.blue('  [docker]');
    console.log(badge + chalk.gray(' runtime active\n'));
}

module.exports = {
    // Runtime
    detectRuntime,
    invalidateRuntimeCache,
    getComposeCmd,
    assertRuntime,
    assertDocker,       // legacy alias
    // Project
    findProjectRoot,
    resolveComposeFile,
    readShipletConfig,
    writeShipletConfig,
    // Compose
    runCompose,
    dockerCompose,      // legacy alias
    getRunningServices,
    // Security
    sanitiseContainerName,
    sanitiseInt,
    // Output
    header,
    success,
    info,
    warn,
    error,
    printRuntimeBadge,
};
