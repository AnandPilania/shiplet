'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');
const { createClient } = require('redis');

const app = express();
const PORT = process.env.APP_PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ── DB + Cache ─────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', err => console.error('[redis]', err));
redis.connect().then(() => console.log('[redis] connected'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    const dbOk = await pool.query('SELECT 1').then(() => true).catch(() => false);
    const rdOk = redis.isReady;
    res.json({
        status: dbOk && rdOk ? 'ok' : 'degraded',
        runtime: 'docker',
        services: { postgres: dbOk, redis: rdOk },
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
    });
});

app.get('/api/items', async (req, res) => {
    const cached = await redis.get('items');
    if (cached) return res.json({ source: 'cache', items: JSON.parse(cached) });

    const { rows } = await pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50');
    await redis.setEx('items', 60, JSON.stringify(rows));
    res.json({ source: 'db', items: rows });
});

app.post('/api/items', async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { rows } = await pool.query(
        'INSERT INTO items (name, description) VALUES ($1, $2) RETURNING *',
        [name, description || null]
    );
    await redis.del('items');
    res.status(201).json(rows[0]);
});

app.delete('/api/items/:id', async (req, res) => {
    await pool.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    await redis.del('items');
    res.json({ ok: true });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  🌊 shiplet-express-docker running`);
    console.log(`  ➜  http://localhost:${PORT}`);
    console.log(`  ➜  GET  /health`);
    console.log(`  ➜  GET  /api/items`);
    console.log(`  ➜  POST /api/items\n`);
});

module.exports = app;
