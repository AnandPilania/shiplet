'use strict';

/**
 * shiplet health — live container health dashboard
 *
 * Shows per-service: status, health-check state, CPU%, memory, port mappings
 */

const { execSync } = require('child_process');
const chalk = require('chalk');
const {
    assertRuntime, detectRuntime, findProjectRoot, resolveComposeFile,
    header, warn,
} = require('../utils/helpers');

function getContainerStats(runtime) {
    try {
        const fmt = '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}';
        const bin = runtime === 'podman' ? 'podman' : 'docker';
        return execSync(`${bin} stats --no-stream --format "${fmt}"`, { stdio: 'pipe' })
            .toString().trim().split('\n')
            .filter(Boolean)
            .reduce((acc, line) => {
                const [name, cpu, mem, memPerc] = line.split('\t');
                acc[name.trim()] = { cpu: cpu?.trim(), mem: mem?.trim(), memPerc: memPerc?.trim() };
                return acc;
            }, {});
    } catch { return {}; }
}

function getContainerHealth(runtime, composeFile, root) {
    try {
        const bin = runtime === 'podman' ? 'podman' : 'docker';
        const ff = composeFile ? `-f ${composeFile}` : '';
        const compose = runtime === 'podman' ? 'podman compose' : 'docker compose';
        const out = execSync(`${compose} ${ff} ps --format json`, { cwd: root, stdio: 'pipe' })
            .toString().trim();

        // compose ps --format json returns one JSON object per line
        return out.split('\n').filter(Boolean).map(line => {
            try { return JSON.parse(line); } catch { return null; }
        }).filter(Boolean);
    } catch { return []; }
}

function colorStatus(s = '') {
    const lower = s.toLowerCase();
    if (lower.includes('running') || lower.includes('up')) return chalk.green(s);
    if (lower.includes('healthy')) return chalk.green(s);
    if (lower.includes('starting')) return chalk.yellow(s);
    if (lower.includes('unhealthy') || lower.includes('exit')) return chalk.red(s);
    return chalk.gray(s);
}

function colorCpu(cpu = '') {
    const n = parseFloat(cpu);
    if (n > 80) return chalk.red(cpu);
    if (n > 40) return chalk.yellow(cpu);
    return chalk.green(cpu);
}

module.exports = async function healthCommand(options) {
    const root = findProjectRoot();
    if (!root) { require('../utils/helpers').error('No shiplet.yml found.', 1); }

    const runtime = assertRuntime(root);
    const composeFile = resolveComposeFile(root);

    header('Container Health');

    const services = getContainerHealth(runtime, composeFile, root);

    if (!services.length) {
        warn('No running containers found. Run `shiplet up` first.');
        return;
    }

    const stats = getContainerStats(runtime);

    // Table header
    const COL = { name: 32, status: 24, cpu: 10, mem: 22, ports: 0 };
    console.log(
        chalk.bold.gray(
            '  ' +
            'SERVICE'.padEnd(COL.name) +
            'STATUS'.padEnd(COL.status) +
            'CPU%'.padEnd(COL.cpu) +
            'MEMORY'.padEnd(COL.mem) +
            'PORTS'
        )
    );
    console.log(chalk.gray('  ' + '─'.repeat(100)));

    for (const svc of services) {
        const name = (svc.Service || svc.Name || '').replace(/^\//, '');
        const status = svc.Status || svc.State || '';
        const ports = (svc.Publishers || [])
            .map(p => `${p.PublishedPort || ''}→${p.TargetPort || ''}/${p.Protocol || 'tcp'}`)
            .filter(p => p.startsWith('0') === false && p.length > 2)
            .join(', ') || svc.Ports || '';

        // find stat by partial container name match
        const statKey = Object.keys(stats).find(k => k.includes(name)) || '';
        const stat = stats[statKey] || {};

        console.log(
            '  ' +
            chalk.white(name.slice(0, COL.name - 1).padEnd(COL.name)) +
            colorStatus(status.slice(0, COL.status - 1)).padEnd(COL.status + 10) +
            colorCpu(stat.cpu || '—').padEnd(COL.cpu + 10) +
            chalk.cyan((stat.mem || '—').slice(0, COL.mem - 1)).padEnd(COL.mem + 10) +
            chalk.gray(ports)
        );
    }

    console.log('');

    if (options.watch) {
        info('Watching — refreshing every 3s. Press Ctrl+C to stop.\n');
        setTimeout(async () => {
            process.stdout.write('\x1b[2J\x1b[0f'); // clear terminal
            await healthCommand(options);
        }, 3000);
    }
};
