# shiplet-example-fastify-podman

> Shiplet example — Fastify REST API running on **Podman** with MongoDB, Redis, MinIO, and Mailpit.

## Stack

| Service           | Image           | Port  | Purpose                      |
| ----------------- | --------------- | ----- | ---------------------------- |
| **app**           | node:22-slim    | 3000  | Fastify API (ESM)            |
| **mongo**         | mongo:7         | 27017 | Document database            |
| **redis**         | redis:7-alpine  | 6379  | Cache + session store        |
| **minio**         | minio/minio     | 9000  | S3-compatible object storage |
| **mailpit**       | axllent/mailpit | 8025  | Email preview UI             |
| **mongo-express** | mongo-express   | 8081  | MongoDB web GUI              |

## Quick Start

```bash
# Requires Podman ≥ 4.7 (or podman-compose)
npx shiplet init --runtime podman --yes

# Start all services
shiplet up -d

# Install npm deps inside the container
shiplet npm install

# Open a shell
shiplet shell

# Run migrations / seed
shiplet exec app node src/db/seed.js
```

## API Endpoints

| Method | Route                 | Description                    |
| ------ | --------------------- | ------------------------------ |
| GET    | `/health`             | Health check (all services)    |
| GET    | `/docs`               | Swagger UI                     |
| POST   | `/api/auth/register`  | Register a new user            |
| POST   | `/api/auth/login`     | Login → JWT token              |
| GET    | `/api/auth/me`        | Current user (JWT required)    |
| GET    | `/api/items`          | List items (cached, paginated) |
| POST   | `/api/items`          | Create item                    |
| PATCH  | `/api/items/:id`      | Update item                    |
| DELETE | `/api/items/:id`      | Delete item                    |
| GET    | `/api/files`          | List uploaded files (MinIO)    |
| POST   | `/api/files/presign`  | Get pre-signed upload URL      |
| GET    | `/api/files/:key/url` | Get pre-signed download URL    |
| DELETE | `/api/files/:key`     | Delete file                    |

## Useful Commands

```bash
shiplet db mongo            # Open mongosh CLI
shiplet db redis            # Open redis-cli
shiplet logs -f app         # Follow app logs
shiplet health              # Live metrics dashboard
shiplet snapshot save       # Backup all volumes
shiplet release patch       # Release a patch version
shiplet dashboard           # Open web UI at http://localhost:6171
```

## Podman vs Docker

Switch runtime at any time without changing `shiplet.yml`:

```bash
# Use Docker instead
SHIPLET_RUNTIME=docker shiplet up -d

# Pin permanently
shiplet runtime switch
```
