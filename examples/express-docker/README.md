# shiplet-example-express-docker

> Shiplet example — Express.js REST API running on **Docker** with PostgreSQL, Redis, and Mailpit.

## Stack

| Service      | Image              | Port | Purpose                       |
| ------------ | ------------------ | ---- | ----------------------------- |
| **app**      | node:20-slim       | 3000 | Express API                   |
| **postgres** | postgres:16-alpine | 5432 | Primary database              |
| **redis**    | redis:7-alpine     | 6379 | Cache (60s TTL on /api/items) |
| **mailpit**  | axllent/mailpit    | 8025 | Email preview UI              |
| **adminer**  | adminer            | 8080 | Database web GUI              |

## Quick Start

```bash
# Requires Docker Desktop or Docker Engine + Compose plugin
npx shiplet init --template express --runtime docker --yes

# Start all services
shiplet up -d

# Install npm deps inside the container
shiplet npm install

# Run DB migrations
shiplet exec app node src/db/migrate.js

# Open app shell
shiplet shell
```

## API Endpoints

| Method | Route            | Description                       |
| ------ | ---------------- | --------------------------------- |
| GET    | `/health`        | Health check (postgres+redis)     |
| GET    | `/api/items`     | List items (Redis-cached)         |
| POST   | `/api/items`     | Create item `{name, description}` |
| DELETE | `/api/items/:id` | Delete item                       |

## Useful Commands

```bash
shiplet db                  # Auto-opens psql
shiplet db redis            # Open redis-cli
shiplet logs -f             # Follow all logs
shiplet health              # Live metrics
shiplet snapshot save       # Backup volumes
shiplet release minor       # Release new version
shiplet env list            # Show all env vars
shiplet dashboard           # Web UI → http://localhost:6171
```

## Web Services

| URL                          | Service           |
| ---------------------------- | ----------------- |
| http://localhost:3000        | App               |
| http://localhost:3000/health | Health check      |
| http://localhost:8025        | Mailpit email UI  |
| http://localhost:8080        | Adminer DB GUI    |
| http://localhost:6171        | shiplet dashboard |
