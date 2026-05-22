# 🌊 Shiplet

> A Docker/Podman-powered development environment CLI for **Node.js** and **PHP/Composer** projects — inspired by Laravel Sail, built for both ecosystems with a built-in web dashboard, release pipeline, and more.

[![Tests](https://img.shields.io/badge/tests-215%20passing-brightgreen)](#testing)
[![Coverage](https://img.shields.io/badge/coverage-80%25-green)](#testing)
[![Node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

No Docker expertise required. One command scaffolds a fully-containerised project with databases, mail, object storage, web dashboard, and more — for both Node.js and PHP.

---

## Table of Contents

- [🌊 Shiplet](#-shiplet)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Quick Start](#quick-start)
  - [Installation](#installation)
    - [Zero-install via npx](#zero-install-via-npx)
    - [Global install](#global-install)
    - [Dev dependency](#dev-dependency)
    - [Shell alias (recommended)](#shell-alias-recommended)
  - [Initialising a Project](#initialising-a-project)
    - [Node.js templates](#nodejs-templates)
    - [PHP templates](#php-templates)
    - [Skip prompts](#skip-prompts)
    - [Generated files — Node.js](#generated-files--nodejs)
    - [Generated files — PHP](#generated-files--php)
  - [Container Runtimes](#container-runtimes)
    - [Podman notes](#podman-notes)
  - [Starting and Stopping](#starting-and-stopping)
  - [Running Commands](#running-commands)
    - [Node.js](#nodejs)
    - [PHP / Composer Support](#php--composer-support)
      - [Composer](#composer)
      - [PHP binary](#php-binary)
      - [Laravel Artisan](#laravel-artisan)
      - [Symfony Console](#symfony-console)
      - [WP-CLI](#wp-cli)
  - [Databases](#databases)
  - [Additional Services](#additional-services)
  - [Testing](#testing)
    - [Shiplet's own test suite](#shiplets-own-test-suite)
  - [Linting](#linting)
  - [Web Dashboard](#web-dashboard)
    - [Sections](#sections)
  - [Logs](#logs)
  - [Container Management](#container-management)
  - [Volume Snapshots](#volume-snapshots)
    - [Steps](#steps)
    - [Flags](#flags)
    - [Conventional commits → changelog](#conventional-commits--changelog)
  - [Environment Variables](#environment-variables)
  - [Health \& Diagnostics](#health--diagnostics)
    - [Doctor](#doctor)
    - [Prune](#prune)
  - [Sharing Your App](#sharing-your-app)
  - [Customisation](#customisation)
  - [Examples](#examples)
    - [`examples/express-docker`](#examplesexpress-docker)
    - [`examples/fastify-podman`](#examplesfastify-podman)
    - [`examples/laravel-docker`](#exampleslaravel-docker)
    - [`examples/symfony-podman`](#examplessymfony-podman)
  - [CLI Reference](#cli-reference)
  - [Configuration Reference](#configuration-reference)
    - [`shiplet.config.json`](#shipletconfigjson)
    - [Environment overrides](#environment-overrides)
  - [Requirements](#requirements)
  - [License](#license)
  - [Vite Projects](#vite-projects)
    - [Supported Vite templates](#supported-vite-templates)
    - [Critical vite.config setting](#critical-viteconfig-setting)
  - [Bun Projects](#bun-projects)
    - [Bun commands](#bun-commands)
    - [Supported Bun templates](#supported-bun-templates)
    - [Bun version](#bun-version)

---

## Features

|     | Feature               | Details                                                                        |
| --- | --------------------- | ------------------------------------------------------------------------------ |
| 🟢   | **Node.js + PHP**     | Express, Fastify, NestJS, Next.js, Nuxt, Laravel, Symfony, WordPress, and more |
| 🐳 🦭 | **Docker + Podman**   | Auto-detected at startup; switch instantly with `shiplet runtime switch`       |
| 🖥️   | **Web Dashboard**     | Live metrics, log streaming, env editor, prune UI at `http://localhost:6171`   |
| 🚀   | **Release Pipeline**  | Semver bump → changelog → git tag → container build → push → npm publish       |
| 🔬   | **Doctor**            | Full environment diagnostic before you hit a wall                              |
| 💾   | **Snapshots**         | Named volume backups and restores — share dev databases with your team         |
| 🧹   | **Prune**             | Clean up containers / images / volumes interactively                           |
| 📋   | **Shell Completions** | Tab completions for bash, zsh, fish                                            |
| 🧪   | **215 Tests**         | Full Jest suite — unit + integration, 80% coverage                             |

---

## Quick Start

```bash
# Node.js
cd my-node-app
npx shiplet init
shiplet up -d
shipletlet npm install
shipletletlet logs -f

# PHP / Laravel (auto-detected)
cd my-laravel-app
npx shiplet init
shipletletlet up -d
shiplet composer install
shiplet artisan migrate
shiplet dashboard           # → http://localhost:6171
```

---

## Installation

### Zero-install via npx

```bash
npx shiplet init
```

### Global install

```bash
npm install -g shiplet
```

### Dev dependency

```bash
npm install --save-dev shiplet
```

### Shell alias (recommended)

Add to `~/.zshrc` or `~/.bashrc`:

```bash
alias shiplet='npx shiplet'
```

---

## Initialising a Project

```bash
shiplet init
```

The interactive wizard detects your language, framework, package manager, and existing lock files automatically. Answer the prompts and Shiplet writes everything you need.

### Node.js templates

| Template  | Description                                |
| --------- | ------------------------------------------ |
| `express` | Express.js REST API                        |
| `fastify` | Fastify with plugins                       |
| `nestjs`  | NestJS with TypeScript                     |
| `nextjs`  | Next.js (App Router)                       |
| `nuxt`    | Nuxt 3                                     |
| `t3`      | T3 Stack (Next + tRPC + Prisma + Tailwind) |
| `blank`   | Bare Node.js                               |

**Package managers:** npm · yarn · pnpm — auto-detected from lock files.

### PHP templates

| Template    | Description                                            |
| ----------- | ------------------------------------------------------ |
| `laravel`   | Laravel 11 — Artisan, queues, scheduler via Supervisor |
| `symfony`   | Symfony 7 — console commands, Doctrine                 |
| `wordpress` | WordPress + WP-CLI                                     |
| `slim`      | Slim Framework 4                                       |
| `lumen`     | Lumen micro-framework                                  |
| `blank`     | Vanilla PHP                                            |

**PHP versions:** 8.3 · 8.2 · 8.1 · 8.0
**Web servers:** nginx (recommended) · apache

### Skip prompts

```bash
# Node.js defaults
shiplet init --yes
shiplet init --template nestjs --yes

# PHP with specific options
shiplet init --language php --template laravel --php-version 8.3 --yes
shipletlet init --language php --template symfony --runtime podman --yes
```

### Generated files — Node.js

```
shiplet.yml            ← Docker Compose file
shiplet.config.json    ← Shipletproject config
.shiplet/
  Dockerfile        ← App container
.env                ← Environment variables
```

### Generated files — PHP

```
shiplet.yml            ← Docker Compose (FPM + nginx/apache + services)
shiplet.config.json    ← Shipletproject config
.shiplet/
  Dockerfile                    ← PHP-FPM container (php-ext, Composer, WP-CLI)
  nginx/default.conf            ← Nginx vhost with correct document root
  php/php.ini                   ← Development-optimised PHP config
  supervisor/supervisord.conf   ← Queue workers + scheduler (Laravel only)
.env                ← Framework-aware env vars
```

---

## Container Runtimes

Shiplet supports both **Docker** and **Podman** — the runtime is resolved in this priority order:

1. `SHIPLET_RUNTIME` environment variable
2. `runtime` field in `shiplet.config.json`
3. Auto-detect: Podman wins if available and running, otherwise Docker

```bash
# Override for one command
SHIPLET_RUNTIME=podman shiplet up -d
SHIPLET_RUNTIME=docker shiplet build

# Permanently switch (writes shiplet.config.json)
shiplet runtime switch

# Check both runtimes
shiplet runtime show    # which is active and why
shipletlet runtime check   # binary + daemon + compose plugin status for both
```

### Podman notes

- Rootless by default — no daemon, no root required
- Requires `podman compose` (bundled in Podman ≥ 4.7) or `podman-compose`
- Install: `pip3 install podman-compose` or update Podman
- If you see volume permission errors: `podman system migrate`

---

## Starting and Stopping

```bash
shipletletlet up                  # Start, stream output
shipletletlet up -d               # Start in background (detached)
shipletlet up --build          # Rebuild images first

shiplet down                # Stop and remove containers (data volumes preserved)
shiplet down -v             # ⚠  Also remove volumes (deletes all data)

shiplet build               # Rebuild images
shiplet build --no-cache    # Full rebuild without layer cache

shiplet status              # Show running containers + ports  (alias: shiplet ps)
```

---

## Running Commands

### Node.js

```bash
shipletlet node --version
shipletlet node scripts/seed.js

shipletlet npm install
shipletlet npm run dev
shipletlet npm run build

shipletletlet yarn add lodash
shipletlet pnpm install

shipletlet npx prisma migrate dev
shipletlet npx ts-node src/server.ts

shipletlet exec app node -e "console.log('hello')"
shiplet exec redis redis-cli info

shiplet shell          # bash/sh into 'app' container
shiplet shell postgres
```

### PHP / Composer Support

#### Composer

```bash
shiplet composer install
shiplet composer require laravel/sanctum
shiplet composer update
shiplet composer dump-autoload
shiplet composer show --installed
```

#### PHP binary

```bash
shiplet php --version
shiplet php -r "echo phpversion();"
shiplet php scripts/seed.php
```

#### Laravel Artisan

```bash
shiplet artisan migrate
shiplet artisan migrate:fresh --seed
shiplet artisan key:generate
shiplet artisan make:model Product -mcr
shiplet artisan queue:work
shiplet artisan schedule:work
shiplet artisan tinker
shiplet artisan route:list
shiplet artisan config:cache
```

#### Symfony Console

```bash
shiplet console doctrine:migrations:migrate
shiplet console make:entity Product
shiplet console cache:clear
shiplet console debug:router
shiplet console assets:install
```

#### WP-CLI

```bash
shiplet wp --info
shiplet wp plugin install woocommerce --activate
shiplet wp theme list
shiplet wp post list
shiplet wp user create admin admin@example.com --role=administrator
```

---

## Databases

```bash
shiplet db               # Auto-detect running DB and open CLI
shiplet db postgres      # → psql
shiplet db mysql         # → mysql CLI
shiplet db mongo         # → mongosh
shiplet db redis         # → redis-cli
shiplet db mariadb       # → mysql CLI
```

---

## Additional Services

```bash
shiplet add                          # Interactive picker
shiplet add redis mailpit            # Add specific services
shiplet add elasticsearch adminer
```

| Service         | Image              | Purpose                              |
| --------------- | ------------------ | ------------------------------------ |
| `postgres`      | postgres:16-alpine | PostgreSQL 16                        |
| `mysql`         | mysql:8.0          | MySQL 8                              |
| `mongo`         | mongo:7            | MongoDB 7                            |
| `redis`         | redis:7-alpine     | Redis 7                              |
| `mailpit`       | axllent/mailpit    | Email preview (SMTP trap)            |
| `minio`         | minio/minio        | S3-compatible object storage         |
| `elasticsearch` | elasticsearch:8    | Full-text search                     |
| `adminer`       | adminer            | Database web GUI                     |
| `phpmyadmin`    | phpmyadmin         | MySQL/MariaDB web GUI (PHP projects) |

After adding services, rebuild:

```bash
shiplet up --build
```

---

## Testing

```bash
shiplet test                   # Auto-detects runner
shiplet test --coverage
shiplet test --watch
shiplet test src/user.test.ts
```

**Detection order:** vitest → jest → mocha → tap → npm test

### Shiplet's own test suite

```bash
npm test                    # All tests + coverage report
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:watch          # Watch mode
```

**215 tests, 6 files, ~80% coverage:**

```
tests/
├── unit/
│   ├── helpers.test.js           (22 tests)  Core utilities
│   ├── helpers-extended.test.js  (40 tests)  Runtime, output, cache
│   ├── templates-node.test.js    (35 tests)  Node.js templates
│   ├── templates-php.test.js     (52 tests)  PHP templates + all frameworks
│   └── release-semver.test.js    (30 tests)  Semver + conventional commits
└── integration/
    └── init-generation.test.js   (41 tests)  Full file generation E2E
```

---

## Linting

```bash
shiplet lint           # Run all detected linters
shiplet lint --fix     # Auto-fix where possible
```

**Auto-detected (in order):**

| Tool       | Detected by                                         |
| ---------- | --------------------------------------------------- |
| Biome      | `biome.json` or `devDependencies["@biomejs/biome"]` |
| OXLint     | `devDependencies["oxlint"]`                         |
| ESLint     | `.eslintrc*`, `eslint.config.*`                     |
| Prettier   | `.prettierrc*`, `prettier.config.*`                 |
| TypeScript | `tsconfig.json` → runs `tsc --noEmit`               |

---

## Web Dashboard

```bash
shiplet dashboard           # Launch at http://localhost:6171
shiplet ui                  # Alias

shiplet dashboard --port 8080     # Custom port
shiplet dashboard --no-open       # Don't auto-open browser
SHIPLET_UI_PORT=9000 shiplet dashboard
```

### Sections

| Section         | What you can do                                                      |
| --------------- | -------------------------------------------------------------------- |
| **Overview**    | Live CPU%, memory bars, net I/O per container; system info           |
| **Projects**    | All shiplet projects on your machine — Up / Down / Build per project |
| **Containers**  | Full list with search, start / stop / restart / remove per container |
| **Images**      | Image inventory, per-image delete, prune dangling                    |
| **Volumes**     | Volume list, per-volume delete, prune unused                         |
| **Networks**    | Network list, prune unused                                           |
| **Logs**        | Live WebSocket log streaming — select any container, follow toggle   |
| **Release**     | Visual release wizard with commit breakdown and copy-to-clipboard    |
| **Environment** | Per-project `.env` editor — add / edit / delete keys inline          |
| **Prune**       | One-click cleanup cards for every resource type                      |
| **Settings**    | Runtime switcher, CLI quick-reference (click to copy)                |

Stats update every **3 seconds** via WebSocket. Log streaming is instant.

---

## Logs

```bash
shiplet logs                  # All services, last 100 lines
shiplet logs -f               # Follow all logs
shiplet logs app              # One service
shiplet logs -f nginx         # Follow nginx
shiplet logs -n 200 app       # Last 200 lines
```

---

## Container Management

```bash
# Port mappings
shiplet port                  # All services
shiplet port nginx            # One service
shiplet port --check          # Warn about host-port conflicts

# Live process table (refreshes every 2 s)
shiplet top                   # Auto-pick container
shiplet top app               # Specific service
shiplet top --once            # Print once, exit

# Scale replicas
shiplet scale app=3
shiplet scale app=2 worker=4

# Copy files  (use service:path notation)
shiplet cp app:/var/www/html/storage/logs/app.log ./app.log
shiplet cp ./config/local.json app:/var/www/html/config/
shiplet cp postgres:/var/lib/postgresql/data/pg_hba.conf .

# Health dashboard
shiplet health                # One-shot
shiplet health --watch        # Refresh every 3 s
```

---

## Volume Snapshots

```bash
shiplet snapshot save before-migration      # Backup all volumes
shiplet snapshot list                       # List saved snapshots
shiplet snapshot restore before-migration  # Restore (interactive picker if omitted)
shiplet snapshot delete before-migration   # Delete a snapshot
```

Stored in `.shiplet/snapshots/` as compressed tarballs — one file per volume. Works with both Docker and Podman.

### Steps

1. Pre-flight checks (git repo, clean tree, on main/master, package.json)
2. Test suite (inside container)
3. Version bump (`package.json` + `package-lock.json`)
4. `CHANGELOG.md` — generated from conventional commits since last tag
5. `git commit` + annotated `git tag`
6. Container image build (tagged with version)
7. `git push --tags`
8. `npm publish` (opt-in with `--publish`)

### Flags

```bash
--dry-run          Simulate without mutations
--yes              Skip confirmation
--force            Ignore branch/clean-tree checks
--pre <tag>        Pre-release suffix (alpha, beta, rc)
--skip-tests       Skip test run
--skip-build       Skip container rebuild
--skip-push        Skip git push
--publish          Also npm publish
--access <level>   public | restricted
```

### Conventional commits → changelog

```
feat(api): add pagination       → 🚀 Features
fix(db): null result crash      → 🐛 Bug Fixes
perf(cache): use LRU            → ⚡ Performance
docs: update README             → 📝 Documentation
feat!: redesign public API      → 💥 Breaking Changes
chore: bump dependencies        → 🔨 Chores
ci: update pipeline             → 🤖 CI/CD
```

---

## Environment Variables

```bash
shiplet env list                      # All .env variables
shiplet env get DATABASE_URL          # One variable
shiplet env set NODE_ENV production   # Set variable
shiplet env set KEY=value             # Alternative syntax
shiplet env unset OLD_KEY             # Remove variable
shiplet env sync                      # Sync from .env.example → .env
```

---

## Health & Diagnostics

### Doctor

```bash
shiplet doctor
```

Checks: Node.js version · Docker/Podman install + daemon · compose plugin · `shiplet.yml` syntax · `package.json` validity · `.env` vs `.env.example` completeness · port conflicts · disk space · dangling images.

### Prune

```bash
shiplet prune                   # Interactive picker
shiplet prune containers        # Remove stopped containers
shiplet prune images            # Remove dangling images
shiplet prune volumes           # Remove unused volumes
shiplet prune networks          # Remove unused networks
shiplet prune all               # System prune — everything unused
shiplet prune images --force    # Skip confirmation
```

---

## Sharing Your App

```bash
shiplet share                         # Tunnel port 3000 via localtunnel
shiplet share --port 4000             # Custom port
shiplet share --subdomain my-demo     # Request subdomain
```

---

## Customisation

```bash
shiplet publish    # Eject .shiplet/Dockerfile → docker/Dockerfile
```

Update `shiplet.yml` to point at the ejected file:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
```

Shiplet is just a thin wrapper over Compose — any valid Docker Compose V2 configuration works in `shiplet.yml`.

---

## Examples

Four complete, runnable example projects ship in the `examples/` directory.

### `examples/express-docker`
Express.js REST API on **Docker** — PostgreSQL, Redis, Mailpit, Adminer.

```bash
cd examples/express-docker
shiplet up -d
shiplet npm install
shiplet exec app node src/db/migrate.js
# → http://localhost:3000
# → http://localhost:8025  (Mailpit)
# → http://localhost:8080  (Adminer)
```

### `examples/fastify-podman`
Fastify ESM API on **Podman** — MongoDB, Redis, MinIO, Mailpit.
Includes: Swagger UI, JWT auth, S3 file uploads, Mongoose models.

```bash
cd examples/fastify-podman
SHIPLET_RUNTIME=podman shiplet up -d
shiplet npm install
# → http://localhost:3000/docs  (Swagger)
# → http://localhost:9001       (MinIO console)
```

### `examples/laravel-docker`
Laravel 11 on **Docker** — MySQL, Redis, Mailpit, MinIO.
Includes: Supervisor workers + scheduler, queue processing.

```bash
cd examples/laravel-docker
shiplet up -d
shiplet composer create-project laravel/laravel . --prefer-dist
shiplet artisan key:generate
shiplet artisan migrate
# → http://localhost
# → http://localhost:8025  (Mailpit)
# → http://localhost:9001  (MinIO)
```

### `examples/symfony-podman`
Symfony 7 on **Podman** — PostgreSQL, Redis, Mailpit.

```bash
cd examples/symfony-podman
SHIPLET_RUNTIME=podman shiplet up -d
shiplet composer create-project symfony/skeleton . "7.*"
shiplet console doctrine:database:create
# → http://localhost
```

---

## CLI Reference

```
┌─ Lifecycle ──────────────────────────────────────────────────────────────────
│  shiplet init [options]           Interactive project setup
│    --language <l>              node | php
│    --template <t>              Framework template
│    --php-version <v>           8.3 | 8.2 | 8.1 | 8.0
│    --runtime <r>               docker | podman
│    --yes                       Skip all prompts
│
│  shiplet up [-d] [--build]        Start containers
│  shiplet down [-v]                Stop (−v removes volumes)
│  shiplet build [--no-cache]       Rebuild images
│  shiplet status | ps              List services + ports
│
├─ Execution ──────────────────────────────────────────────────────────────────
│  shiplet shell [svc]              Interactive shell (default: app)
│  shiplet exec <svc> [cmd...]      One-off command in container
│  shiplet cp <src> <dest>          Copy files (service:path syntax)
│
├─ Node.js ───────────────────────────────────────────────────────────────────
│  shiplet node / npm / npx / yarn / pnpm [args...]
│
├─ PHP ───────────────────────────────────────────────────────────────────────
│  shiplet composer [args...]       Composer commands
│  shiplet php [args...]            PHP binary
│  shiplet artisan [args...]        Laravel Artisan shortcut
│  shiplet console [args...]        Symfony console shortcut
│  shiplet wp [args...]             WP-CLI shortcut
│
├─ Quality ───────────────────────────────────────────────────────────────────
│  shiplet test [args...]           Run tests (auto-detected runner)
│  shiplet lint [--fix]             Run linters (auto-detected)
│
├─ Database ──────────────────────────────────────────────────────────────────
│  shiplet db [service]             Open DB CLI (auto-detected)
│
├─ Observability ─────────────────────────────────────────────────────────────
│  shiplet logs [-f] [-n N] [svc]  View / follow container logs
│  shiplet health [--watch]         Container health dashboard
│  shiplet top [svc] [--once]      Live process table
│  shiplet port [svc] [--check]    Port mappings + conflict check
│  shiplet status | ps              Running services
│
├─ Services ──────────────────────────────────────────────────────────────────
│  shiplet add [services...]        Add services to shiplet.yml
│  shiplet scale <svc=n>...         Scale replicas
│  shiplet share [--port] [--subdomain]  Public tunnel
│
├─ Data ──────────────────────────────────────────────────────────────────────
│  shiplet snapshot save|restore|list|delete [name]
│  shiplet env get|set|unset|list|sync [key] [value]
│
├─ Release ───────────────────────────────────────────────────────────────────
│  shiplet release [patch|minor|major|x.y.z] [options]
│    --dry-run  --yes  --force  --pre <tag>
│    --skip-tests  --skip-build  --skip-push
│    --publish  --access <public|restricted>
│
├─ Runtime ───────────────────────────────────────────────────────────────────
│  shiplet runtime show|switch|check
│
├─ Maintenance ───────────────────────────────────────────────────────────────
│  shiplet doctor                   Environment diagnostic
│  shiplet prune [target] [-f]      Remove unused resources
│  shiplet upgrade [--global]       Upgrade shiplet
│  shiplet publish                  Eject Dockerfiles
│
├─ UI ─────────────────────────────────────────────────────────────────────────
│  shiplet dashboard | ui [-p port] [--no-open]
│
└─ Shell ──────────────────────────────────────────────────────────────────────
   shiplet completions [bash|zsh|fish]
```

---

## Configuration Reference

### `shiplet.config.json`

```json
{
  "language":       "node",         // "node" or "php"
  "runtime":        "docker",       // "docker" or "podman"
  "appName":        "my-app",

  "template":       "express",      // Framework template
  "nodeVersion":    "20",           // Node.js version (node projects)
  "packageManager": "npm",          // npm | yarn | pnpm (node projects)

  "phpVersion":     "8.3",          // PHP version (php projects)
  "webServer":      "nginx",        // nginx | apache (php projects)

  "port":           3000            // Host port
}
```

### Environment overrides

| Variable          | Purpose                                     |
| ----------------- | ------------------------------------------- |
| `SHIPLET_RUNTIME` | Force `docker` or `podman` for all commands |
| `SHIPLET_UI_PORT` | Default port for `shiplet dashboard`        |

---

## Requirements

- **Node.js ≥ 16** on the host (the `shiplet` CLI itself — your app runs inside the container)
- One of:
  - **Docker Desktop** (macOS / Windows) or **Docker Engine + Compose plugin** (Linux)
    → [Get Docker](https://docs.docker.com/get-docker/)
  - **Podman ≥ 4.7** (rootless, no daemon needed)
    → [Get Podman](https://podman.io/getting-started/install)

---

## License

MIT © Shiplet Contributors

---

## Vite Projects

Shiplet auto-detects Vite projects from `package.json` dependencies and sets up HMR correctly inside Docker/Podman.

```bash
# In an existing Vite project
shiplet init           # detects react-swc-ts, vue-ts, svelte, astro, etc.

# Brand new Vite project
npx create-vite my-app --template react-swc-ts
cd my-app
shiplet init           # language: Vite auto-selected
shiplet up -d
shiplet pnpm install
# → http://localhost:5173 with full HMR
```

### Supported Vite templates

| Template                             | Framework            |
| ------------------------------------ | -------------------- |
| `react` / `react-ts`                 | React (Babel)        |
| `react-swc` / `react-swc-ts`         | React + SWC (faster) |
| `vue` / `vue-ts`                     | Vue 3                |
| `svelte` / `svelte-ts` / `sveltekit` | Svelte / SvelteKit   |
| `solid` / `solid-ts`                 | Solid.js             |
| `preact` / `preact-ts`               | Preact               |
| `qwik` / `qwik-ts`                   | Qwik                 |
| `lit` / `lit-ts`                     | Lit                  |
| `vanilla` / `vanilla-ts`             | Plain JS/TS          |
| `astro`                              | Astro (port 4321)    |
| `remix` / `remix-ts`                 | Remix                |

### Critical vite.config setting

Add this to `vite.config.ts` for HMR to work inside Docker:

```ts
server: {
  host: '0.0.0.0',      // listen on all container interfaces
  port: 5173,
  hmr: {
    host: 'localhost',  // browser connects to localhost
    port: 5173,
  },
  watch: {
    usePolling: true,   // required in Docker volumes on some OSes
    interval: 300,
  },
}
```

`shiplet init` prints this snippet automatically. The `examples/react-vite-ts/` example has it pre-configured.

---

## Bun Projects

Bun is detected from `bun.lockb` or `bun.lock` files. The container uses the official `oven/bun` image.

```bash
# In an existing Bun project
shiplet init           # auto-detects bun-hono, bun-elysia, bun-react, bun-api

# Brand new project
mkdir my-hono && cd my-hono
bun init
bun add hono
shiplet init           # language: Bun → template: bun-hono
shiplet up -d
shiplet bun install
# → http://localhost:3000
```

### Bun commands

```bash
shiplet bun install           # Install dependencies
shiplet bun add hono          # Add a package
shiplet bun remove lodash     # Remove a package
shiplet bun run dev           # Run dev server
shiplet bun run build         # Build
shiplet bun test              # Run tests via Bun's built-in runner
shiplet bun --version         # Check Bun version in container
```

### Supported Bun templates

| Template     | Description                   |
| ------------ | ----------------------------- |
| `bun-blank`  | Bare Bun script               |
| `bun-api`    | Bun HTTP server (`Bun.serve`) |
| `bun-hono`   | Hono framework                |
| `bun-elysia` | ElysiaJS                      |
| `bun-react`  | React with Bun bundler        |

### Bun version

The container uses `BUN_VERSION=latest` by default. Pin it in `shiplet.yml`:

```yaml
services:
  app:
    build:
      args:
        BUN_VERSION: "1.1.21"
```
