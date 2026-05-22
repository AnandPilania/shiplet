# shiplet-example-laravel-docker

> Shiplet example — **Laravel 11** running on **Docker** with MySQL, Redis, Mailpit, and MinIO.

## Stack

| Service     | Image           | Port      | Purpose                   |
| ----------- | --------------- | --------- | ------------------------- |
| **app**     | php:8.3-fpm     | —         | PHP-FPM application       |
| **nginx**   | nginx:alpine    | 80        | Web server                |
| **mysql**   | mysql:8.0       | 3306      | Database                  |
| **redis**   | redis:7-alpine  | 6379      | Cache · Queues · Sessions |
| **mailpit** | axllent/mailpit | 8025 (UI) | Email preview             |
| **minio**   | minio/minio     | 9000/9001 | S3-compatible storage     |

## Quick Start

```bash
# Requires Docker Desktop or Docker Engine + Compose plugin
shiplet up -d

# Scaffold a new Laravel project inside the container
shiplet composer create-project laravel/laravel . --prefer-dist

# Generate app key
shiplet artisan key:generate

# Run migrations
shiplet artisan migrate

# Open a shell
shiplet shell
```

## Web Interfaces

| URL                   | Service           |
| --------------------- | ----------------- |
| http://localhost      | Laravel app       |
| http://localhost:8025 | Mailpit (email)   |
| http://localhost:9001 | MinIO console     |
| http://localhost:6171 | Shiplet dashboard |

## Useful Commands

```bash
# PHP / Laravel
shiplet artisan migrate:fresh --seed
shiplet artisan tinker
shiplet artisan queue:work
shiplet artisan schedule:work
shiplet artisan route:list

# Composer
shiplet composer require spatie/laravel-permission
shiplet composer update

# Database
shiplet db                    # Opens mysql CLI

# Logs
shiplet logs -f app           # PHP-FPM logs
shiplet logs -f nginx         # Web server logs

# Files
shiplet cp app:/var/www/html/storage/logs/laravel.log ./laravel.log

# Environment
shiplet env list
shiplet env set APP_DEBUG true

# Snapshots
shiplet snapshot save before-migration
```

## Supervisor Processes

The Laravel container runs three processes via Supervisor:
- **php-fpm** — Handles HTTP requests via nginx
- **laravel-worker** (×2) — Processes queued jobs
- **laravel-scheduler** — Runs scheduled tasks every minute

## Switching to Podman

```bash
SHIPLET_RUNTIME=podman shiplet up -d
# or pin permanently:
shiplet runtime switch  # → select podman
```
