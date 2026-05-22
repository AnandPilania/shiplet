'use strict';

/**
 * Vite + Bun template engine for Shiplet.
 *
 * Vite templates (via create-vite):
 *   react, react-ts, react-swc, react-swc-ts
 *   vue, vue-ts
 *   svelte, svelte-ts, sveltekit
 *   solid, solid-ts
 *   qwik, qwik-ts
 *   preact, preact-ts
 *   lit, lit-ts
 *   vanilla, vanilla-ts
 *   remix, remix-ts
 *   astro
 *
 * Bun templates:
 *   bun-api      — Bun HTTP API server
 *   bun-react    — Bun + React (no Vite — bun bundler)
 *   bun-blank    — Bare Bun project
 *   bun-hono     — Hono framework on Bun
 *   bun-elysia   — ElysiaJS on Bun
 */

// ── Vite framework metadata ────────────────────────────────────────────────────
const VITE_TEMPLATES = {
    // React
    'react': { label: 'React', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'react-ts': { label: 'React + TypeScript', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'react-swc': { label: 'React + SWC', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'react-swc-ts': { label: 'React + SWC + TS', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    // Vue
    'vue': { label: 'Vue 3', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'vue-ts': { label: 'Vue 3 + TypeScript', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    // Svelte
    'svelte': { label: 'Svelte', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'svelte-ts': { label: 'Svelte + TypeScript', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'sveltekit': { label: 'SvelteKit', port: 5173, hmr: true, devCmd: 'vite dev', buildCmd: 'vite build', preview: 'vite preview' },
    // Solid
    'solid': { label: 'Solid', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'solid-ts': { label: 'Solid + TypeScript', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    // Others
    'preact': { label: 'Preact', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'preact-ts': { label: 'Preact + TypeScript', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'qwik': { label: 'Qwik', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'qwik-ts': { label: 'Qwik + TypeScript', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'lit': { label: 'Lit', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'lit-ts': { label: 'Lit + TypeScript', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'vanilla': { label: 'Vanilla JS', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'vanilla-ts': { label: 'Vanilla + TypeScript', port: 5173, hmr: true, devCmd: 'vite', buildCmd: 'vite build', preview: 'vite preview' },
    'remix': { label: 'Remix', port: 5173, hmr: true, devCmd: 'remix dev', buildCmd: 'remix build', preview: 'remix-serve build' },
    'remix-ts': { label: 'Remix + TypeScript', port: 5173, hmr: true, devCmd: 'remix dev', buildCmd: 'remix build', preview: 'remix-serve build' },
    'astro': { label: 'Astro', port: 4321, hmr: true, devCmd: 'astro dev', buildCmd: 'astro build', preview: 'astro preview' },
};

// ── Bun framework metadata ────────────────────────────────────────────────────
const BUN_TEMPLATES = {
    'bun-blank': { label: 'Bare Bun', port: 3000, devCmd: 'bun run dev', bunVersion: 'latest' },
    'bun-api': { label: 'Bun HTTP API', port: 3000, devCmd: 'bun run dev', bunVersion: 'latest' },
    'bun-react': { label: 'Bun + React', port: 3000, devCmd: 'bun run dev', bunVersion: 'latest' },
    'bun-hono': { label: 'Hono on Bun', port: 3000, devCmd: 'bun run dev', bunVersion: 'latest' },
    'bun-elysia': { label: 'ElysiaJS on Bun', port: 3000, devCmd: 'bun run dev', bunVersion: 'latest' },
};

// ── Detection helpers ─────────────────────────────────────────────────────────

/**
 * Detect if a project is Vite-based and which template.
 * Returns null if not a Vite project.
 */
function detectViteTemplate(pkg) {
    if (!pkg) return null;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Astro has its own bundler — detect before the vite-only check
    if (deps['astro']) return 'astro';

    if (!deps['vite'] && !deps['@vitejs/plugin-react'] && !deps['@vitejs/plugin-vue'] && !deps['@vitejs/plugin-react-swc']) {
        // Also check scripts for vite command
        const scripts = Object.values(pkg.scripts || {}).join(' ');
        if (!scripts.includes('vite')) return null;
    }

    // Determine specific template from deps
    if (deps['sveltekit'] || deps['@sveltejs/kit']) return 'sveltekit';
    if (deps['@sveltejs/vite-plugin-svelte'] && deps['svelte']) {
        return deps['typescript'] ? 'svelte-ts' : 'svelte';
    }
    if (deps['@vitejs/plugin-react-swc']) {
        return deps['typescript'] ? 'react-swc-ts' : 'react-swc';
    }
    if (deps['@vitejs/plugin-react']) {
        return deps['typescript'] ? 'react-ts' : 'react';
    }
    if (deps['@vitejs/plugin-vue']) {
        return deps['typescript'] ? 'vue-ts' : 'vue';
    }
    if (deps['vite-plugin-solid']) {
        return deps['typescript'] ? 'solid-ts' : 'solid';
    }
    if (deps['@preact/preset-vite'] || deps['preact']) {
        return deps['typescript'] ? 'preact-ts' : 'preact';
    }
    if (deps['qwik'] || deps['@builder.io/qwik']) {
        return deps['typescript'] ? 'qwik-ts' : 'qwik';
    }
    if (deps['lit']) {
        return deps['typescript'] ? 'lit-ts' : 'lit';
    }
    if (deps['@remix-run/vite']) {
        return deps['typescript'] ? 'remix-ts' : 'remix';
    }
    // Generic Vite
    return deps['typescript'] ? 'vanilla-ts' : 'vanilla';
}

/**
 * Detect if a project uses Bun.
 */
function detectBunTemplate(pkg, files) {
    if (!pkg || !files) return null;
    if (!files.includes('bun.lockb') && !files.includes('bun.lock')) return null;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['elysia']) return 'bun-elysia';
    if (deps['hono']) return 'bun-hono';
    if (deps['react'] || deps['react-dom']) return 'bun-react';
    return 'bun-api';
}

// ── compose.yml generation (Vite) ─────────────────────────────────────────────
function generateViteCompose(answers) {
    const {
        appName, template, nodeVersion = '20', packageManager = 'npm',
        port, services = [], timezone = 'UTC', runtime = 'docker',
    } = answers;

    const meta = VITE_TEMPLATES[template] || VITE_TEMPLATES['react-ts'];
    const devPort = port || meta.port;
    const name = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const serviceBlocks = services
        .map(s => serviceSnippet(s))
        .filter(Boolean)
        .join('\n\n');

    const depends = services.length
        ? `\n    depends_on:\n${services.map(s => `      - ${s}`).join('\n')}`
        : '';

    const hasVolumes = services.filter(s => VOLUME_SVCS.has(s));
    const volBlock = hasVolumes.map(s => `  ${s}_data:\n    driver: local`).join('\n');

    return `# Generated by Shiplet — Vite/${meta.label}
# Runtime: ${runtime}  Node: ${nodeVersion}
# Dev server auto-reloads on save via HMR
#
# Usage:
#   shiplet up -d                 Start containers
#   shiplet ${packageManager} install        Install dependencies
#   shiplet ${packageManager} run dev        Start Vite dev server
#   shiplet ${packageManager} run build      Production build

name: ${name}

services:
  app:
    build:
      context: .
      dockerfile: .shiplet/Dockerfile
      args:
        NODE_VERSION: "${nodeVersion}"
        PACKAGE_MANAGER: "${packageManager}"
        TZ: "${timezone}"
    image: ${name}/app
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "\${APP_PORT:-${devPort}}:${devPort}"
    volumes:
      - ".:/var/www/html"
      - "shiplet_node_modules:/var/www/html/node_modules"
    networks:
      - shiplet
    environment:
      TZ: "\${TZ:-${timezone}}"
      NODE_ENV: "\${NODE_ENV:-development}"
      # Vite HMR — must know the host so the browser can connect
      VITE_HMR_HOST: "localhost"
      VITE_HMR_PORT: "${devPort}"${depends}
    restart: unless-stopped
    tty: true
    stdin_open: true
    # Override with your actual dev command:
    command: ${packageManager === 'npm' ? 'npm run dev' : packageManager === 'yarn' ? 'yarn dev' : `${packageManager} run dev`}

${serviceBlocks}
volumes:
  shiplet_node_modules:
    driver: local
${volBlock}

networks:
  shiplet:
    driver: bridge
`;
}

// ── compose.yml generation (Bun) ──────────────────────────────────────────────
function generateBunCompose(answers) {
    const {
        appName, template, port = 3000,
        services = [], timezone = 'UTC', runtime = 'docker',
    } = answers;

    const meta = BUN_TEMPLATES[template] || BUN_TEMPLATES['bun-blank'];
    const name = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const serviceBlocks = services.map(s => serviceSnippet(s)).filter(Boolean).join('\n\n');
    const depends = services.length
        ? `\n    depends_on:\n${services.map(s => `      - ${s}`).join('\n')}` : '';
    const hasVolumes = services.filter(s => VOLUME_SVCS.has(s));
    const volBlock = hasVolumes.map(s => `  ${s}_data:\n    driver: local`).join('\n');

    return `# Generated by Shiplet — Bun/${meta.label}
# Runtime: ${runtime}
#
# Usage:
#   shiplet up -d              Start containers
#   shiplet bun install        Install dependencies
#   shiplet bun run dev        Start dev server

name: ${name}

services:
  app:
    build:
      context: .
      dockerfile: .shiplet/Dockerfile
      args:
        BUN_VERSION: "\${BUN_VERSION:-latest}"
        TZ: "${timezone}"
    image: ${name}/app
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "\${APP_PORT:-${port}}:${port}"
    volumes:
      - ".:/var/www/html"
      - "shiplet_bun_cache:/root/.bun/install/cache"
    networks:
      - shiplet
    environment:
      TZ: "\${TZ:-${timezone}}"
      NODE_ENV: "\${NODE_ENV:-development}"${depends}
    restart: unless-stopped
    tty: true
    stdin_open: true
    command: bun run dev

${serviceBlocks}
volumes:
  shiplet_bun_cache:
    driver: local
${volBlock}

networks:
  shiplet:
    driver: bridge
`;
}

// ── Dockerfile generation (Vite) ──────────────────────────────────────────────
function generateViteDockerfile(answers) {
    const { nodeVersion = '20', packageManager = 'npm', timezone = 'UTC', template = 'react-ts' } = answers;

    const pmSetup = {
        npm: '# npm is built-in',
        yarn: 'RUN corepack enable && corepack prepare yarn@stable --activate',
        pnpm: 'RUN corepack enable && corepack prepare pnpm@latest --activate',
        bun: '# bun is the runtime — no setup needed here',
    }[packageManager] || '# npm is built-in';

    const meta = VITE_TEMPLATES[template] || VITE_TEMPLATES['react-ts'];
    const devPort = meta?.port || 5173;

    return `# Auto-generated by Shiplet
# Template: Vite / ${meta?.label || template}
ARG NODE_VERSION=${nodeVersion}
FROM node:\${NODE_VERSION}-bookworm-slim

ARG PACKAGE_MANAGER=npm
ARG TZ=UTC
ENV TZ=\${TZ}
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y \\
 && apt-get install -y --no-install-recommends \\
      curl git ca-certificates tzdata \\
 && ln -snf /usr/share/zoneinfo/\$TZ /etc/localtime \\
 && echo "\$TZ" > /etc/timezone \\
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Package manager
${pmSetup}

WORKDIR /var/www/html

# Vite HMR needs this port exposed
EXPOSE ${devPort}

# Default: run dev server
# Override in shiplet.yml command: or use shiplet npm run build
CMD ["npx", "vite", "--host", "0.0.0.0"]
`;
}

// ── Dockerfile generation (Bun) ───────────────────────────────────────────────
function generateBunDockerfile(answers) {
    const { timezone = 'UTC', template = 'bun-blank' } = answers;
    const meta = BUN_TEMPLATES[template] || BUN_TEMPLATES['bun-blank'];

    return `# Auto-generated by Shiplet
# Runtime: Bun — ${meta.label}
ARG BUN_VERSION=latest
FROM oven/bun:\${BUN_VERSION}-debian

ARG TZ=UTC
ENV TZ=\${TZ}
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y \\
 && apt-get install -y --no-install-recommends \\
      curl git ca-certificates tzdata \\
 && ln -snf /usr/share/zoneinfo/\$TZ /etc/localtime \\
 && echo "\$TZ" > /etc/timezone \\
 && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

# Run bun dev server by default
CMD ["bun", "run", "dev"]
`;
}

// ── vite.config patch ─────────────────────────────────────────────────────────
/**
 * Returns a minimal vite.config snippet the user should add to ensure
 * the dev server listens on 0.0.0.0 (required inside Docker/Podman).
 * We don't overwrite user files — just print guidance.
 */
function viteConfigHint(template) {
    const isAstro = template === 'astro';
    const isRemix = template?.startsWith('remix');
    const isSvelte = template === 'sveltekit';

    if (isAstro) {
        return `# Add to astro.config.mjs:
server: {
  host: '0.0.0.0',
  port: 4321,
}`;
    }
    if (isRemix) {
        return `# Add to vite.config.ts:
server: {
  host: '0.0.0.0',
  port: 5173,
  hmr: { host: 'localhost', port: 5173 },
}`;
    }
    if (isSvelte) {
        return `# In vite.config.ts or svelte.config.js, add:
kit: {
  vite: {
    server: { host: '0.0.0.0', port: 5173 }
  }
}`;
    }
    return `# Add to vite.config.ts (or vite.config.js):
server: {
  host: '0.0.0.0',
  port: 5173,
  hmr: {
    host: 'localhost',   // browser connects here
    port: 5173,
  },
  watch: {
    usePolling: true,    // needed inside Docker volumes on some OSes
  },
}`;
}

// ── .env additions ────────────────────────────────────────────────────────────
function generateViteEnv(answers) {
    const meta = VITE_TEMPLATES[answers.template] || VITE_TEMPLATES['react-ts'];
    const port = answers.port || meta.port;
    const lines = [
        `# Shiplet — Vite/${meta.label}`,
        `APP_PORT=${port}`,
        `NODE_ENV=development`,
        `TZ=${answers.timezone || 'UTC'}`,
        '',
        '# Vite exposes env vars prefixed with VITE_ to the browser',
        `VITE_API_URL=http://localhost:${port}`,
        `VITE_APP_NAME=${answers.appName}`,
    ];
    appendServiceEnv(lines, answers.services || []);
    return lines.join('\n');
}

function generateBunEnv(answers) {
    const port = answers.port || 3000;
    const lines = [
        `# Shiplet — Bun/${answers.template}`,
        `APP_PORT=${port}`,
        `NODE_ENV=development`,
        `TZ=${answers.timezone || 'UTC'}`,
    ];
    appendServiceEnv(lines, answers.services || []);
    return lines.join('\n');
}

function appendServiceEnv(lines, services) {
    if (services.includes('postgres')) {
        lines.push('', '# PostgreSQL', 'POSTGRES_USER=shiplet', 'POSTGRES_PASSWORD=secret', 'POSTGRES_DB=app', 'DATABASE_URL=postgresql://shiplet:secret@postgres:5432/app');
    }
    if (services.includes('mysql')) {
        lines.push('', '# MySQL', 'MYSQL_ROOT_PASSWORD=secret', 'MYSQL_DATABASE=app', 'MYSQL_USER=shiplet', 'MYSQL_PASSWORD=secret', 'DATABASE_URL=mysql://shiplet:secret@mysql:3306/app');
    }
    if (services.includes('mongo')) {
        lines.push('', '# MongoDB', 'MONGO_INITDB_ROOT_USERNAME=shiplet', 'MONGO_INITDB_ROOT_PASSWORD=secret', 'MONGODB_URI=mongodb://shiplet:secret@mongo:27017/app?authSource=admin');
    }
    if (services.includes('redis')) {
        lines.push('', '# Redis', 'REDIS_URL=redis://redis:6379');
    }
    if (services.includes('mailpit')) {
        lines.push('', '# Mailpit', 'SMTP_HOST=mailpit', 'SMTP_PORT=1025');
    }
    if (services.includes('minio')) {
        lines.push('', '# MinIO', 'MINIO_ROOT_USER=shiplet', 'MINIO_ROOT_PASSWORD=secretsecret', 'S3_ENDPOINT=http://minio:9000', 'S3_BUCKET=local');
    }
}

// ── Service snippets (shared with main templates) ─────────────────────────────
const VOLUME_SVCS = new Set(['postgres', 'mysql', 'mongo', 'minio', 'elasticsearch']);

function serviceSnippet(name) {
    const snippets = {
        postgres: `  postgres:\n    image: "postgres:16-alpine"\n    environment:\n      POSTGRES_USER: "\${POSTGRES_USER:-shiplet}"\n      POSTGRES_PASSWORD: "\${POSTGRES_PASSWORD:-secret}"\n      POSTGRES_DB: "\${POSTGRES_DB:-app}"\n    ports:\n      - "\${POSTGRES_PORT:-5432}:5432"\n    volumes:\n      - "postgres_data:/var/lib/postgresql/data"\n    networks:\n      - shiplet\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U shiplet"]\n      interval: 5s\n      retries: 10`,
        mysql: `  mysql:\n    image: "mysql:8.0"\n    environment:\n      MYSQL_ROOT_PASSWORD: "\${MYSQL_ROOT_PASSWORD:-secret}"\n      MYSQL_DATABASE: "\${MYSQL_DATABASE:-app}"\n      MYSQL_USER: "\${MYSQL_USER:-shiplet}"\n      MYSQL_PASSWORD: "\${MYSQL_PASSWORD:-secret}"\n    ports:\n      - "\${MYSQL_PORT:-3306}:3306"\n    volumes:\n      - "mysql_data:/var/lib/mysql"\n    networks:\n      - shiplet\n    healthcheck:\n      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]\n      interval: 5s\n      retries: 10`,
        mongo: `  mongo:\n    image: "mongo:7"\n    ports:\n      - "\${MONGO_PORT:-27017}:27017"\n    volumes:\n      - "mongo_data:/data/db"\n    networks:\n      - shiplet`,
        redis: `  redis:\n    image: "redis:7-alpine"\n    ports:\n      - "\${REDIS_PORT:-6379}:6379"\n    networks:\n      - shiplet\n    healthcheck:\n      test: ["CMD", "redis-cli", "ping"]\n      interval: 5s\n      retries: 10`,
        mailpit: `  mailpit:\n    image: "axllent/mailpit"\n    ports:\n      - "\${MAILPIT_SMTP_PORT:-1025}:1025"\n      - "\${MAILPIT_UI_PORT:-8025}:8025"\n    networks:\n      - shiplet`,
        minio: `  minio:\n    image: "minio/minio"\n    command: server /data --console-address ":9001"\n    environment:\n      MINIO_ROOT_USER: "\${MINIO_ROOT_USER:-shiplet}"\n      MINIO_ROOT_PASSWORD: "\${MINIO_ROOT_PASSWORD:-secretsecret}"\n    ports:\n      - "\${MINIO_PORT:-9000}:9000"\n      - "\${MINIO_CONSOLE_PORT:-9001}:9001"\n    volumes:\n      - "minio_data:/data"\n    networks:\n      - shiplet`,
        elasticsearch: `  elasticsearch:\n    image: "elasticsearch:8.12.2"\n    environment:\n      discovery.type: single-node\n      xpack.security.enabled: "false"\n      ES_JAVA_OPTS: "-Xms512m -Xmx512m"\n    ports:\n      - "\${ES_PORT:-9200}:9200"\n    networks:\n      - shiplet`,
        adminer: `  adminer:\n    image: "adminer"\n    ports:\n      - "\${ADMINER_PORT:-8080}:8080"\n    networks:\n      - shiplet`,
    };
    return snippets[name] || null;
}

module.exports = {
    VITE_TEMPLATES,
    BUN_TEMPLATES,
    detectViteTemplate,
    detectBunTemplate,
    generateViteCompose,
    generateBunCompose,
    generateViteDockerfile,
    generateBunDockerfile,
    generateViteEnv,
    generateBunEnv,
    viteConfigHint,
};
