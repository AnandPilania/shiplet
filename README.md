# 🌊 Shiplet

> A lightweight, Docker-powered development environment for Node.js projects — inspired by Laravel Sail, built for the JS ecosystem.

No Docker knowledge required. One command gets you a fully containerised Node app with databases, mail, object storage, and more.

---

## Table of Contents

- [🌊 Shiplet](#-shiplet)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Quick Start](#quick-start)
  - [Installation](#installation)
    - [Run via npx (zero-install)](#run-via-npx-zero-install)
    - [Install globally](#install-globally)
    - [Add to an existing project](#add-to-an-existing-project)
    - [Shell alias](#shell-alias)
  - [Initialising a Project](#initialising-a-project)
  - [Starting and Stopping](#starting-and-stopping)
  - [Executing Commands](#executing-commands)
    - [Node.js commands](#nodejs-commands)
    - [Package manager commands](#package-manager-commands)
    - [One-off exec](#one-off-exec)
    - [Interactive shell](#interactive-shell)
  - [Running Tests](#running-tests)
  - [Working with Databases](#working-with-databases)
    - [PostgreSQL](#postgresql)
    - [MySQL](#mysql)
    - [MongoDB](#mongodb)
    - [Redis](#redis)
  - [Additional Services](#additional-services)
    - [Mailpit (email)](#mailpit-email)
    - [MinIO (S3)](#minio-s3)
    - [Elasticsearch](#elasticsearch)
    - [Adminer (DB GUI)](#adminer-db-gui)
  - [Adding Services Post-Init](#adding-services-post-init)
  - [Environment Variables](#environment-variables)
  - [Container Logs](#container-logs)
  - [Container Status](#container-status)
  - [Sharing Your App](#sharing-your-app)
  - [Rebuilding Images](#rebuilding-images)
  - [Customisation (Ejecting)](#customisation-ejecting)
  - [Node Version](#node-version)
  - [Package Manager](#package-manager)
  - [Project Templates](#project-templates)
  - [Generated File Reference](#generated-file-reference)
    - [`shiplet.yml`](#shipletyml)
    - [`.shiplet/Dockerfile`](#shipletdockerfile)
    - [`.env`](#env)
  - [Requirements](#requirements)
  - [Container Runtime (Docker \& Podman)](#container-runtime-docker--podman)
    - [Auto-detection priority](#auto-detection-priority)
    - [Runtime commands](#runtime-commands)
    - [Forcing a runtime for a single command](#forcing-a-runtime-for-a-single-command)
    - [Podman-specific notes](#podman-specific-notes)
  - [Release Pipeline](#release-pipeline)
    - [Basic usage](#basic-usage)
    - [Pipeline steps](#pipeline-steps)
    - [Dry run](#dry-run)
    - [Flags reference](#flags-reference)
    - [Conventional commits](#conventional-commits)
  - [Container Health Dashboard](#container-health-dashboard)
  - [Volume Snapshots](#volume-snapshots)
  - [Linting](#linting)
  - [Scaling Services](#scaling-services)
  - [shiplet.config.json](#shipletconfigjson)
  - [Web Dashboard](#web-dashboard)
    - [Dashboard sections](#dashboard-sections)
    - [Options](#options)
    - [Live updates](#live-updates)
  - [Examples](#examples)
    - [`examples/express-docker`](#examplesexpress-docker)
    - [`examples/fastify-podman`](#examplesfastify-podman)
    - [Running either example with the other runtime](#running-either-example-with-the-other-runtime)
  - [License](#license)

---

## Introduction

Shiplet is a CLI tool that wraps Docker Compose into a set of simple, memorable commands purpose-built for Node.js development. It is the spiritual equivalent of [Laravel Sail](https://laravel.com/docs/sail) for PHP, but designed with the Node.js ecosystem in mind:

- Supports **npm, yarn, and pnpm** out of the box
- **Auto-detects** your test runner (jest, vitest, mocha)
- **Auto-detects** which database CLI to open (`shiplet db`)
- Works with **Express, Fastify, NestJS, Next.js, Nuxt, T3** via built-in templates
- Includes an **`env` command** for full `.env` management
- Can **tunnel your local app** to the internet with `shiplet share`
- Runs via **`npx`** — no global install needed

At its core, Shiplet is a `shiplet.yml` (Docker Compose) file and a thin CLI wrapper. You can eject the Dockerfiles at any time with `shiplet publish` for full control.

Shiplet is supported on **macOS, Linux, and Windows (via WSL2)**.

---

## Quick Start

```bash
# In a new or existing Node.js project:
npx shiplet init

# Start everything
shiplet up -d

# Install your npm deps inside the container
shiplet npm install

# Open a shell
shiplet shell

# Run your tests
shiplet test
```

---

## Installation

### Run via npx (zero-install)

The fastest way to initialise Shiplet in any project — no global install needed:

```bash
npx shiplet init
```

After init, all subsequent `shiplet` commands are available through `./node_modules/.bin/shiplet` (if added as a dev dep) or globally.

### Install globally

```bash
npm install -g shiplet
# or
yarn global add shiplet
# or
pnpm add -g shiplet
```

### Add to an existing project

```bash
npm install --save-dev shiplet
npx shiplet init
```

### Shell alias

To avoid typing `./node_modules/.bin/shiplet` every time, add an alias to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
alias shiplet='npx shiplet'
```

Or if installed locally in every project:

```bash
alias shiplet='./node_modules/.bin/shiplet'
```

Restart your shell, then you can simply type `shiplet up`, `shiplet shell`, etc.

---

## Initialising a Project

Run the interactive setup wizard:

```bash
shiplet init
```

You will be prompted to choose:

| Option              | Description                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **App name**        | Used as the Docker Compose project name                                                  |
| **Template**        | `express`, `fastify`, `nestjs`, `nextjs`, `nuxt`, `t3`, or `blank`                       |
| **Node version**    | `22`, `20`, or `18` (inside the container)                                               |
| **Package manager** | `npm`, `yarn`, or `pnpm` (auto-detected from lock files)                                 |
| **Port**            | The host port your app will be accessible on                                             |
| **Services**        | Any combination of postgres, mysql, mongo, redis, mailpit, minio, elasticsearch, adminer |
| **Timezone**        | Container timezone (default: UTC)                                                        |

To skip all prompts and use defaults:

```bash
shiplet init --yes
shiplet init --template nestjs --yes
```

After init, Shiplet creates:

```
your-project/
├── shiplet.yml              ← Docker Compose file (edit freely)
├── .env                  ← Environment variables (added to existing .env)
└── .shiplet/
    └── Dockerfile        ← App container Dockerfile
```

---

## Starting and Stopping

Start all containers defined in `shiplet.yml`:

```bash
shiplet up
```

Start in detached (background) mode:

```bash
shiplet up -d
```

Start and force a rebuild of images first:

```bash
shiplet up --build
```

Once running, your app is accessible at `http://localhost:3000` (or whichever port you chose).

Stop all containers (containers are removed, data volumes are preserved):

```bash
shiplet down
```

Stop and **destroy all volumes** (this deletes database data — use with caution):

```bash
shiplet down -v
```

---

## Executing Commands

When using Shiplet, your application runs inside a Docker container. Shiplet provides shortcuts to run common commands without leaving your terminal.

### Node.js commands

```bash
# Check the Node version inside the container
shiplet node --version

# Run a script
shiplet node scripts/seed.js
```

### Package manager commands

Shiplet proxies all package manager commands into the `app` container:

```bash
# npm
shiplet npm install
shiplet npm run dev
shiplet npm run build

# yarn
shiplet yarn
shiplet yarn add express

# pnpm
shiplet pnpm install
shiplet pnpm add fastify

# npx (inside the container)
shiplet npx prisma migrate dev
shiplet npx ts-node src/server.ts
```

### One-off exec

Run any command inside any running container:

```bash
shiplet exec app node -e "console.log('hello')"
shiplet exec redis redis-cli info
shiplet exec postgres psql -U shiplet -d app
```

### Interactive shell

Open a `bash` shell inside the app container (falls back to `sh` if bash is unavailable):

```bash
shiplet shell
```

Open a shell in a different service:

```bash
shiplet shell postgres
shiplet shell redis
```

---

## Running Tests

Shiplet automatically detects your test runner by inspecting `devDependencies` in `package.json`:

| Detected dependency   | Command used     |
| --------------------- | ---------------- |
| `vitest`              | `npx vitest run` |
| `jest`                | `npx jest`       |
| `mocha`               | `npx mocha`      |
| *(none of the above)* | `npm test`       |

```bash
# Run all tests
shiplet test

# Pass flags through to your test runner
shiplet test --coverage
shiplet test --watch
shiplet test src/user.test.ts
```

---

## Working with Databases

### PostgreSQL

When Postgres is enabled, it runs in the `postgres` service. Your app connects to it at the host `postgres` (the Docker service name) on port `5432`.

To connect from your machine (e.g. TablePlus or psql):

- **Host:** `localhost`
- **Port:** `5432` (or `POSTGRES_PORT` from `.env`)
- **User / Password / DB:** as set in `.env`

Open the Postgres CLI inside the container:

```bash
shiplet db postgres
# or simply (auto-detected):
shiplet db
```

### MySQL

MySQL runs in the `mysql` service. Connect your app using host `mysql`, port `3306`.

```bash
shiplet db mysql
# or:
shiplet db
```

### MongoDB

MongoDB runs in the `mongo` service. Your `MONGODB_URI` in `.env` is pre-configured to point at `mongo:27017`.

```bash
shiplet db mongo
# or:
shiplet db
```

### Redis

Redis runs in the `redis` service. Connect your app using `redis://redis:6379`.

```bash
shiplet db redis
# or:
shiplet db
```

> **Tip:** `shiplet db` with no argument auto-detects the first running database service.

---

## Additional Services

### Mailpit (email)

Mailpit intercepts all outgoing SMTP mail from your app and displays it in a web UI — no real emails are sent during development.

- **SMTP host/port:** `mailpit:1025`
- **Web UI:** http://localhost:8025

Configure your mailer (e.g. Nodemailer):

```js
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,   // mailpit
  port: process.env.SMTP_PORT,   // 1025
});
```

### MinIO (S3)

MinIO provides an S3-compatible object storage API for local development.

- **API endpoint:** `http://minio:9000` (from inside containers), `http://localhost:9000` (from host)
- **Console UI:** http://localhost:9001

Configure the AWS SDK:

```js
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,  // http://minio:9000
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});
```

### Elasticsearch

Elasticsearch runs with security disabled for local development. Access it at `http://elasticsearch:9200` from your app or `http://localhost:9200` from your host.

### Adminer (DB GUI)

Adminer is a lightweight browser-based database manager.

- **URL:** http://localhost:8080
- Works with PostgreSQL, MySQL, MongoDB, and more.

---

## Adding Services Post-Init

You can add more services to an existing Shiplet project at any time:

```bash
# Interactive picker
shiplet add

# Add specific services directly
shiplet add redis mailpit
shiplet add elasticsearch adminer
```

Available services: `postgres`, `mysql`, `mongo`, `redis`, `mailpit`, `minio`, `elasticsearch`, `adminer`

After adding services, rebuild and restart:

```bash
shiplet up --build
```

---

## Environment Variables

Shiplet includes a full `.env` management command.

```bash
# List all variables
shiplet env list

# Get a single variable
shiplet env get DATABASE_URL

# Set a variable
shiplet env set NODE_ENV production
shiplet env set DATABASE_URL=postgresql://shiplet:secret@postgres:5432/app

# Remove a variable
shiplet env unset OLD_KEY

# Sync missing keys from .env.example → .env
shiplet env sync
```

The `sync` action is particularly useful after pulling changes from git where `.env.example` has new keys.

---

## Container Logs

```bash
# Tail the last 100 lines from all services
shiplet logs

# Follow (stream) logs in real time
shiplet logs -f

# Tail a specific service
shiplet logs app
shiplet logs postgres

# Show the last 50 lines
shiplet logs -n 50 app
```

---

## Container Status

```bash
shiplet status
# or the alias:
shiplet ps
```

Displays a colourised table of all services, their status, and port mappings:

```
  NAME              STATUS         PORTS
  myapp-app-1       running (Up)   0.0.0.0:3000->3000/tcp
  myapp-postgres-1  running (Up)   0.0.0.0:5432->5432/tcp
  myapp-redis-1     running (Up)   0.0.0.0:6379->6379/tcp
```

---

## Sharing Your App

Expose your local app to the internet using a secure tunnel:

```bash
shiplet share
```

This uses [localtunnel](https://theboroer.github.io/localtunnel-www/) and outputs a public URL that anyone can visit.

```bash
# Specify a port (default: 3000)
shiplet share --port 4000

# Request a specific subdomain
shiplet share --subdomain my-demo
```

Press `Ctrl+C` to stop sharing.

---

## Rebuilding Images

After changing `Node version`, `package manager`, or editing `.shiplet/Dockerfile`:

```bash
shiplet build
```

Force a full rebuild without cache (useful after system package changes):

```bash
shiplet build --no-cache
```

Or rebuild on the next `up`:

```bash
shiplet up --build
```

---

## Customisation (Ejecting)

Shiplet ships with a ready-made Dockerfile stored in `.shiplet/Dockerfile`. To gain full control, eject it to your project root:

```bash
shiplet publish
```

This copies the Dockerfile to `docker/Dockerfile`. You can then edit it freely — add system packages, change the base image, install global tools, etc.

Update `shiplet.yml` to point at the ejected file:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
```

Since Shiplet is just Docker Compose under the hood, **any valid Compose configuration works** in `shiplet.yml`.

---

## Node Version

The Node.js version is set at build time via a Docker build argument. To change it, update `shiplet.yml`:

```yaml
services:
  app:
    build:
      args:
        NODE_VERSION: "22"   # or "20", "18"
```

Then rebuild:

```bash
shiplet build --no-cache
shiplet up
```

---

## Package Manager

The package manager is also baked into the image via `corepack`. To change it, update `shiplet.yml`:

```yaml
services:
  app:
    build:
      args:
        PACKAGE_MANAGER: "pnpm"   # npm | yarn | pnpm
```

Rebuild the image after changing this.

---

## Project Templates

When running `shiplet init`, you can select a project template:

| Template  | Description                                      |
| --------- | ------------------------------------------------ |
| `blank`   | Bare Node.js container, no framework scaffolding |
| `express` | Express.js with a minimal app structure          |
| `fastify` | Fastify with plugins pre-configured              |
| `nestjs`  | NestJS with TypeScript                           |
| `nextjs`  | Next.js (App Router)                             |
| `nuxt`    | Nuxt 3                                           |
| `t3`      | T3 stack (Next.js + tRPC + Prisma + Tailwind)    |

Or pass via CLI flag:

```bash
npx shiplet init --template nestjs
```

---

## Generated File Reference

### `shiplet.yml`

The Docker Compose file for your project. Edit it directly to customise ports, add environment variables, mount extra volumes, or add any service available on Docker Hub.

### `.shiplet/Dockerfile`

The Dockerfile for your `app` container. Contains the base Node image, timezone setup, and package manager initialisation. Eject with `shiplet publish` for full control.

### `.env`

Shiplet appends its required variables to your `.env` file on init. Variables are namespaced to avoid collisions with your existing config.

---

## Requirements

- **Docker Desktop** (macOS / Windows) or **Docker Engine + Compose plugin** (Linux) — [install here](https://docs.docker.com/get-docker/)
- **Node.js ≥ 16** on the host (only needed to run the `shiplet` CLI itself — your app runs inside the container)

---

## Container Runtime (Docker & Podman)

Shiplet supports both **Docker** and **Podman** as container runtimes. The runtime is auto-detected at startup — no configuration needed unless you want to pin one explicitly.

### Auto-detection priority

1. `SHIPLET_RUNTIME=docker` or `SHIPLET_RUNTIME=podman` environment variable
2. `runtime` field in `shiplet.config.json` (set by `shiplet init` or `shiplet runtime switch`)
3. Auto-detect: Podman wins if available and running, otherwise Docker

### Runtime commands

```bash
# Show which runtime is active and why
shiplet runtime show

# Interactively switch between docker and podman
shiplet runtime switch

# Validate both runtimes — checks binary, daemon, and compose plugin
shiplet runtime check
```

### Forcing a runtime for a single command

```bash
SHIPLET_RUNTIME=podman shiplet up -d
SHIPLET_RUNTIME=docker shiplet build --no-cache
```

### Podman-specific notes

Shiplet uses `podman compose` (bundled in Podman ≥ 4.7) or falls back to the standalone `podman-compose` package. Install it with:

```bash
pip3 install podman-compose
# or update Podman to ≥ 4.7
```

Rootless Podman is fully supported. If you see permission errors on volume mounts, ensure your user has the correct subuid/subgid mappings:

```bash
podman system migrate
```

---

## Release Pipeline

`shiplet release` is a complete, opinionated release pipeline that handles everything from pre-flight checks to git tagging and npm publishing.

### Basic usage

```bash
# Bump patch version (1.0.0 → 1.0.1)
shiplet release

# Bump minor version (1.0.0 → 1.1.0)
shiplet release minor

# Bump major version (1.0.0 → 2.0.0)
shiplet release major

# Explicit version
shiplet release 2.4.0

# Pre-release tag (1.0.0 → 1.0.1-beta.0)
shiplet release patch --pre beta

# Release candidate
shiplet release minor --pre rc
```

### Pipeline steps

Every `shiplet release` runs these steps in order:

| Step                  | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| **Pre-flight checks** | Git repo exists, clean working tree, on main/master branch, package.json present |
| **Tests**             | Runs your test suite inside the container (auto-detects jest/vitest/mocha)       |
| **Version bump**      | Updates `package.json` (and `package-lock.json`) to the new version              |
| **Changelog**         | Generates/prepends `CHANGELOG.md` from conventional commits since the last tag   |
| **Git commit + tag**  | `git commit -m "chore(release): vX.Y.Z"` and `git tag -a vX.Y.Z`                 |
| **Image build**       | Rebuilds your container image tagged with the new version                        |
| **Git push**          | `git push && git push --tags`                                                    |
| **npm publish**       | *(optional, with `--publish`)* Runs `npm publish`                                |

### Dry run

See exactly what would happen without changing anything:

```bash
shiplet release minor --dry-run
```

Output includes a full changelog preview, version diff, and step-by-step simulation.

### Flags reference

| Flag             | Description                                    |
| ---------------- | ---------------------------------------------- |
| `--dry-run`      | Simulate without mutations                     |
| `--yes`          | Skip confirmation prompt                       |
| `--force`        | Skip branch + clean-tree enforcement           |
| `--pre <tag>`    | Add pre-release suffix (`alpha`, `beta`, `rc`) |
| `--skip-tests`   | Skip the test suite                            |
| `--skip-build`   | Skip container image rebuild                   |
| `--skip-push`    | Skip `git push`                                |
| `--publish`      | Also run `npm publish`                         |
| `--access <lvl>` | npm publish access: `public` or `restricted`   |

### Conventional commits

The changelog generator parses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add OAuth2 login          → 🚀 Features
fix(db): handle null result           → 🐛 Bug Fixes
perf(cache): use LRU eviction         → ⚡ Performance
refactor(api): simplify middleware    → ♻️  Refactoring
docs: update README                   → 📝 Documentation
feat!: redesign public API            → 💥 Breaking Changes
```

Non-conventional commits are grouped under **📌 Other**.

---

## Container Health Dashboard

```bash
# One-shot health view
shiplet health

# Auto-refresh every 3 seconds
shiplet health --watch
```

Displays a live table with per-service:
- **Status** (running/starting/unhealthy — colour-coded)
- **CPU %** (green < 40%, yellow < 80%, red > 80%)
- **Memory usage** (current / limit)
- **Port mappings**

---

## Volume Snapshots

Back up and restore named Docker/Podman volumes at any time — useful before destructive migrations or sharing a dev database state with a colleague.

```bash
# Save a named snapshot of all volumes
shiplet snapshot save before-migration

# List all snapshots
shiplet snapshot list

# Restore a snapshot (interactive picker if name omitted)
shiplet snapshot restore before-migration

# Delete a snapshot
shiplet snapshot delete before-migration
```

Snapshots are stored in `.shiplet/snapshots/` as compressed tarballs. Each volume gets its own file: `<snapshot-name>-<volume-name>.tar.gz`.

---

## Linting

```bash
# Run all detected linters
shiplet lint

# Run linters and auto-fix where possible
shiplet lint --fix
```

Shiplet inspects your `package.json` and config files to detect and run:

| Tool           | Config files detected                 |
| -------------- | ------------------------------------- |
| **Biome**      | `biome.json`, `biome.jsonc`           |
| **OXLint**     | `devDependencies.oxlint`              |
| **ESLint**     | `.eslintrc*`, `eslint.config.*`       |
| **Prettier**   | `.prettierrc*`, `prettier.config.*`   |
| **TypeScript** | `tsconfig.json` (runs `tsc --noEmit`) |

All linters run inside the container so the environment is consistent with CI.

---

## Scaling Services

```bash
# Scale the app service to 3 replicas
shiplet scale app=3

# Scale multiple services at once
shiplet scale app=2 worker=4

# Scale back to 1
shiplet scale app=1
```

Uses `docker/podman compose up --scale` under the hood — containers are added/removed without recreating existing ones.

---

## shiplet.config.json

shiplet stores project-level configuration in `shiplet.config.json` at the project root (alongside `shiplet.yml`). This file is safe to commit.

```json
{
  "runtime": "podman",
  "appName": "my-app",
  "nodeVersion": "20",
  "packageManager": "pnpm",
  "port": 3000
}
```

| Key              | Description                                    |
| ---------------- | ---------------------------------------------- |
| `runtime`        | Pinned container runtime: `docker` or `podman` |
| `appName`        | Used as the Docker Compose project name        |
| `nodeVersion`    | Node.js version inside the app container       |
| `packageManager` | `npm`, `yarn`, or `pnpm`                       |
| `port`           | Host port the app is exposed on                |

Override the runtime at any time without editing the file:

```bash
SHIPLET_RUNTIME=docker shiplet up
```

---

## Web Dashboard

Launch a live web UI to manage all your containers, projects, and configuration:

```bash
shiplet dashboard
# or the alias:
shiplet ui
```

Opens **http://localhost:6171** automatically.

### Dashboard sections

| Section        | What it shows                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**   | Running/stopped containers with live CPU%, memory bars, network I/O, and port mappings. System info panel.                       |
| **Projects**   | Auto-scanned Shiplet projects. Per-project: services, runtime badge, version, Up/Down/Restart/Build buttons.                     |
| **Containers** | All containers (including stopped) with searchable table, per-container start/stop/restart/remove actions.                       |
| **Images**     | All pulled images with repository, tag, size, and creation date.                                                                 |
| **Volumes**    | Named volumes with driver and mount path.                                                                                        |
| **Logs**       | Live WebSocket log streaming — select any container, toggle follow mode, clear.                                                  |
| **Release**    | Visual release wizard: bump selector, pre-release tag, checkboxes for skip-tests/publish, dry-run preview with commit breakdown. |
| **Settings**   | Docker ↔ Podman runtime switcher. Per-project `.env` editor. CLI quick-reference grid.                                           |

### Options

```bash
# Custom port
shiplet dashboard --port 8080

# Don't auto-open browser
shiplet dashboard --no-open

# Or set via env
SHIPLET_UI_PORT=9000 shiplet dashboard
```

### Live updates

The dashboard uses WebSockets for real-time data:
- Container stats (CPU, memory, network) refresh every **3 seconds**
- Log streaming is **live** — tail any running container with zero latency
- The green dot in the top bar shows the WebSocket connection status

---

## Examples

Two complete example projects are included in the `examples/` directory.

### `examples/express-docker`

A production-ready **Express.js** REST API using the **Docker** runtime.

**Services:** PostgreSQL 16, Redis 7, Mailpit, Adminer

```bash
cd examples/express-docker
shiplet up -d
shiplet npm install
shiplet exec app node src/db/migrate.js
# App → http://localhost:3000
# Adminer → http://localhost:8080
# Mailpit → http://localhost:8025
```

Features: request logging (morgan), security headers (helmet), Redis caching with 60s TTL, PostgreSQL connection pooling, full CRUD `/api/items`.

### `examples/fastify-podman`

A production-ready **Fastify** REST API (ESM) using the **Podman** runtime.

**Services:** MongoDB 7, Redis 7, MinIO (S3), Mailpit, Mongo Express

```bash
cd examples/fastify-podman
SHIPLET_RUNTIME=podman shiplet up -d
shiplet npm install
# App        → http://localhost:3000
# Swagger UI → http://localhost:3000/docs
# MinIO UI   → http://localhost:9001
# Mongo UI   → http://localhost:8081
```

Features: Swagger/OpenAPI docs, JWT authentication, Redis-cached paginated queries with tag/text search, S3-compatible file uploads via pre-signed URLs (MinIO), Mongoose models with indexes, graceful shutdown.

### Running either example with the other runtime

Both examples work with either runtime — just override:

```bash
# Run the Docker example with Podman
cd examples/express-docker
SHIPLET_RUNTIME=podman shiplet up -d

# Run the Podman example with Docker
cd examples/fastify-podman
SHIPLET_RUNTIME=docker shiplet up -d
```

---

## License

MIT © Anand Pilania

---
