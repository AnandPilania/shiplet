'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const { WebSocketServer } = require('ws');

const {
    detectRuntime, getComposeCmd, findProjectRoot,
    resolveComposeFile, readShipletConfig,
} = require('../utils/helpers');

// ── helpers ──────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
    try {
        return execSync(cmd, { stdio: 'pipe', ...opts }).toString().trim();
    } catch { return ''; }
}

function runtimeBin(root) {
    return detectRuntime(root) || 'docker';
}

function composeCmd(root) {
    const rt = runtimeBin(root);
    return getComposeCmd(rt).join(' ');
}

function composeArgs(root) {
    const cf = resolveComposeFile(root);
    return cf ? `-f ${cf}` : '';
}

// ── data collectors ──────────────────────────────────────────────────────────

function getProjects() {
    // Scan for shiplet projects in common dirs: cwd, home subdirs (1 level deep)
    const candidates = new Set();
    const cwd = process.cwd();
    candidates.add(cwd);

    const home = require('os').homedir();
    try {
        fs.readdirSync(home).forEach(d => {
            const full = path.join(home, d);
            try {
                if (fs.statSync(full).isDirectory()) candidates.add(full);
            } catch { }
        });
    } catch { }

    const projects = [];
    for (const dir of candidates) {
        const hasShiplet = fs.existsSync(path.join(dir, 'shiplet.yml')) ||
            fs.existsSync(path.join(dir, 'compose.yml')) ||
            fs.existsSync(path.join(dir, 'docker-compose.yml'));
        if (!hasShiplet) continue;

        const cfg = readShipletConfig(dir);
        const pkg = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); }
            catch { return {}; }
        })();

        const rt = detectRuntime(dir) || 'docker';
        const cc = composeCmd(dir);
        const ca = composeArgs(dir);

        const services = (() => {
            try {
                const raw = run(`${cc} ${ca} ps --format json`, { cwd: dir });
                return raw.split('\n').filter(Boolean).map(l => {
                    try { return JSON.parse(l); } catch { return null; }
                }).filter(Boolean);
            } catch { return []; }
        })();

        projects.push({
            id: Buffer.from(dir).toString('base64').slice(0, 12),
            path: dir,
            name: cfg.appName || pkg.name || path.basename(dir),
            version: pkg.version || '—',
            runtime: rt,
            services,
            config: cfg,
            isActive: dir === cwd,
        });
    }

    return projects;
}

function getContainerStats(rt) {
    const bin = rt === 'podman' ? 'podman' : 'docker';
    try {
        const fmt = '{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}\\t{{.NetIO}}\\t{{.BlockIO}}';
        return run(`${bin} stats --no-stream --format "${fmt}"`)
            .split('\n').filter(Boolean)
            .map(line => {
                const [name, cpu, mem, memPerc, netIO, blockIO] = line.split('\t');
                return { name, cpu, mem, memPerc, netIO, blockIO };
            });
    } catch { return []; }
}

function getAllContainers(rt) {
    const bin = rt === 'podman' ? 'podman' : 'docker';
    try {
        const fmt = '{{.Names}}\\t{{.Status}}\\t{{.Image}}\\t{{.Ports}}\\t{{.ID}}';
        return run(`${bin} ps -a --format "${fmt}"`)
            .split('\n').filter(Boolean)
            .map(line => {
                const [name, status, image, ports, id] = line.split('\t');
                return { name, status, image, ports, id: id?.slice(0, 12) };
            });
    } catch { return []; }
}

function getVolumes(rt) {
    const bin = rt === 'podman' ? 'podman' : 'docker';
    try {
        return run(`${bin} volume ls --format "{{.Name}}\\t{{.Driver}}\\t{{.Mountpoint}}"`)
            .split('\n').filter(Boolean)
            .map(line => {
                const [name, driver, mount] = line.split('\t');
                return { name, driver, mount };
            });
    } catch { return []; }
}

