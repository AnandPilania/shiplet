# shiplet-example-symfony-podman

> Shiplet example — **Symfony 7** running on **Podman** with PostgreSQL, Redis, and Mailpit.

## Stack

| Service      | Image              | Port      | Purpose          |
| ------------ | ------------------ | --------- | ---------------- |
| **app**      | php:8.2-fpm        | —         | PHP-FPM          |
| **nginx**    | nginx:alpine       | 80        | Web server       |
| **postgres** | postgres:16-alpine | 5432      | Database         |
| **redis**    | redis:7-alpine     | 6379      | Cache · Sessions |
| **mailpit**  | axllent/mailpit    | 8025 (UI) | Email preview    |

## Quick Start

```bash
# Requires Podman ≥ 4.7
SHIPLET_RUNTIME=podman shiplet up -d

# Scaffold a new Symfony app
shiplet composer create-project symfony/skeleton . "7.*"
shiplet composer require webapp

# Create and migrate database
shiplet php bin/console doctrine:database:create
shiplet php bin/console doctrine:migrations:migrate

# Open shell
shiplet shell
```

## Useful Commands

```bash
# Symfony console shortcut
shiplet console make:entity Product
shiplet console make:controller ProductController
shiplet console doctrine:migrations:diff
shiplet console doctrine:migrations:migrate
shiplet console cache:clear
shiplet console debug:router

# Composer
shiplet composer require symfony/orm-pack
shiplet composer require --dev symfony/maker-bundle

# Database
shiplet db                    # Opens psql CLI

# Files
shiplet cp app:/var/www/html/var/log/dev.log ./symfony.log
```

## Switching to Docker

```bash
SHIPLET_RUNTIME=docker shiplet up -d
# or pin permanently:
shiplet runtime switch  # → select docker
```

## Web Interfaces

| URL                   | Service           |
| --------------------- | ----------------- |
| http://localhost      | Symfony app       |
| http://localhost:8025 | Mailpit           |
| http://localhost:6171 | Shiplet dashboard |
