'use strict';

const php = require('../../src/templates/php');

// ── generatePhpCompose ────────────────────────────────────────────────────────
describe('generatePhpCompose', () => {
    const base = {
        appName: 'my-laravel', template: 'laravel', phpVersion: '8.3',
        port: 80, services: [], timezone: 'UTC', runtime: 'docker', webServer: 'nginx',
    };

    test('includes project name', () => {
        expect(php.generatePhpCompose(base)).toContain('name: my-laravel');
    });

    test('includes PHP_VERSION build arg', () => {
        expect(php.generatePhpCompose(base)).toContain('"8.3"');
    });

    test('includes nginx service by default', () => {
        expect(php.generatePhpCompose(base)).toContain('nginx:');
    });

    test('includes apache service when requested', () => {
        const result = php.generatePhpCompose({ ...base, webServer: 'apache' });
        expect(result).toContain('apache:');
        expect(result).not.toContain('nginx:');
    });

    test('includes app (fpm) service', () => {
        expect(php.generatePhpCompose(base)).toContain('app:');
        const df = php.generatePhpDockerfile(base);
        expect(df).toContain('php-fpm');
    });

    test('includes mysql service when selected', () => {
        const result = php.generatePhpCompose({ ...base, services: ['mysql'] });
        expect(result).toContain('mysql:');
        expect(result).toContain('mysql_data:');
    });

    test('includes redis service when selected', () => {
        expect(php.generatePhpCompose({ ...base, services: ['redis'] })).toContain('redis:');
    });

    test('includes mailpit service when selected', () => {
        expect(php.generatePhpCompose({ ...base, services: ['mailpit'] })).toContain('mailpit:');
    });

    test('includes phpmyadmin when selected', () => {
        expect(php.generatePhpCompose({ ...base, services: ['phpmyadmin'] })).toContain('phpmyadmin:');
    });

    test('includes composer_cache volume', () => {
        expect(php.generatePhpCompose(base)).toContain('composer_cache:');
    });

    test('includes shiplet network', () => {
        expect(php.generatePhpCompose(base)).toContain('networks:\n  shiplet:');
    });

    test('symfony template compose compiles', () => {
        const result = php.generatePhpCompose({ ...base, template: 'symfony' });
        expect(result).toContain('APP_SECRET');
    });

    test('wordpress template compose compiles', () => {
        const result = php.generatePhpCompose({ ...base, template: 'wordpress' });
        expect(result).toContain('WORDPRESS_DB_HOST');
    });
});

// ── generatePhpDockerfile ─────────────────────────────────────────────────────
describe('generatePhpDockerfile', () => {
    test('uses correct PHP base image', () => {
        const df = php.generatePhpDockerfile({ template: 'laravel', phpVersion: '8.3', timezone: 'UTC' });
        expect(df).toContain('php:8.3-fpm-bookworm');
    });

    test('uses PHP 8.2 image for 8.2', () => {
        const df = php.generatePhpDockerfile({ template: 'laravel', phpVersion: '8.2', timezone: 'UTC' });
        expect(df).toContain('php:8.2-fpm-bookworm');
    });

    test('installs docker-php-ext extensions', () => {
        const df = php.generatePhpDockerfile({ template: 'laravel', phpVersion: '8.3', timezone: 'UTC' });
        expect(df).toContain('docker-php-ext-install');
        expect(df).toContain('pdo');
    });

    test('installs Composer from official image', () => {
        const df = php.generatePhpDockerfile({ template: 'laravel', phpVersion: '8.3', timezone: 'UTC' });
        expect(df).toContain('COPY --from=composer:2');
    });

    test('sets WORKDIR to /var/www/html', () => {
        const df = php.generatePhpDockerfile({ template: 'blank', phpVersion: '8.3', timezone: 'UTC' });
        expect(df).toContain('WORKDIR /var/www/html');
    });

    test('uses CMD php-fpm', () => {
        const df = php.generatePhpDockerfile({ template: 'blank', phpVersion: '8.3', timezone: 'UTC' });
        expect(df).toContain('CMD ["php-fpm"]');
    });

    test('laravel Dockerfile includes supervisor setup', () => {
        const df = php.generatePhpDockerfile({ template: 'laravel', phpVersion: '8.3', timezone: 'UTC' });
        expect(df).toContain('supervisord.conf');
    });

    test('wordpress Dockerfile includes WP-CLI', () => {
        const df = php.generatePhpDockerfile({ template: 'wordpress', phpVersion: '8.3', timezone: 'UTC' });
        expect(df).toContain('wp-cli');
    });
});