function getImages(rt) {
    const bin = rt === 'podman' ? 'podman' : 'docker';
    try {
        return run(`${bin} images --format "{{.Repository}}\\t{{.Tag}}\\t{{.Size}}\\t{{.CreatedSince}}\\t{{.ID}}"`)
            .split('\n').filter(Boolean)
            .map(line => {
                const [repo, tag, size, created, id] = line.split('\t');
                return { repo, tag, size, created, id: id?.slice(0, 12) };
            });
    } catch { return []; }
}

function getSystemInfo(rt) {
    const bin = rt === 'podman' ? 'podman' : 'docker';
    try {
        const info = JSON.parse(run(`${bin} info --format "{{json .}}"`));
        return {
            version: info.ServerVersion || info.Version || '—',
            os: info.OperatingSystem || info.OSType || '—',
            arch: info.Architecture || '—',
            cpus: info.NCPU || info.NumCPU || '—',
            memory: info.MemTotal ? (info.MemTotal / 1073741824).toFixed(1) + ' GB' : '—',
            containers: info.Containers || info.ContainerStore?.number || 0,
            running: info.ContainersRunning || 0,
            images: info.Images || 0,
            rootDir: info.DockerRootDir || info.store?.graphRoot || '—',
        };
    } catch { return {}; }
}

// ── create app ────────────────────────────────────────────────────────────────

