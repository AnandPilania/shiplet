<?php

/**
 * shiplet-example-symfony-podman
 *
 * Placeholder for a Symfony 7 project.
 * To scaffold a real Symfony app inside the container:
 *
 *   SHIPLET_ET_RUNTIME=podman shiplet up -d
 *   shiplet composer create-project symfony/skeleton . "7.*"
 *   shiplet composer require webapp
 *   shiplet php bin/console doctrine:database:create
 *   shiplet php bin/console doctrine:migrations:migrate
 *
 * Services:
 *   - PostgreSQL 16   (host: postgres, port: 5432)
 *   - Redis 7         (host: redis,    port: 6379)
 *   - Mailpit         (SMTP: mailpit:1025  UI: http://localhost:8025)
 *
 * Podman note: rootless by default, no daemon required.
 * Override runtime: SHIPLET_RUNTIME=docker shiplet up
 */

echo json_encode([
    'status'  => 'ok',
    'project' => 'shiplet-symfony-podman',
    'php'     => PHP_VERSION,
    'runtime' => 'podman',
    'message' => 'Ready — scaffold Symfony with: shiplet composer create-project symfony/skeleton . "7.*"',
], JSON_PRETTY_PRINT);
