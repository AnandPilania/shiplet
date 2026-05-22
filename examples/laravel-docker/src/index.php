<?php

/**
 * shiplet-example-laravel-docker
 *
 * This is a placeholder bootstrap for a new Laravel project.
 * To scaffold a real Laravel app inside this container:
 *
 *   shiplet up -d
 *   shiplet composer create-project laravel/laravel . --prefer-dist
 *   shiplet artisan key:generate
 *   shiplet artisan migrate
 *
 * Or if you have an existing Laravel project, just copy its files here.
 *
 * Services available in this stack:
 *   - MySQL 8        (host: mysql,   port: 3306)
 *   - Redis 7        (host: redis,   port: 6379)
 *   - Mailpit        (SMTP: mailpit:1025  UI: http://localhost:8025)
 *   - MinIO (S3)     (API: http://minio:9000  UI: http://localhost:9001)
 *
 * Useful commands:
 *   shiplet up -d                     Start everything
 *   shiplet shell                     Shell into app (PHP-FPM) container
 *   shiplet composer install          Install dependencies
 *   shiplet artisan migrate           Run migrations
 *   shiplet artisan queue:work        Start queue worker manually
 *   shiplet artisan tinker            Interactive REPL
 *   shiplet db                        Opens MySQL CLI
 *   shiplet logs -f                   Follow all container logs
 *   shiplet dashboard                 Web UI  →  http://localhost:6171
 */

echo json_encode([
    'status'  => 'ok',
    'project' => 'shiplet-laravel-docker',
    'php'     => PHP_VERSION,
    'message' => 'Ready — scaffold Laravel with: shiplet composer create-project laravel/laravel . --prefer-dist',
], JSON_PRETTY_PRINT);