// ── generatePhpEnvAdditions ───────────────────────────────────────────────────
describe('generatePhpEnvAdditions', () => {
    const base = { template: 'laravel', port: 80, timezone: 'UTC', services: [], phpVersion: '8.3' };

    test('always includes APP_PORT', () => {
        expect(php.generatePhpEnvAdditions(base)).toContain('APP_PORT=80');
    });

    test('always includes PHP_VERSION', () => {
        expect(php.generatePhpEnvAdditions(base)).toContain('PHP_VERSION=8.3');
    });

    test('laravel includes APP_KEY placeholder', () => {
        expect(php.generatePhpEnvAdditions(base)).toContain('APP_KEY=');
    });

    test('laravel includes CACHE_DRIVER=redis', () => {
        expect(php.generatePhpEnvAdditions(base)).toContain('CACHE_DRIVER=redis');
    });

    test('laravel includes QUEUE_CONNECTION=redis', () => {
        expect(php.generatePhpEnvAdditions(base)).toContain('QUEUE_CONNECTION=redis');
    });

    test('symfony includes APP_SECRET', () => {
        const env = php.generatePhpEnvAdditions({ ...base, template: 'symfony' });
        expect(env).toContain('APP_SECRET=');
    });

    test('wordpress includes WP_DEBUG', () => {
        const env = php.generatePhpEnvAdditions({ ...base, template: 'wordpress' });
        expect(env).toContain('WP_DEBUG=true');
    });

    test('mysql service adds DB_ vars for laravel', () => {
        const env = php.generatePhpEnvAdditions({ ...base, services: ['mysql'] });
        expect(env).toContain('DB_HOST=mysql');
        expect(env).toContain('DB_DATABASE=app');
    });

    test('mysql service adds DATABASE_URL for symfony', () => {
        const env = php.generatePhpEnvAdditions({ ...base, template: 'symfony', services: ['mysql'] });
        expect(env).toContain('DATABASE_URL=mysql://');
    });

    test('postgres service adds DATABASE_URL for symfony', () => {
        const env = php.generatePhpEnvAdditions({ ...base, template: 'symfony', services: ['postgres'] });
        expect(env).toContain('DATABASE_URL=postgresql://');
    });

    test('redis service adds REDIS_HOST', () => {
        const env = php.generatePhpEnvAdditions({ ...base, services: ['redis'] });
        expect(env).toContain('REDIS_HOST=redis');
    });

    test('mailpit service adds mail config', () => {
        const env = php.generatePhpEnvAdditions({ ...base, services: ['mailpit'] });
        expect(env).toContain('MAIL_MAILER=smtp');
        expect(env).toContain('MAIL_HOST=mailpit');
        expect(env).toContain('MAIL_PORT=1025');
    });

    test('minio service adds S3 config', () => {
        const env = php.generatePhpEnvAdditions({ ...base, services: ['minio'] });
        expect(env).toContain('AWS_ACCESS_KEY_ID=shiplet');
        expect(env).toContain('AWS_ENDPOINT=http://minio:9000');
    });
});

// ── generateNginxConf ─────────────────────────────────────────────────────────
describe('generateNginxConf', () => {
    test('laravel sets root to /public', () => {
        expect(php.generateNginxConf('laravel')).toContain('/var/www/html/public');
    });

    test('symfony sets root to /public', () => {
        expect(php.generateNginxConf('symfony')).toContain('/var/www/html/public');
    });

    test('wordpress sets root to doc root', () => {
        expect(php.generateNginxConf('wordpress')).toContain('/var/www/html');
    });

    test('fastcgi_pass points to app:9000', () => {
        expect(php.generateNginxConf('laravel')).toContain('fastcgi_pass app:9000');
    });

    test('includes try_files with index.php fallback', () => {
        expect(php.generateNginxConf('laravel')).toContain('try_files $uri $uri/ /index.php?$query_string');
    });
});

// ── generatePhpIni ────────────────────────────────────────────────────────────
describe('generatePhpIni', () => {
    test('sets display_errors = On', () => {
        expect(php.generatePhpIni()).toContain('display_errors         = On');
    });

    test('sets memory_limit = 256M', () => {
        expect(php.generatePhpIni()).toContain('memory_limit          = 256M');
    });

    test('enables opcache', () => {
        expect(php.generatePhpIni()).toContain('opcache.enable        = 1');
    });

    test('sets upload limits', () => {
        const ini = php.generatePhpIni();
        expect(ini).toContain('upload_max_filesize   = 100M');
        expect(ini).toContain('post_max_size         = 100M');
    });
});

// ── generateSupervisorConf ────────────────────────────────────────────────────
describe('generateSupervisorConf', () => {
    test('includes php-fpm program', () => {
        expect(php.generateSupervisorConf()).toContain('[program:php-fpm]');
    });

    test('includes laravel-worker program', () => {
        expect(php.generateSupervisorConf()).toContain('[program:laravel-worker]');
    });

    test('includes scheduler program', () => {
        expect(php.generateSupervisorConf()).toContain('[program:laravel-scheduler]');
    });

    test('worker uses php artisan queue:work', () => {
        expect(php.generateSupervisorConf()).toContain('artisan queue:work');
    });

    test('scheduler uses php artisan schedule:work', () => {
        expect(php.generateSupervisorConf()).toContain('artisan schedule:work');
    });
});

// ── PHP_IMAGES ────────────────────────────────────────────────────────────────
describe('PHP_IMAGES map', () => {
    test('all supported versions have images', () => {
        ['8.3', '8.2', '8.1', '8.0'].forEach(v => {
            expect(php.PHP_IMAGES[v]).toMatch(/^php:/);
        });
    });
});

// ── phpServiceSnippet ─────────────────────────────────────────────────────────
describe('phpServiceSnippet', () => {
    const PHP_SERVICES = ['mysql', 'postgres', 'redis', 'mailpit', 'minio', 'elasticsearch', 'adminer', 'phpmyadmin'];

    test.each(PHP_SERVICES)('%s returns a valid snippet', (svc) => {
        const snippet = php.phpServiceSnippet(svc);
        expect(typeof snippet).toBe('string');
        expect(snippet).toContain('image:');
    });

    test('unknown service returns null', () => {
        expect(php.phpServiceSnippet('unknown')).toBeNull();
        expect(php.phpServiceSnippet(null)).toBeNull();
    });

    test('mysql snippet has healthcheck', () => {
        expect(php.phpServiceSnippet('mysql')).toContain('healthcheck:');
    });
});