function createServer(port = 6171, options = {}) {
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });

    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    const rt = runtimeBin(process.cwd());
    const root = findProjectRoot() || process.cwd();

    // ── REST API ──────────────────────────────────────────────────────────────

    // Dashboard overview
    app.get('/api/overview', (req, res) => {
        const containers = getAllContainers(rt);
        const stats = getContainerStats(rt);
        const sysInfo = getSystemInfo(rt);
        const running = containers.filter(c => c.status?.toLowerCase().includes('up'));
        const statsMap = Object.fromEntries(stats.map(s => [s.name, s]));

        res.json({ containers, running, stats, statsMap, sysInfo, runtime: rt });
    });

    // Projects
    app.get('/api/projects', (req, res) => {
        res.json(getProjects());
    });

    // Containers
    app.get('/api/containers', (req, res) => {
        res.json(getAllContainers(rt));
    });

    // Stats
    app.get('/api/stats', (req, res) => {
        res.json(getContainerStats(rt));
    });

    // Volumes
    app.get('/api/volumes', (req, res) => {
        res.json(getVolumes(rt));
    });

    // Images
    app.get('/api/images', (req, res) => {
        res.json(getImages(rt));
    });

    // System info
    app.get('/api/system', (req, res) => {
        res.json({ ...getSystemInfo(rt), runtime: rt });
    });

    // Container action: start / stop / restart / remove
    app.post('/api/containers/:name/action', (req, res) => {
        const { name } = req.params;
        const { action } = req.body;
        const bin = rt === 'podman' ? 'podman' : 'docker';
        const allowed = { start: 1, stop: 1, restart: 1, remove: 1, kill: 1, pause: 1, unpause: 1 };
        if (!allowed[action]) return res.status(400).json({ error: 'Invalid action' });
        const cmd = action === 'remove' ? 'rm -f' : action;
        try {
            run(`${bin} ${cmd} ${name}`);
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Project compose actions
    app.post('/api/projects/:id/action', (req, res) => {
        const { id } = req.params;
        const { action } = req.body;
        const projects = getProjects();
        const project = projects.find(p => p.id === id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const allowed = { up: 1, down: 1, restart: 1, build: 1, pull: 1 };
        if (!allowed[action]) return res.status(400).json({ error: 'Invalid action' });

        const cc = composeCmd(project.path);
        const ca = composeArgs(project.path);
        const args = action === 'up' ? `${cc} ${ca} up -d` :
            action === 'down' ? `${cc} ${ca} down` :
                action === 'restart' ? `${cc} ${ca} restart` :
                    action === 'build' ? `${cc} ${ca} build` :
                        `${cc} ${ca} pull`;

        try {
            run(args, { cwd: project.path });
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Stream logs via REST (tail)
    app.get('/api/containers/:name/logs', (req, res) => {
        const { name } = req.params;
        const lines = req.query.lines || '100';
        const bin = rt === 'podman' ? 'podman' : 'docker';
        try {
            const out = run(`${bin} logs --tail ${lines} ${name} 2>&1`);
            res.json({ logs: out });
        } catch (e) {
            res.json({ logs: e.message });
        }
    });

    // Env for a project
    app.get('/api/projects/:id/env', (req, res) => {
        const { id } = req.params;
        const projects = getProjects();
        const project = projects.find(p => p.id === id);
        if (!project) return res.status(404).json({ error: 'Not found' });
        const envPath = path.join(project.path, '.env');
        if (!fs.existsSync(envPath)) return res.json({ env: {} });
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        const env = {};
        lines.forEach(l => {
            const t = l.trim();
            if (!t || t.startsWith('#')) return;
            const i = t.indexOf('=');
            if (i < 0) return;
            env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, '');
        });
        res.json({ env });
    });

    // Update env key
    app.put('/api/projects/:id/env/:key', (req, res) => {
        const { id, key } = req.params;
        const { value } = req.body;
        const projects = getProjects();
        const project = projects.find(p => p.id === id);
        if (!project) return res.status(404).json({ error: 'Not found' });
        const envPath = path.join(project.path, '.env');
        let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        if (new RegExp(`^${key}=`, 'm').test(content)) {
            content = content.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
        } else {
            content += `\n${key}=${value}`;
        }
        fs.writeFileSync(envPath, content);
        res.json({ ok: true });
    });

    // Runtime switch
    app.post('/api/runtime/switch', (req, res) => {
        const { runtime } = req.body;
        if (runtime !== 'docker' && runtime !== 'podman') {
            return res.status(400).json({ error: 'Invalid runtime' });
        }
        const { writeShipletConfig } = require('../utils/helpers');
        try {
            writeShipletConfig(root, { runtime });
            res.json({ ok: true, runtime });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Release dry-run info
    app.get('/api/release/info', (req, res) => {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
            const lastTag = run('git describe --tags --abbrev=0') || null;
            const commits = lastTag
                ? run(`git log ${lastTag}..HEAD --oneline`).split('\n').filter(Boolean)
                : run('git log --oneline').split('\n').filter(Boolean).slice(0, 20);
            const branch = run('git branch --show-current');
            const clean = run('git status --porcelain') === '';
            res.json({ version: pkg.version, lastTag, commits, branch, clean });
        } catch (e) {
            res.json({ error: e.message });
        }
    });

    // ── Serve index for all other routes ─────────────────────────────────────
    app.get('/*splat', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ── WebSocket — live log streaming ────────────────────────────────────────
    wss.on('connection', (ws) => {
        let logProc = null;

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw);

                if (msg.type === 'subscribe_logs') {
                    if (logProc) { try { logProc.kill(); } catch { } }
                    const bin = rt === 'podman' ? 'podman' : 'docker';
                    logProc = spawn(bin, ['logs', '-f', '--tail', '50', msg.container], { shell: true });
                    const send = (data) => {
                        if (ws.readyState === ws.OPEN) {
                            ws.send(JSON.stringify({ type: 'log', line: data.toString() }));
                        }
                    };
                    logProc.stdout.on('data', send);
                    logProc.stderr.on('data', send);
                    logProc.on('close', () => {
                        if (ws.readyState === ws.OPEN) {
                            ws.send(JSON.stringify({ type: 'log_end' }));
                        }
                    });
                }

                if (msg.type === 'unsubscribe_logs') {
                    if (logProc) { try { logProc.kill(); } catch { } logProc = null; }
                }

                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', rt, time: Date.now() }));
                }
            } catch { }
        });

        ws.on('close', () => {
            if (logProc) { try { logProc.kill(); } catch { } }
        });
    });

    // ── Polling broadcast ─────────────────────────────────────────────────────
    const broadcast = (data) => {
        const payload = JSON.stringify(data);
        wss.clients.forEach(c => { if (c.readyState === 1) c.send(payload); });
    };

    setInterval(() => {
        try {
            const stats = getContainerStats(rt);
            const containers = getAllContainers(rt);
            broadcast({ type: 'stats_update', stats, containers, ts: Date.now() });
        } catch { }
    }, 3000);

    return { app, server, port };
}

module.exports = { createServer };
