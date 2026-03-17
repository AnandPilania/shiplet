import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

import { itemRoutes } from './routes/items.js';
import { authRoutes } from './routes/auth.js';
import { filesRoutes } from './routes/files.js';

const PORT = parseInt(process.env.APP_PORT || '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

// ── Fastify instance ──────────────────────────────────────────────────────────
const app = Fastify({
    logger: isDev
        ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
        : true,
});

// ── Plugins ───────────────────────────────────────────────────────────────────
await app.register(cors, { origin: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(sensible);
await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });

await app.register(swagger, {
    openapi: {
        info: { title: 'shiplet Fastify API', description: 'Example Fastify app via Shiplet + Podman', version: '1.0.0' },
        components: {
            securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
        },
    },
});
await app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list' } });

// ── Service connections ───────────────────────────────────────────────────────
// MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/app');
app.log.info('[mongoose] connected');

// Redis
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', e => app.log.error({ err: e }, '[redis] error'));
await redis.connect();
app.log.info('[redis] connected');
app.decorate('redis', redis);

// S3 / MinIO
const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'shiplet',
        secretAccessKey: process.env.S3_SECRET_KEY || 'secretsecret',
    },
    forcePathStyle: true,
});
app.decorate('s3', s3);

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', async () => ({
    status: 'ok',
    runtime: 'podman',
    uptime: process.uptime(),
    services: {
        mongo: mongoose.connection.readyState === 1,
        redis: redis.isReady,
    },
    version: process.env.npm_package_version || '1.0.0',
}));

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(itemRoutes, { prefix: '/api/items' });
await app.register(filesRoutes, { prefix: '/api/files' });

// ── Start ─────────────────────────────────────────────────────────────────────
try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`🌊 shiplet-fastify-podman  →  http://localhost:${PORT}`);
    app.log.info(`📖 Swagger docs         →  http://localhost:${PORT}/docs`);
} catch (err) {
    app.log.error(err);
    process.exit(1);
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async () => {
    await app.close();
    await redis.quit();
    await mongoose.disconnect();
    process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
