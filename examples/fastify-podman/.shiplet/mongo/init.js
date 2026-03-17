// MongoDB init script — runs once on first container start
// Path: .shiplet/mongo/init.js

db = db.getSiblingDB('app');

db.createCollection('items');
db.createCollection('users');

db.items.createIndex({ name: 'text', description: 'text' });
db.items.createIndex({ createdAt: -1 });
db.items.createIndex({ status: 1 });

// Seed a few items
db.items.insertMany([
    { name: 'Getting Started', description: 'Your first item — add more via POST /api/items', tags: ['demo'], status: 'active', createdAt: new Date() },
    { name: 'Fastify + Podman Stack', description: 'Shiplet example with MongoDB, Redis, MinIO', tags: ['demo', 'shiplet'], status: 'active', createdAt: new Date() },
]);

print('✔ MongoDB initialised');
