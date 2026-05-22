'use strict';

/**
 * shiplet doctor
 *
 * Runs a full diagnostic of the local environment and current project:
 *   - OS, Node.js, npm/yarn/pnpm versions
 *   - Docker/Podman availability and daemon status
 *   - Compose plugin version
 *   - shiplet.config.json validity
 *   - shiplet.yml / compose.yml validity (docker compose config)
 *   - .env file completeness vs .env.example
 *   - Port conflicts for configured ports
 *   - Disk space warning
 *   - Dangling images / stopped containers count
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const chalk = require('chalk');
const {
    detectRuntime, getComposeCmd, findProjectRoot, resolveComposeFile,
    readShipletConfig, header, success, info, warn, error,
} = require('../utils/helpers');

function run(cmd, opts = {}) {
    try { return execSync(cmd, { stdio: 'pipe', timeout: 6000, ...opts }).toString().trim(); }
    catch { return ''; }
}

function check(label, pass, detail = '') {
    const icon = pass ? chalk.green('  ✔') : chalk.red('  ✖');
    const text = pass ? chalk.white(label) : chalk.red(label);
    const extra = detail ? chalk.gray('  ' + detail) : '';
    console.log(`${icon}  ${text}${extra}`);
    return pass;
}

function checkWarn(label, pass, detail = '') {
    const icon = pass ? chalk.green('  ✔') : chalk.yellow('  ⚠');
    const text = pass ? chalk.white(label) : chalk.yellow(label);
    const extra = detail ? chalk.gray('  ' + detail) : '';
    console.log(`${icon}  ${text}${extra}`);
    return pass;
}

function section(title) {
    console.log('\n' + chalk.bold.gray('  ── ' + title + ' ──'));
}

module.exports = async function doctorCommand() {
    header('shiplet doctor');
    let issues = 0;
    const root = findProjectRoot();

    // ── System ───────────────────────────────────────────────────────────────
    section('System');

    const nodeVer = process.version;
    const nodeMaj = parseInt(nodeVer.slice(1), 10);
    if (!check(`Node.js ${nodeVer}`, nodeMaj >= 16, nodeMaj < 16 ? 'Requires ≥ 16' : '')) issues++;

    const npmVer = run('npm --version');
    check(`npm ${npmVer || '?'}`, !!npmVer);

    const osInfo = `${os.type()} ${os.release()} (${os.arch()})`;
    info(`OS: ${osInfo}`);

    const freeMB = Math.floor(os.freemem() / 1048576);
    const totalMB = Math.floor(os.totalmem() / 1048576);
    if (!checkWarn(`Free memory: ${freeMB} MB / ${totalMB} MB`, freeMB > 512,
        freeMB <= 512 ? 'Low memory may affect container performance' : '')) {
        // warn only, don't increment issues
    }

    // Disk space
    const dfOut = run("df -h . 2>/dev/null | tail -1 | awk '{print $4, $5}'");
    if (dfOut) {
        const [avail, used] = dfOut.split(' ');
        const pct = parseInt(used, 10);
        if (!checkWarn(`Disk space: ${avail} available (${used} used)`, pct < 90,
            pct >= 90 ? 'Disk nearly full — containers may fail to start' : '')) {
            // warn only
        }
    }

    // ── Runtime ───────────────────────────────────────────────────────────────
    section('Container Runtime');

    for (const rt of ['docker', 'podman']) {
        const ver = run(`${rt} --version 2>/dev/null`);
        const running = !!run(`${rt} info 2>/dev/null`);
        if (ver) {
            const label = ver.split('\n')[0];
            if (!check(`${rt} available: ${label}`, true)) issues++;
            if (!checkWarn(`${rt} daemon running`, running,
                !running ? `Run: ${rt === 'docker' ? 'open Docker Desktop' : 'systemctl --user start podman.socket'}` : '')) {
                // warn only
            }

            // Compose plugin
            const [bin, ...cmds] = getComposeCmd(rt);
            const compVer = run(`${[bin, ...cmds, 'version'].join(' ')} 2>/dev/null`);
            if (!checkWarn(`${rt} compose plugin`, !!compVer,
                !compVer ? 'Install compose plugin: https://docs.docker.com/compose/install/' : compVer)) {
                // warn only
            }
        }
    }

    const activeRt = detectRuntime(root);
    if (activeRt) {
        info(`Active runtime: ${chalk.cyan(activeRt)}`);
    } else {
        if (!check('Active runtime', false, 'No runtime detected — install Docker or Podman')) issues++;
    }

    // ── Project ───────────────────────────────────────────────────────────────
    if (root) {
        section(`Project  ${chalk.gray(root)}`);

        // shiplet.config.json
        const cfg = readShipletConfig(root);
        check('shiplet.config.json exists', fs.existsSync(path.join(root, 'shiplet.config.json')));

        // compose file
        const composeFile = resolveComposeFile(root);
        if (check('Compose file exists', !!composeFile, composeFile || 'Not found')) {
            // Validate compose syntax
            if (activeRt) {
                const [bin, ...cmds] = getComposeCmd(activeRt);
                const ff = composeFile ? `-f ${composeFile}` : '';
                const valid = run(`${[bin, ...cmds, ff, 'config', '-q'].join(' ')} 2>&1`, { cwd: root });
                if (!check('Compose file syntax valid', valid === '' || !valid.includes('ERROR'),
                    valid.includes('ERROR') ? valid.split('\n')[0] : '')) issues++;
            }
        } else { issues++; }

        // package.json
        if (check('package.json exists', fs.existsSync(path.join(root, 'package.json')))) {
            try {
                JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
                check('package.json is valid JSON', true);
            } catch (e) {
                if (!check('package.json is valid JSON', false, e.message)) issues++;
            }
        }

        // .env vs .env.example
        const envPath = path.join(root, '.env');
        const examplePath = path.join(root, '.env.example');
        checkWarn('.env file exists', fs.existsSync(envPath), 'Run: cp .env.example .env');

        if (fs.existsSync(envPath) && fs.existsSync(examplePath)) {
            const parseKeys = (f) => {
                const keys = new Set();
                fs.readFileSync(f, 'utf8').split('\n').forEach(l => {
                    const t = l.trim();
                    if (!t || t.startsWith('#')) return;
                    const i = t.indexOf('=');
                    if (i > 0) keys.add(t.slice(0, i).trim());
                });
                return keys;
            };
            const exampleKeys = parseKeys(examplePath);
            const envKeys = parseKeys(envPath);
            const missing = [...exampleKeys].filter(k => !envKeys.has(k));
            if (missing.length) {
                checkWarn('.env has all keys from .env.example', false,
                    `Missing: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ' …' : ''} — run: shiplet env sync`);
            } else {
                check('.env has all keys from .env.example', true);
            }
        }

        // Port conflicts
        if (cfg.port) {
            const inUse = run(`lsof -i :${cfg.port} -t 2>/dev/null || ss -tlnp 2>/dev/null | grep :${cfg.port}`);
            checkWarn(`App port ${cfg.port} is free`, !inUse, inUse ? 'Port is in use — set APP_PORT in .env' : '');
        }

        // Dangling/stopped containers
        if (activeRt) {
            const bin = activeRt === 'podman' ? 'podman' : 'docker';
            const dangling = run(`${bin} images -f dangling=true -q 2>/dev/null`).split('\n').filter(Boolean).length;
            const stopped = run(`${bin} ps -a -q -f status=exited 2>/dev/null`).split('\n').filter(Boolean).length;
            if (dangling > 0) checkWarn(`Dangling images: ${dangling}`, false, 'Run: shiplet prune images');
            if (stopped > 0) checkWarn(`Stopped containers: ${stopped}`, false, 'Run: shiplet prune containers');
        }

    } else {
        section('Project');
        checkWarn('Shiplet project found', false, 'Not in a shiplet project — run `shiplet init` to create one');
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('');
    if (issues === 0) {
        success(chalk.bold('All checks passed. Your environment looks great!'));
    } else {
        warn(`${issues} issue(s) found. Fix the items marked ${chalk.red('✖')} above.`);
    }
    console.log('');
};
